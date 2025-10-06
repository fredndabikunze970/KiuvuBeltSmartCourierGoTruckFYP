import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"

// Convert a JS Date to Africa/Kigali time using PostgreSQL for consistent TZ handling
async function getNowInKigaliISO(): Promise<string> {
  const rows = await sql<{ now: string }[]>`SELECT (now() AT TIME ZONE 'Africa/Kigali')::timestamp AS now`
  return rows?.[0]?.now ?? new Date().toISOString()
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const packageId = searchParams.get("packageId")
    if (!packageId) {
      return NextResponse.json({ success: false, error: "packageId is required" }, { status: 400 })
    }

    // 1) Package + Payment validation (payment confirmed)
    const pkgRows = await sql<{
      package_id: string
      status: string
      delivery_time: string | null
      assigned_car: string | null
      assigned_driver: string | null
      origin_branch_id: string
      destination_branch_id: string
      payment_status: string | null
      sender_phone: string
      receiver_phone: string
    }[]>`
      SELECT 
        p.package_id,
        p.status,
        p.delivery_time,
        p.assigned_car,
        p.assigned_driver,
        p.origin_branch_id,
        p.destination_branch_id,
        pay.payment_status,
        p.sender_phone,
        p.receiver_phone
      FROM packages p
      LEFT JOIN payments pay ON p.package_id = pay.package_id
      WHERE p.package_id = ${packageId}
    `

    if (!pkgRows?.length) {
      return NextResponse.json({ success: false, error: "Package not found" }, { status: 404 })
    }

    const pkg = pkgRows[0]

    // Payment check: must be confirmed
    if (pkg.payment_status !== 'confirmed') {
      return NextResponse.json({ success: false, error: "Payment not confirmed" }, { status: 400 })
    }

    // 2) Validate delivery_time against Africa/Kigali (UTC+2)
    const nowKigali = await getNowInKigaliISO()
    const now = new Date(nowKigali)
    let deliveryOk: boolean | null = null
    if (pkg.delivery_time) {
      // Treat stored time as local Kigali time for safety: let db do the cast
      const rows = await sql<{ diff_minutes: number }[]>`
        SELECT EXTRACT(EPOCH FROM (((${pkg.delivery_time}::timestamp AT TIME ZONE 'Africa/Kigali') - (now() AT TIME ZONE 'Africa/Kigali')))) / 60 AS diff_minutes
      `
      const diffMin = rows?.[0]?.diff_minutes ?? 0
      deliveryOk = diffMin <= 0 // current time is past delivery_time
    }

    // 3) Branch coordinates
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

    // 4) Latest tracking point
    const trackingRows = await sql<{
      latitude: number | null
      longitude: number | null
      location_name: string | null
      status: string
      progress_percentage: number
      created_at: string
    }[]>`
      SELECT 
        t.latitude,
        t.longitude,
        t.location_name,
        t.status,
        t.progress_percentage,
        t.created_at
      FROM tracking t
      WHERE t.package_id = ${packageId}
      ORDER BY t.created_at DESC
      LIMIT 1
    `

    const latestTracking = trackingRows?.[0] || null

    return NextResponse.json({
      success: true,
      package: {
        package_id: pkg.package_id,
        status: pkg.status,
        delivery_time: pkg.delivery_time,
        assigned_car: pkg.assigned_car,
        assigned_driver: pkg.assigned_driver,
        origin_branch_id: pkg.origin_branch_id,
        destination_branch_id: pkg.destination_branch_id,
        payment_status: pkg.payment_status,
        delivery_ok: deliveryOk,
        now_kigali: now.toISOString(),
        sender_phone: pkg.sender_phone,
        receiver_phone: pkg.receiver_phone,
      },
      branches: branch,
      latestTracking,
    })
  } catch (error) {
    console.error("/api/tracking/validate error:", error)
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 500 })
  }
}
