import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/database"
import { getAuthUser } from "@/lib/auth-middleware"
import { generatePackageId, generatePickupCode, generateTrackingNumber } from "@/lib/generators"

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

    let query = `
      SELECT p.*, u.full_name as agent_name 
      FROM packages p 
      LEFT JOIN users u ON p.agent_id = u.id 
      WHERE 1=1
    `
    const params: any[] = []
    let paramCount = 0

    // Filter by agent for non-admin users
    if (user.role !== "admin") {
      paramCount++
      query += ` AND p.agent_id = $${paramCount}`
      params.push(user.id)
    }

    // Filter by status
    if (status) {
      paramCount++
      query += ` AND p.status = $${paramCount}`
      params.push(status)
    }

    // Search functionality
    if (search) {
      paramCount++
      query += ` AND (p.package_id ILIKE $${paramCount} OR p.sender_name ILIKE $${paramCount} OR p.receiver_name ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    // Add pagination
    const offset = (page - 1) * limit
    query += ` ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`

    const result = await pool.query(query, params)

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM packages p WHERE 1=1`
    const countParams: any[] = []
    let countParamCount = 0

    if (user.role !== "admin") {
      countParamCount++
      countQuery += ` AND p.agent_id = $${countParamCount}`
      countParams.push(user.id)
    }

    if (status) {
      countParamCount++
      countQuery += ` AND p.status = $${countParamCount}`
      countParams.push(status)
    }

    if (search) {
      countParamCount++
      countQuery += ` AND (p.package_id ILIKE $${countParamCount} OR p.sender_name ILIKE $${countParamCount} OR p.receiver_name ILIKE $${countParamCount})`
      countParams.push(`%${search}%`)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)

    return NextResponse.json({
      packages: result.rows,
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
      declared_value,
      delivery_type,
      special_instructions,
    } = packageData

    // Generate IDs
    const package_id = generatePackageId()
    const pickup_code = generatePickupCode()
    const tracking_number = generateTrackingNumber()

    // Insert package
    const result = await pool.query(
      `INSERT INTO packages (
        package_id, tracking_number, pickup_code, agent_id,
        sender_name, sender_phone, sender_address,
        receiver_name, receiver_phone, receiver_address,
        package_type, weight, dimensions, declared_value,
        delivery_type, special_instructions, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'registered', NOW())
      RETURNING *`,
      [
        package_id,
        tracking_number,
        pickup_code,
        user.id,
        sender_name,
        sender_phone,
        sender_address,
        receiver_name,
        receiver_phone,
        receiver_address,
        package_type,
        weight,
        dimensions,
        declared_value,
        delivery_type,
        special_instructions,
      ],
    )

    const newPackage = result.rows[0]

    // Create initial tracking entry
    await pool.query(
      `INSERT INTO tracking (package_id, status, location, notes, created_at)
       VALUES ($1, 'registered', $2, 'Package registered and ready for pickup', NOW())`,
      [package_id, sender_address],
    )

    return NextResponse.json(newPackage, { status: 201 })
  } catch (error) {
    console.error("Create package error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
