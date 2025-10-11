import { sql } from "@/lib/database"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthUser } from "@/lib/auth-middleware"

export const PATCH = requireAuth(async (request: NextRequest, user: AuthUser) => {
  try {

    const { branch_id } = await request.json()

    if (!branch_id) {
      return NextResponse.json(
        { error: 'Branch ID is required' },
        { status: 400 }
      )
    }

    // Check if branch exists
    const branchCheck = await sql`
      SELECT branch_id FROM branches WHERE branch_id = ${branch_id}
    `
    if (branchCheck.length === 0) {
      return NextResponse.json(
        { error: 'Invalid branch ID' },
        { status: 400 }
      )
    }

    // Update the user's branch_id
    const result = await sql`
      UPDATE users
      SET branch_id = ${branch_id}
      WHERE id = ${user.id}
      RETURNING id, email, full_name, role, phone, branch_id
    `

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: result[0]
    })
  } catch (error) {
    console.error('Error updating branch:', error)
    return NextResponse.json(
      { error: 'Failed to update branch' },
      { status: 500 }
    )
  }
}
