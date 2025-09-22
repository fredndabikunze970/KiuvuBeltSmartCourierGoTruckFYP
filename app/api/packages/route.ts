import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getAuthUser } from "@/lib/auth-middleware"
import { generateTrackingNumber } from "@/lib/utils"
import { sendPackageNotification } from "@/lib/sms"

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    let packages

    if (user.role === "admin") {
      if (status && search) {
        packages = await sql`
          SELECT p.*, u.full_name as created_by_name 
          FROM packages p 
          LEFT JOIN users u ON p.created_by = u.id 
          WHERE p.status = ${status} 
          AND (p.tracking_number ILIKE ${`%${search}%`} OR p.sender_name ILIKE ${`%${search}%`} OR p.receiver_name ILIKE ${`%${search}%`})
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      } else if (status) {
        packages = await sql`
          SELECT p.*, u.full_name as created_by_name 
          FROM packages p 
          LEFT JOIN users u ON p.created_by = u.id 
          WHERE p.status = ${status}
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      } else if (search) {
        packages = await sql`
          SELECT p.*, u.full_name as created_by_name 
          FROM packages p 
          LEFT JOIN users u ON p.created_by = u.id 
          WHERE (p.tracking_number ILIKE ${`%${search}%`} OR p.sender_name ILIKE ${`%${search}%`} OR p.receiver_name ILIKE ${`%${search}%`})
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      } else {
        packages = await sql`
          SELECT p.*, u.full_name as created_by_name 
          FROM packages p 
          LEFT JOIN users u ON p.created_by = u.id 
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      }
    } else {
      // For non-admin users, filter by created_by
      if (status && search) {
        packages = await sql`
          SELECT p.*, u.full_name as created_by_name 
          FROM packages p 
          LEFT JOIN users u ON p.created_by = u.id 
          WHERE p.created_by = ${user.id} AND p.status = ${status} 
          AND (p.tracking_number ILIKE ${`%${search}%`} OR p.sender_name ILIKE ${`%${search}%`} OR p.receiver_name ILIKE ${`%${search}%`})
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      } else if (status) {
        packages = await sql`
          SELECT p.*, u.full_name as created_by_name 
          FROM packages p 
          LEFT JOIN users u ON p.created_by = u.id 
          WHERE p.created_by = ${user.id} AND p.status = ${status}
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      } else if (search) {
        packages = await sql`
          SELECT p.*, u.full_name as created_by_name 
          FROM packages p 
          LEFT JOIN users u ON p.created_by = u.id 
          WHERE p.created_by = ${user.id} 
          AND (p.tracking_number ILIKE ${`%${search}%`} OR p.sender_name ILIKE ${`%${search}%`} OR p.receiver_name ILIKE ${`%${search}%`})
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      } else {
        packages = await sql`
          SELECT p.*, u.full_name as created_by_name 
          FROM packages p 
          LEFT JOIN users u ON p.created_by = u.id 
          WHERE p.created_by = ${user.id}
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      }
    }

    // Get total count
    const totalResult =
      user.role === "admin"
        ? await sql`SELECT COUNT(*) FROM packages`
        : await sql`SELECT COUNT(*) FROM packages WHERE created_by = ${user.id}`

    const total = Number(totalResult[0].count)

    return NextResponse.json({
      success: true,
      packages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get packages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const packageData = await request.json()
    const {
      sender_name,
      sender_phone,
      sender_address,
      receiver_name,
      receiver_phone,
      receiver_address,
      package_type,
      weight,
      dimensions,
      description,
    } = packageData

    const tracking_number = generateTrackingNumber()

    const result = await sql`
      INSERT INTO packages (
        tracking_number, sender_name, sender_phone, sender_address,
        receiver_name, receiver_phone, receiver_address,
        package_type, weight, dimensions, description, status, created_by, created_at
      ) VALUES (
        ${tracking_number}, ${sender_name}, ${sender_phone}, ${sender_address},
        ${receiver_name}, ${receiver_phone}, ${receiver_address},
        ${package_type}, ${weight}, ${dimensions}, ${description}, 'pending', ${user.id}, NOW()
      )
      RETURNING *
    `

    const newPackage = result[0]

    await sql`
      INSERT INTO tracking (package_id, status, location, notes, created_at)
      VALUES (${newPackage.id}, 'Package registered', ${sender_address}, 'Package registered and ready for pickup', NOW())
    `

    try {
      await sendPackageNotification(sender_phone, tracking_number, "registered")
    } catch (smsError) {
      console.error("SMS notification failed:", smsError)
      // Don't fail the package creation if SMS fails
    }

    return NextResponse.json(
      {
        success: true,
        package: newPackage,
        message: "Package registered successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create package error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
