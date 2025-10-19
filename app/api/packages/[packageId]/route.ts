import { getAuthUser } from "@/lib/auth-middleware"
import { sql, db } from "@/lib/database"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { packageId: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const packageId = params.packageId
    if (!packageId) return NextResponse.json({ error: "packageId is required" }, { status: 400 })

    // Fetch package with related info
    const rows = await sql`
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
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 })
    }

    const pkg = rows[0]

    // Access control: agents only see packages from their branch; others can see their own packages
    if (user.role === 'agent' && pkg.origin_branch_id !== user.branch_id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    if (user.role !== 'admin' && user.role !== 'agent' && pkg.agent_id !== user.user_id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Fetch recent tracking entries
    // Fetch tracking rows; use tracking.* and join users to get the updater's name when present
    const tracking = await sql`
      SELECT t.*, u.full_name as updated_by_name
      FROM tracking t
      LEFT JOIN users u ON t.updated_by = u.user_id
      WHERE t.package_id = ${packageId}
      ORDER BY t.created_at DESC
      LIMIT 200
    `

    return NextResponse.json({ success: true, package: pkg, tracking })
  } catch (error) {
    console.error("/api/packages/[packageId] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { packageId: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const packageId = params.packageId
    if (!packageId) return NextResponse.json({ error: "packageId is required" }, { status: 400 })

    // Only admin or agent (owner) can update package details
    if (user.role !== 'admin' && user.role !== 'agent') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))

    // Allowed updatable fields
    const {
      sender_name,
      sender_phone,
      sender_address,
      receiver_name,
      receiver_phone,
      receiver_address,
      package_description,
      weight,
      dimensions,
      declared_value,
      delivery_fee,
      priority,
      origin_branch_id,
      destination_branch_id,
      assigned_car,
      assigned_driver,
      delivery_time,
    } = body

    // Ensure package exists
    const pkgRows = await sql`SELECT * FROM packages WHERE package_id = ${packageId}`
    if (!pkgRows || pkgRows.length === 0) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    const existing = pkgRows[0]

    // Agents can only update packages from their branch
    if (user.role === 'agent' && existing.origin_branch_id !== user.branch_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build parameterized UPDATE query using db.query to avoid sql.raw
    const setParts: string[] = []
    const values: any[] = []
    const push = (col: string, val: any) => {
      const idx = values.length + 1
      setParts.push(`${col} = $${idx}`)
      values.push(val)
    }

    if (sender_name !== undefined) push('sender_name', sender_name)
    if (sender_phone !== undefined) push('sender_phone', sender_phone)
    if (sender_address !== undefined) push('sender_address', sender_address)
    if (receiver_name !== undefined) push('receiver_name', receiver_name)
    if (receiver_phone !== undefined) push('receiver_phone', receiver_phone)
    if (receiver_address !== undefined) push('receiver_address', receiver_address)
    if (package_description !== undefined) push('package_description', package_description)
    if (weight !== undefined) push('weight', weight)
    if (dimensions !== undefined) push('dimensions', dimensions)
    if (declared_value !== undefined) push('declared_value', declared_value)
    if (delivery_fee !== undefined) push('delivery_fee', delivery_fee)
    if (priority !== undefined) push('priority', priority)
    if (origin_branch_id !== undefined) push('origin_branch_id', origin_branch_id)
    if (destination_branch_id !== undefined) push('destination_branch_id', destination_branch_id)
    if (assigned_car !== undefined) push('assigned_car', assigned_car)
    if (assigned_driver !== undefined) push('assigned_driver', assigned_driver)
    if (delivery_time !== undefined) push('delivery_time', delivery_time)

    if (setParts.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // add updated_at as last parameter
    setParts.push(`updated_at = now()`)

    const setClause = setParts.join(', ')
    const queryText = `UPDATE packages SET ${setClause} WHERE package_id = $${values.length + 1} RETURNING *`
    const queryValues = [...values, packageId]

    const updated = await db.query({ text: queryText, values: queryValues })
    const newPkg = updated[0]

    // If assignments changed, insert tracking row to record assignment
    const assignmentChanged = (existing.assigned_car !== newPkg.assigned_car) || (existing.assigned_driver !== newPkg.assigned_driver)
    if (assignmentChanged) {
      await sql`
        INSERT INTO tracking (package_id, status, location_name, notes, updated_by, created_at)
        VALUES (
          ${packageId},
          'assignment_updated',
          ${'Assignment updated'},
          ${`Vehicle: ${newPkg.assigned_car || 'N/A'}, Driver: ${newPkg.assigned_driver || 'N/A'}`},
          ${user.user_id},
          now()
        )
      `
    }

    return NextResponse.json({ success: true, package: newPkg })
  } catch (error) {
    console.error('/api/packages/[packageId] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
