import { sql } from "@/lib/database"
import { sendPackageNotification } from "@/lib/sms"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { packageId, pickupCode }: { packageId: string; pickupCode: string } = body

    if (!packageId || !pickupCode) {
      return NextResponse.json(
        { error: "Package ID and pickup code are required" },
        { status: 400 }
      )
    }

    // Find the package
    const packages = await sql`
      SELECT id, package_id, pickup_code, status, receiver_phone, receiver_name, sender_name
      FROM packages
      WHERE package_id = ${packageId}
    `

    if (!packages || packages.length === 0) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 })
    }

    const pkg = packages[0]

    // Check if pickup code matches
    if (pkg.pickup_code !== pickupCode.toUpperCase()) {
      return NextResponse.json({ error: "Invalid pickup code" }, { status: 400 })
    }

    // Check if package is ready for delivery verification
    // if (pkg.status !== "out_for_delivery") {
    //   return NextResponse.json(
    //     { error: "Package is not ready for delivery verification" },
    //     { status: 400 }
    //   )
    // }

    // Update package status to delivered
    await sql`
      UPDATE packages
      SET status = 'delivered', delivered_at = NOW(), updated_at = NOW()
      WHERE package_id = ${packageId}
    `

    // Get system admin user for tracking update
    const adminUser = await sql`
      SELECT user_id FROM users WHERE role = 'admin' OR role = 'agent' LIMIT 1
    `

    if (!adminUser || adminUser.length === 0) {
      return NextResponse.json(
        { error: "System admin user not found" },
        { status: 500 }
      )
    }

    // Insert tracking entry
    await sql`
      INSERT INTO tracking (
        package_id,
        status,
        location_name,
        progress_percentage,
        notes,
        updated_by
      ) VALUES (
        ${packageId},
        'delivered',
        'Delivered to recipient',
        100,
        'Package delivered and verified by recipient',
        ${adminUser[0].user_id}
      )
    `

    // Send SMS notification to receiver
    try {
      await sendPackageNotification(
        pkg.receiver_phone,
        pkg.package_id,
        "delivered",
        pkg.receiver_name
      )
    } catch (smsError) {
      console.error("SMS notification failed:", smsError)
      // Don't fail the verification if SMS fails
    }

    // Get updated package data
    const updatedPackages = await sql`
      SELECT
        p.*,
        u.full_name as agent_name,
        ob.branch_name as origin_branch_name,
        db.branch_name as destination_branch_name,
        c.plate_number as car_plate_number,
        c.model as car_model,
        d.full_name as driver_name
      FROM packages p
      LEFT JOIN users u ON p.agent_id = u.user_id
      LEFT JOIN branches ob ON p.origin_branch_id = ob.branch_id
      LEFT JOIN branches db ON p.destination_branch_id = db.branch_id
      LEFT JOIN cars c ON p.assigned_car = c.car_id
      LEFT JOIN drivers d ON p.assigned_driver = d.driver_id
      WHERE p.package_id = ${packageId}
    `

    return NextResponse.json({
      message: "Delivery verified successfully",
      package: updatedPackages[0],
    })
  } catch (error) {
    console.error("Verify delivery error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
