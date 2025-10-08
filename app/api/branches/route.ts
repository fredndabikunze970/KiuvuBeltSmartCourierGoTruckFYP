import { sql } from '@/lib/database'
import { generateBranchId } from '@/lib/generators'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const branches = await sql`
      SELECT * FROM branches ORDER BY branch_name ASC
    `

    return NextResponse.json({ branches })
  } catch (error) {
    console.error('Error fetching branches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch branches' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const branch_name = data.branch_name || ""
    const latitude = data.latitude || 0
    const longitude = data.longitude || 0
    const address = data.address || ""

    const branch_id = generateBranchId()
    const result = await sql`
      INSERT INTO branches (branch_id, branch_name, latitude, longitude, address)
      VALUES (${branch_id}, ${branch_name}, ${latitude}, ${longitude}, ${address})
      RETURNING *
    `

    return NextResponse.json(
      { branch: result[0] },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating branch:', error)
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    )
  }
}
