import { getAuthUser, requireAuth, type AuthUser } from "@/lib/auth-middleware"
import { sql } from "@/lib/database"
import { sendPackageNotification } from "@/lib/sms"
import { generateTrackingNumber } from "@/lib/utils"
import { packageFormSchema } from "@/lib/validations/package"
import { NextResponse, type NextRequest } from "next/server"

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
          WHERE p.status = ${status} 
          AND (p.package_id ILIKE ${`%${search}%`} OR p.sender_name ILIKE ${`%${search}%`} OR p.receiver_name ILIKE ${`%${search}%`})
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      } else if (status) {
        packages = await sql`
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
          WHERE p.status = ${status}
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      } else if (search) {
        packages = await sql`
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
          WHERE (p.package_id ILIKE ${`%${search}%`} OR p.sender_name ILIKE ${`%${search}%`} OR p.receiver_name ILIKE ${`%${search}%`})
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      } else {
        packages = await sql`
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
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      }
    } else {
      // For non-admin users, filter by agent_id
      if (status && search) {
        packages = await sql`
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
          WHERE p.agent_id = ${user.user_id} AND p.status = ${status} 
          AND (p.package_id ILIKE ${`%${search}%`} OR p.sender_name ILIKE ${`%${search}%`} OR p.receiver_name ILIKE ${`%${search}%`})
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      } else if (status) {
        packages = await sql`
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
          WHERE p.agent_id = ${user.user_id} AND p.status = ${status}
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      } else if (search) {
        packages = await sql`
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
          WHERE p.agent_id = ${user.user_id} 
          AND (p.package_id ILIKE ${`%${search}%`} OR p.sender_name ILIKE ${`%${search}%`} OR p.receiver_name ILIKE ${`%${search}%`})
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      } else {
        packages = await sql`
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
          WHERE p.agent_id = ${user.user_id}
          ORDER BY p.created_at DESC 
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `
      }
    }

    // Get total count
    const totalResult =
      user.role === "admin"
        ? await sql`SELECT COUNT(*) FROM packages`
        : await sql`SELECT COUNT(*) FROM packages WHERE agent_id = ${user.user_id}`

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

export const POST = requireAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    // Only admin and agents can register packages
    if (user.role !== 'admin' && user.role !== 'agent') {
      return NextResponse.json(
        { error: "Only admins and agents can register packages" },
        { status: 403 }
      )
    }

    const packageData = await request.json()
    
    // Validate input data against our schema
    const validationResult = packageFormSchema.safeParse({
      senderName: packageData.sender_name,
      senderPhone: packageData.sender_phone,
      senderAddress: packageData.sender_address,
      originBranchId: packageData.origin_branch_id,
      receiverName: packageData.receiver_name,
      receiverPhone: packageData.receiver_phone,
      receiverAddress: packageData.receiver_address,
      destinationBranchId: packageData.destination_branch_id,
      packageDescription: packageData.description,
      weight: packageData.weight?.toString(),
      dimensions: packageData.dimensions,
      deliveryFee: packageData.delivery_fee?.toString(),
      priority: packageData.priority || 'normal'
    })

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const {
      senderName: sender_name,
      senderPhone: sender_phone,
      senderAddress: sender_address,
      originBranchId: origin_branch_id,
      receiverName: receiver_name,
      receiverPhone: receiver_phone,
      receiverAddress: receiver_address,
      destinationBranchId: destination_branch_id,
      packageDescription: description,
      weight,
      dimensions,
      deliveryFee: delivery_fee,
      priority
    } = validationResult.data

    const { assigned_car, assigned_driver } = packageData

    const tracking_number = generateTrackingNumber()

    const result = await sql`
      INSERT INTO packages (
        package_id, pickup_code, sender_name, sender_phone, sender_address,
        receiver_name, receiver_phone, receiver_address,
        package_description, weight, dimensions, delivery_fee, status,
        priority, origin_branch_id, destination_branch_id,
        assigned_car, assigned_driver, agent_id, created_at
      ) VALUES (
        ${tracking_number}, ${generateTrackingNumber()}, ${sender_name}, ${sender_phone}, ${sender_address},
        ${receiver_name}, ${receiver_phone}, ${receiver_address},
        ${description}, ${weight}, ${dimensions}, ${delivery_fee}, 'registered',
        ${priority}, ${origin_branch_id}, ${destination_branch_id}, 
        ${assigned_car}, ${assigned_driver}, ${user.user_id}, NOW()
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
})
