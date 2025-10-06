import { type NextRequest, NextResponse } from "next/server"
import { updatePackageLocation, getPackageLocation } from "@/lib/firebase"
import { requireAuth } from "@/lib/auth-middleware"

export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const { trackingNumber, location } = await request.json()

    if (!trackingNumber || !location) {
      return NextResponse.json({ error: "Tracking number and location are required" }, { status: 400 })
    }

    const { latitude, longitude, address, speed, accuracy } = location

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Latitude and longitude are required" }, { status: 400 })
    }

    // Update location in Firebase
    await updatePackageLocation(trackingNumber, {
      latitude,
      longitude,
      address,
      speed,
      accuracy,
      timestamp: Date.now(),
      updatedBy: user.id,
    })

    return NextResponse.json({
      success: true,
      message: "Location updated successfully",
    })
  } catch (error) {
    console.error("Location update error:", error)
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 })
  }
})

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const trackingNumber = searchParams.get("trackingNumber")

    if (!trackingNumber) {
      return NextResponse.json({ error: "Tracking number is required" }, { status: 400 })
    }

    const location = await getPackageLocation(trackingNumber)

    return NextResponse.json({
      success: true,
      location,
    })
  } catch (error) {
    console.error("Get location error:", error)
    return NextResponse.json({ error: "Failed to get location" }, { status: 500 })
  }
})
