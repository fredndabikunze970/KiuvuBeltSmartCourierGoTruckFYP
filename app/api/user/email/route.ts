import { requireAuth } from "@/lib/auth-middleware"
import { sql } from "@/lib/database"
import { NextRequest, NextResponse } from "next/server"

// PUT - Update email
export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const { new_email } = await request.json()

    // Validate email
    if (!new_email || !new_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await sql`
      SELECT user_id
      FROM users
      WHERE email = ${new_email.toLowerCase()}
      AND user_id != ${user.user_id}
    `

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      )
    }

    // Update email
    const result = await sql`
      UPDATE users
      SET 
        email = ${new_email.toLowerCase()},
        updated_at = NOW()
      WHERE user_id = ${user.user_id}
      RETURNING user_id, email, full_name
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: "Email updated successfully",
      user: result[0]
    })
  } catch (error) {
    console.error("Error updating email:", error)
    return NextResponse.json(
      { error: "Failed to update email" },
      { status: 500 }
    )
  }
})
