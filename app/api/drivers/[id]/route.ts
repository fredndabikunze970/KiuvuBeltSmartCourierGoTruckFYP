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

    const result = await db.query(
      `UPDATE drivers 
       SET full_name = $1, phone = $2, license_number = $3, assigned_car = $4, branch_id = $5, updated_at = NOW()
       WHERE driver_id = $6
       RETURNING *`,
      [full_name, phone, license_number, assigned_car, branch_id, params.id]
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ driver: result.rows[0] })
  } catch (error) {
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