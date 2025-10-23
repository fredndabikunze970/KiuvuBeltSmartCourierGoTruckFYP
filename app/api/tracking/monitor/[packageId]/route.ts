import { handlePackageArrival, runArrivalUpdate } from "@/lib/arrival-automation"
import { sql } from "@/lib/database"
import { sendSMS } from "@/lib/sms"
import { formatPhoneNumber } from "@/lib/utils"
import { NextRequest, NextResponse } from "next/server"

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
    const pkgRows = await sql`
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

    // Block tracking updates if package is already delivered/arrived
    if (pkg.status === 'delivered' || pkg.status === 'arrived') {
      return NextResponse.json({ success: false, error: 'Package already delivered/arrived. Tracking updates are not allowed.' }, { status: 400 })
    }

    // 2) Branch coordinates
    const branchRows = await sql`
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
    const tRows = await sql`
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
  let progress = totalKm > 0 ? Math.min(100, Math.round((traveledKm / totalKm) * 100)) : 0
  // Clamp progress and ensure integer 0..100
  if (progress > 100) progress = 100
  if (progress < 0) progress = 0

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

    // 7) Alerts: off-route alerts remain (best-effort). Additionally,
    // send arrival notifications only when progress reaches 100%.
    if (offRoute) {
      const msg = `ALERT: Package ${packageId} vehicle is off route. Deviation: ${deviationKm.toFixed(2)}km`
      try {
        if (pkg.sender_phone) {
          const formattedSenderPhone = formatPhoneNumber(pkg.sender_phone)
          await sendSMS({ to: formattedSenderPhone, message: msg })
        }
      } catch (err) {
        console.error('Failed to send off-route SMS to sender:', err)
      }
      try {
        if (pkg.receiver_phone) {
          const formattedReceiverPhone = formatPhoneNumber(pkg.receiver_phone)
          await sendSMS({ to: formattedReceiverPhone, message: msg })
        }
      } catch (err) {
        console.error('Failed to send off-route SMS to receiver:', err)
      }
    }

    // 8) Arrival handling: when progress is 100% use centralized arrival automation
    if (progress === 100) {
      try {
        // First run the atomic DB update to ensure packages/tracking are updated
        const res = await runArrivalUpdate(packageId)
        const row = res && res[0] ? res[0] as any : { pkg_updated: 0, tracking_updated: 0, new_tracking_id: null }
        console.debug('runArrivalUpdate result for', packageId, row)

        const pkgUpdated = Number(row.pkg_updated || 0)
        const trackingUpdated = Number(row.tracking_updated || 0)
        const newTrackingId = row.new_tracking_id || null

        if (pkgUpdated > 0 || trackingUpdated > 0 || newTrackingId) {
          // DB updates succeeded — now trigger arrival notifications via centralized handler.
          // Call without passing stale pkg so the handler fetches fresh package state.
          await handlePackageArrival(packageId)
        } else {
          // No DB changes — warn and do not send SMS to avoid sending inconsistent notifications.
          console.warn(`Arrival automation made no DB changes for ${packageId}; skipping notifications to avoid inconsistency.`)
        }
      } catch (err) {
        console.error('Arrival handling failed:', err)
      }
    }

    // Re-fetch latest tracking row so we return the normalized arrival values when applicable
    const refreshedRows = await sql`
      SELECT latitude, longitude, location_name, status, progress_percentage, created_at
      FROM tracking
      WHERE package_id = ${packageId}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const refreshedLatest = refreshedRows?.[0] || latest

    return NextResponse.json({
      success: true,
      package: pkg,
      branches: branch,
      latestTracking: refreshedLatest,
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
