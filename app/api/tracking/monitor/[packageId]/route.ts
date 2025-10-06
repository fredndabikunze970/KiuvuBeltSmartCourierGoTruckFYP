import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { sendSMS } from "@/lib/sms"

function toRad(v: number) { return (v * Math.PI) / 180 }
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function distancePointToSegment(lat: number, lon: number, lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Approximate projection in degrees -> rough km via haversine sampling
  const A = { x: lon1, y: lat1 }
  const B = { x: lon2, y: lat2 }
  const P = { x: lon, y: lat }

  const AB = { x: B.x - A.x, y: B.y - A.y }
  const AP = { x: P.x - A.x, y: P.y - A.y }
  const ab2 = AB.x * AB.x + AB.y * AB.y
  const dot = AP.x * AB.x + AP.y * AB.y
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, dot / ab2))
  const proj = { x: A.x + t * AB.x, y: A.y + t * AB.y }
  return haversine(lat, lon, proj.y, proj.x)
}

function minDistanceToPolyline(lat: number, lon: number, coords: [number, number][]): number {
  let min = Infinity
  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i]
    const [lon2, lat2] = coords[i + 1]
    const d = distancePointToSegment(lat, lon, lat1, lon1, lat2, lon2)
    if (d < min) min = d
  }
  return min
}

export async function GET(req: NextRequest, { params }: { params: { packageId: string } }) {
  try {
    const packageId = params.packageId
    if (!packageId) {
      return NextResponse.json({ success: false, error: "packageId is required" }, { status: 400 })
    }

    // 1) Package + Payment check
    const pkgRows = await sql<{
      package_id: string
      status: string
      delivery_time: string | null
      assigned_car: string | null
      assigned_driver: string | null
      origin_branch_id: string
      destination_branch_id: string
      sender_phone: string
      receiver_phone: string
      payment_status: string | null
    }[]>`
      SELECT 
        p.package_id,
        p.status,
        p.delivery_time,
        p.assigned_car,
        p.assigned_driver,
        p.origin_branch_id,
        p.destination_branch_id,
        p.sender_phone,
        p.receiver_phone,
        pay.payment_status
      FROM packages p
      LEFT JOIN payments pay ON p.package_id = pay.package_id
      WHERE p.package_id = ${packageId}
    `

    if (!pkgRows?.length) {
      return NextResponse.json({ success: false, error: "Package not found" }, { status: 404 })
    }
    const pkg = pkgRows[0]
    if (pkg.payment_status !== 'confirmed') {
      return NextResponse.json({ success: false, error: "Payment not confirmed" }, { status: 400 })
    }

    // 2) Branch coordinates
    const branchRows = await sql<{
      origin_name: string
      origin_lat: number
      origin_lng: number
      destination_name: string
      dest_lat: number
      dest_lng: number
    }[]>`
      SELECT 
        origin.branch_name as origin_name,
        origin.latitude as origin_lat,
        origin.longitude as origin_lng,
        dest.branch_name as destination_name,
        dest.latitude as dest_lat,
        dest.longitude as dest_lng
      FROM packages p
      JOIN branches origin ON p.origin_branch_id = origin.branch_id
      JOIN branches dest ON p.destination_branch_id = dest.branch_id
      WHERE p.package_id = ${packageId}
    `
    const branch = branchRows?.[0]
    if (!branch) {
      return NextResponse.json({ success: false, error: "Branch coordinates not found" }, { status: 404 })
    }

    // 3) Latest tracking with GPS
    const tRows = await sql<{
      latitude: number | null
      longitude: number | null
      location_name: string | null
      status: string
      progress_percentage: number
      created_at: string
    }[]>`
      SELECT 
        latitude, longitude, location_name, status, progress_percentage, created_at
      FROM tracking
      WHERE package_id = ${packageId}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const latest = tRows?.[0] || null

    // If we do not have GPS coords yet, return minimal payload
    if (!latest?.latitude || !latest?.longitude) {
      return NextResponse.json({
        success: true,
        message: "No GPS coordinates yet",
        package: pkg,
        branches: branch,
        latestTracking: latest,
      })
    }

    const key = process.env.LOCATIONIQ_API_KEY
    if (!key) {
      return NextResponse.json({ success: false, error: "Missing LOCATIONIQ_API_KEY" }, { status: 500 })
    }

    const url = `https://us1.locationiq.com/v1/directions/driving/${branch.origin_lng},${branch.origin_lat};${branch.dest_lng},${branch.dest_lat}?key=${key}&steps=true&overview=full`
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ success: false, error: `LocationIQ error: ${res.status} ${text}` }, { status: res.status })
    }
    const route = await res.json()

    const poly: [number, number][] = route?.routes?.[0]?.geometry?.coordinates || []

    // 4) Deviation detection (km)
    const deviationKm = poly.length > 1
      ? minDistanceToPolyline(latest.latitude, latest.longitude, poly)
      : haversine(latest.latitude, latest.longitude, branch.dest_lat, branch.dest_lng)

    const offRoute = deviationKm > 0.5 // > 500m

    // 5) Progress calculation (approx straight-line)
    const totalKm = haversine(branch.origin_lat, branch.origin_lng, branch.dest_lat, branch.dest_lng)
    const traveledKm = haversine(branch.origin_lat, branch.origin_lng, latest.latitude, latest.longitude)
    const progress = totalKm > 0 ? Math.min(100, Math.round((traveledKm / totalKm) * 100)) : 0

    // 6) Update tracking progress entry
    try {
      await sql`
        INSERT INTO tracking (
          package_id, status, location_name, progress_percentage, notes, updated_by, latitude, longitude
        ) VALUES (
          ${packageId},
          ${pkg.status === 'registered' ? 'in_transit' : pkg.status},
          ${latest.location_name || 'GPS update'},
          ${progress},
          ${offRoute ? 'Off-route detected' : 'On-route update'},
          'system',
          ${latest.latitude},
          ${latest.longitude}
        )
      `
    } catch (e) {
      console.error("Failed to insert progress tracking entry:", e)
    }

    // 7) SMS alerts for off-route (best-effort)
    if (offRoute) {
      const msg = `ALERT: Package ${packageId} vehicle is off route. Deviation: ${deviationKm.toFixed(2)}km`
      try { pkg.sender_phone && await sendSMS({ to: pkg.sender_phone, message: msg }) } catch {}
      try { pkg.receiver_phone && await sendSMS({ to: pkg.receiver_phone, message: msg }) } catch {}
    }

    return NextResponse.json({
      success: true,
      package: pkg,
      branches: branch,
      latestTracking: latest,
      route,
      deviationKm,
      offRoute,
      totalKm,
      traveledKm,
      progress,
    })
  } catch (error) {
    console.error("/api/tracking/monitor error:", error)
    return NextResponse.json({ success: false, error: "Monitor failed" }, { status: 500 })
  }
}
