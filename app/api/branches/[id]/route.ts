import { db } from "@/lib/database"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const branch = await db.query(
      'SELECT * FROM branches WHERE branch_id = $1',
      [params.id]
    )

    if (!branch.rows[0]) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ branch: branch.rows[0] })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch branch" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { branch_name, latitude, longitude, address } = await request.json()

    const result = await db.query(
      `UPDATE branches 
       SET branch_name = $1, latitude = $2, longitude = $3, address = $4, updated_at = NOW()
       WHERE branch_id = $5
       RETURNING *`,
      [branch_name, latitude, longitude, address, params.id]
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ branch: result.rows[0] })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update branch" },
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
      'DELETE FROM branches WHERE branch_id = $1 RETURNING *',
      [params.id]
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "Branch deleted successfully" })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete branch" },
      { status: 500 }
    )
  }
}