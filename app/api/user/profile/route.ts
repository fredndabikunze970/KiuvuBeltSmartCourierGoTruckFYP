import { requireAuth } from "@/lib/auth-middleware"
import { sql } from "@/lib/database"
import { NextRequest, NextResponse } from "next/server"

// GET - Get current user profile
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const userProfile = await sql`
      SELECT 
        u.user_id,
        u.email,
        u.full_name,
        u.phone,
        u.role,
        u.is_active,
        u.branch_id,
        u.created_at,
        b.branch_name,
        b.address as branch_address
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.branch_id
    WHERE u.user_id = ${user.user_id}
    `

    if (userProfile.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ user: userProfile[0] })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    )
  }
})

// PUT - Update user profile
export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const { full_name, phone, branch_id } = await request.json()

    // Validate inputs
    if (!full_name || full_name.trim().length < 3) {
      return NextResponse.json(
        { error: "Full name must be at least 3 characters" },
        { status: 400 }
      )
    }

    if (!phone || !phone.match(/^\+?[0-9]{10,}$/)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      )
    }

    // Update user profile
    const result = await sql`
      UPDATE users
      SET 
        full_name = ${full_name.trim()},
        phone = ${phone.trim()},
        branch_id = ${branch_id || null},
        updated_at = NOW()
  WHERE user_id = ${user.user_id}
      RETURNING user_id, email, full_name, phone, role, branch_id, is_active
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      user: result[0]
    })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
})
