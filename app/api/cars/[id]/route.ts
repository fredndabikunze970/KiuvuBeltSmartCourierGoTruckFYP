import { db } from "@/lib/database"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const car = await db.query(
      `SELECT c.*, b.branch_name 
       FROM cars c 
       LEFT JOIN branches b ON c.branch_id = b.branch_id 
       WHERE c.car_id = $1`,
      [params.id]
    )

    if (!car.rows[0]) {
      return NextResponse.json(
        { error: "Car not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ car: car.rows[0] })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch car" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { plate_number, model, capacity_kg, status, branch_id } = await request.json()

    const result = await db.query(
      `UPDATE cars 
       SET plate_number = $1, model = $2, capacity_kg = $3, status = $4, branch_id = $5, updated_at = NOW()
       WHERE car_id = $6
       RETURNING *`,
      [plate_number, model, capacity_kg, status, branch_id, params.id]
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Car not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ car: result.rows[0] })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update car" },
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
      'DELETE FROM cars WHERE car_id = $1 RETURNING *',
      [params.id]
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Car not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "Car deleted successfully" })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete car" },
      { status: 500 }
    )
  }
}