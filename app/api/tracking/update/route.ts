import { handlePackageArrival, runArrivalUpdate } from "@/lib/arrival-automation"
import { requireAuth } from "@/lib/auth-middleware"
import { sql } from "@/lib/database"
import { updatePackageLocation } from "@/lib/firebase"
import { sendPackageNotification } from "@/lib/sms"
import { type NextRequest, NextResponse } from "next/server"

export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const { trackingNumber, status, location, latitude, longitude, notes, progress_percentage } = await request.json()

    if (!trackingNumber || !status) {
      return NextResponse.json({ error: "Tracking number and status are required" }, { status: 400 })
    }

    // Get package details
    const packageResult = await sql`
      SELECT * FROM packages WHERE tracking_number = ${trackingNumber}
    `

    if (packageResult.length === 0) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 })
    }

    const packageData = packageResult[0]

    // Update package status
    await sql`
      UPDATE packages 
      SET status = ${status}, updated_at = NOW()
      WHERE tracking_number = ${trackingNumber}
    `

    // Add tracking entry with progress percentage
    await sql`
      INSERT INTO tracking (package_id, status, location_name, latitude, longitude, notes, progress_percentage, created_at)
      VALUES (${packageData.package_id}, ${status}, ${location}, ${latitude}, ${longitude}, ${notes}, ${progress_percentage || 0}, NOW())
    `

    // Check if package has reached 100% and trigger arrival automation
    if (progress_percentage === 100) {
      // Run the atomic DB update first (updates packages and tracking)
      try {
        const res = await runArrivalUpdate(packageData.package_id)
        const row = res && res[0] ? res[0] as any : { pkg_updated: 0, tracking_updated: 0, new_tracking_id: null }
        const pkgUpdated = Number(row.pkg_updated || 0)
        const trackingUpdated = Number(row.tracking_updated || 0)
        const newTrackingId = row.new_tracking_id || null

        if (pkgUpdated > 0 || trackingUpdated > 0 || newTrackingId) {
          // DB changes applied; call centralized handler to send SMS and any additional side-effects.
          await handlePackageArrival(packageData.package_id)
        } else {
          // No DB changes — log and skip notifications to avoid duplicates/inconsistency
          console.warn(`Arrival automation: no DB changes for ${packageData.package_id}; skipping arrival notifications.`)
        }
      } catch (err) {
        console.error('Arrival automation failed during update:', err)
      }
    }

    // Update real-time location in Firebase
    if (latitude && longitude) {
      try {
        await updatePackageLocation(trackingNumber, {
          latitude,
          longitude,
          address: location,
        })
      } catch (error) {
        console.error("Firebase update failed:", error)
      }
    }

    // Send SMS notifications for non-arrival updates only (arrival notifications are handled centrally)
    if (status !== 'arrived') {
      try {
        await sendPackageNotification(packageData.receiver_phone, trackingNumber, status, location)
      } catch (error) {
        console.error("SMS notification failed:", error)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Tracking updated successfully",
    })
  } catch (error) {
    console.error("Update tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
