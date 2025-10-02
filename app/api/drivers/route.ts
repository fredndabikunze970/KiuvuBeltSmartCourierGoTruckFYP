import { sql } from "@/lib/database";
import { generateDriverId } from "@/lib/generators";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('Fetching drivers...');
    const drivers = await sql`
      SELECT 
        d.*,
        b.branch_name,
        b.branch_id,
        c.car_id as assigned_car_id,
        c.plate_number as assigned_car_plate,
        c.model as assigned_car_model
      FROM drivers d
      LEFT JOIN branches b ON d.branch_id = b.branch_id
      LEFT JOIN cars c ON d.assigned_car = c.car_id
      ORDER BY d.created_at DESC
    `
    console.log('Drivers fetched:', drivers.length);
    return NextResponse.json({ drivers })
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json(
      { error: "Failed to fetch drivers" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { full_name, phone, license_number, assigned_car, branch_id } = await request.json()

    const driver_id = generateDriverId()

    const result = await sql`
      INSERT INTO drivers (driver_id, full_name, phone, license_number, assigned_car, branch_id)
      VALUES (${driver_id}, ${full_name}, ${phone}, ${license_number}, ${assigned_car}, ${branch_id})
      RETURNING *
    `

    return NextResponse.json(
      { driver: result[0] },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create driver" },
      { status: 500 }
    )
  }
}