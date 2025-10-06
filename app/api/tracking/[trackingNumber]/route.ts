import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getPackageLocation } from "@/lib/firebase"

export async function GET(request: NextRequest, { params }: { params: { trackingNumber: string } }) {
  try {
    const { trackingNumber } = params
    console.log("GET /api/tracking/:trackingNumber", { trackingNumber })

    if (!trackingNumber) {
      return NextResponse.json({ error: "Tracking number is required" }, { status: 400 })
    }

    // Get package details
    const packageResult = await sql`
      SELECT * FROM packages WHERE package_id = ${trackingNumber}
    `
    console.log("Package query result count:", packageResult?.length)

    if (packageResult.length === 0) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 })
    }

    const packageData = packageResult[0]
    console.log("Package row status:", packageData?.status)

    // Fetch realtime location from Firebase early to permit RTDB-driven tracking
    let realTimeLocation = null
    try {
      realTimeLocation = await getPackageLocation(trackingNumber)
    } catch (error) {
      console.log("No real-time location available")
    }
    const hasRealtime = !!realTimeLocation
    console.log("Realtime presence:", { hasRealtime })

    // Check both package status and latest tracking status to reduce false negatives
    const latestRow = await sql`
      SELECT status FROM tracking WHERE package_id = ${packageData.package_id} ORDER BY created_at DESC LIMIT 1
    `
    console.log("Latest tracking row:", latestRow?.[0])

    const pkgStatus = String(packageData.status || '').trim().toLowerCase()
    const latestStatus = String(latestRow?.[0]?.status || '').trim().toLowerCase()
    const allowed = new Set(['registered', 'in_transit', 'out_for_delivery'])
    console.log("Status check:", { pkgStatus, latestStatus, allowedStatuses: Array.from(allowed), hasRealtime })

    if (!hasRealtime && !allowed.has(pkgStatus) && !allowed.has(latestStatus)) {
      console.warn("Blocking tracking fetch due to status (no realtime either):", {
        packageStatus: packageData.status,
        latestTrackingStatus: latestRow?.[0]?.status || null,
        hasRealtime,
      })
      return NextResponse.json({
        error: "Package not yet packed in car",
        packageStatus: packageData.status,
        latestTrackingStatus: latestRow?.[0]?.status || null,
        hasRealtime,
      }, { status: 400 })
    }

    // Get tracking history
    const trackingHistory = await sql`
      SELECT * FROM tracking 
      WHERE package_id = ${packageData.package_id} 
      ORDER BY created_at ASC
    `

    // realTimeLocation already fetched above
    console.log("Returning tracking payload", { trackingCount: trackingHistory?.length ?? 0, hasCurrentLocation: !!realTimeLocation })
    return NextResponse.json({
      success: true,
      package: packageData,
      tracking: trackingHistory,
      currentLocation: realTimeLocation,
    })
  } catch (error) {
    console.error("Tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
