import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { sql } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, phone_number, role = "customer" } = await request.json()

    if (!email || !password || !full_name || !phone_number) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    // Hash password
    const saltRounds = 12
    const password_hash = await bcrypt.hash(password, saltRounds)

    const result = await sql`
      INSERT INTO users (email, password_hash, full_name, phone_number, role, status, created_at)
      VALUES (${email}, ${password_hash}, ${full_name}, ${phone_number}, ${role}, 'active', NOW())
      RETURNING id, email, full_name, phone_number, role
    `

    const user = result[0]

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone_number: user.phone_number,
          role: user.role,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
