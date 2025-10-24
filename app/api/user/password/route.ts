import { requireAuth } from "@/lib/auth-middleware"
import { sql } from "@/lib/database"
import bcrypt from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"

// PUT - Change password
export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const { current_password, new_password, confirm_password } = await request.json()

    // Validate inputs
    if (!current_password || !new_password || !confirm_password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    if (new_password !== confirm_password) {
      return NextResponse.json(
        { error: "New passwords do not match" },
        { status: 400 }
      )
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Get current user with password hash
    const userResult = await sql`
      SELECT user_id, password_hash
      FROM users
      WHERE user_id = ${user.user_id}
    `

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const currentUser = userResult[0]

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      current_password,
      currentUser.password_hash
    )

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10)

    // Update password
    await sql`
      UPDATE users
      SET 
        password_hash = ${hashedPassword},
        updated_at = NOW()
      WHERE user_id = ${user.user_id}
    `

    return NextResponse.json({
      message: "Password updated successfully"
    })
  } catch (error) {
    console.error("Error changing password:", error)
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    )
  }
})
