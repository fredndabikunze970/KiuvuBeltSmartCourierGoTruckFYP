import { db } from "@/lib/database"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const driver = await db.query(
      `SELECT d.*, b.branch_name, c.plate_number, c.model
       FROM drivers d
       LEFT JOIN branches b ON d.branch_id = b.branch_id
       LEFT JOIN cars c ON d.assigned_car = c.car_id
       WHERE d.driver_id = $1`,
      [params.id]
    )

    if (!driver.rows[0]) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ driver: driver.rows[0] })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch driver" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { full_name, phone, license_number, assigned_car, branch_id } = await request.json()

    // Log the incoming data
    console.log('=== DRIVER UPDATE REQUEST ===')
    console.log('Driver ID:', params.id)
    console.log('Incoming data:', { full_name, phone, license_number, assigned_car, branch_id })

    // First, get the current driver data before update
    const currentDriverQuery = `
      SELECT * FROM drivers WHERE driver_id = $1
    `
    const currentDriverResult = await db.query(currentDriverQuery, [params.id])

    if (!currentDriverResult.rows[0]) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }

    console.log('Current driver data before update:', currentDriverResult.rows[0])

    // Build dynamic update query based on provided fields
    const updates = []
    const values = []
    let paramIndex = 1

    // Only update NOT NULL fields if they have valid non-empty values
    if (full_name !== undefined && full_name !== null && full_name.trim() !== '') {
      updates.push(`full_name = $${paramIndex}`)
      values.push(full_name.trim())
      paramIndex++
    }

    if (phone !== undefined && phone !== null && phone.trim() !== '') {
      updates.push(`phone = $${paramIndex}`)
      values.push(phone.trim())
      paramIndex++
    }

    if (license_number !== undefined && license_number !== null && license_number.trim() !== '') {
      updates.push(`license_number = $${paramIndex}`)
      values.push(license_number.trim())
      paramIndex++
    }

    // For nullable fields, always update them since client sends the current value
    if (assigned_car !== undefined) {
      updates.push(`assigned_car = $${paramIndex}`)
      values.push(assigned_car === 'none' || assigned_car === null ? null : assigned_car)
      paramIndex++
    }

    if (branch_id !== undefined) {
      updates.push(`branch_id = $${paramIndex}`)
      values.push(branch_id === null ? null : branch_id)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`)

    const query = `
      UPDATE drivers
      SET ${updates.join(', ')}
      WHERE driver_id = $${paramIndex}
      RETURNING *
    `
    values.push(params.id)

    console.log('Update query:', query)
    console.log('Update values:', values)

    const result = await db.query(query, values)

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }

    console.log('Updated driver data:', result.rows[0])
    console.log('=== DRIVER UPDATE COMPLETE ===')

    return NextResponse.json({ driver: result.rows[0] })
  } catch (error) {
    console.error('Update driver error:', error)
    return NextResponse.json(
      { error: "Failed to update driver" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await db.query(
      'DELETE FROM drivers WHERE driver_id = $1 RETURNING *',
      [params.id]
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "Driver deleted successfully" })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete driver" },
      { status: 500 }
    )
  }
}