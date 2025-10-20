import { sql } from "@/lib/database";
import { generateCarId } from "@/lib/generators";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('Fetching cars...');
    const cars = await sql`
      SELECT 
        c.*,
        b.branch_name,
        b.branch_id,
        d.driver_id as assigned_driver_id,
        d.full_name as assigned_driver_name 
      FROM cars c 
      LEFT JOIN branches b ON c.branch_id = b.branch_id
      LEFT JOIN drivers d ON d.assigned_car = c.car_id
      ORDER BY c.created_at DESC
    `
    console.log('Cars fetched:', cars.length);
    return NextResponse.json({ cars })
  } catch (error) {
    console.error('Error fetching cars:', error);
    return NextResponse.json(
      { error: "Failed to fetch cars" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { plate_number, model, capacity_kg, status, branch_id } = await request.json()

    const car_id = generateCarId()

    const result = await sql`
      INSERT INTO cars (car_id, plate_number, model, capacity_kg, status, branch_id)
      VALUES (${car_id}, ${plate_number}, ${model}, ${capacity_kg}, ${status || 'available'}, ${branch_id})
      RETURNING *
    `

    return NextResponse.json(
      { car: result[0] },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating car:', error)
    return NextResponse.json(
      { error: "Failed to create car" },
      { status: 500 }
    )
  }
}