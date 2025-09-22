import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getPackageLocation } from "@/lib/firebase"

export async function GET(request: NextRequest, { params }: { params: { trackingNumber: string } }) {
  try {
    const { trackingNumber } = params

    if (!trackingNumber) {
      return NextResponse.json({ error: "Tracking number is required" }, { status: 400 })
    }

    // Get package details
    const packageResult = await sql`
      SELECT * FROM packages WHERE tracking_number = ${trackingNumber}
    `

    if (packageResult.length === 0) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 })
    }

    const packageData = packageResult[0]

    // Get tracking history
    const trackingHistory = await sql`
      SELECT * FROM tracking 
      WHERE package_id = ${packageData.id} 
      ORDER BY created_at ASC
    `

    // Get real-time location from Firebase
    let realTimeLocation = null
    try {
      realTimeLocation = await getPackageLocation(trackingNumber)
    } catch (error) {
      console.log("No real-time location available")
    }

    return NextResponse.json({
      success: true,
      package: packageData,
      tracking: trackingHistory,
      realTimeLocation,
    })
  } catch (error) {
    console.error("Tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
