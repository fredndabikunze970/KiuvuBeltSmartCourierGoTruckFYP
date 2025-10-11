import { sql } from "@/lib/database"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    console.log('Login attempt for email:', email);
    const result = await sql`SELECT * FROM users WHERE email = ${email}`

    if (result.length === 0) {
      console.log('No user found with email:', email);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const user = result[0]
    console.log('User found:', { 
      email: user.email, 
      is_active: user.is_active, 
      role: user.role,
      hasPasswordHash: !!user.password_hash
    });

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json({ 
        error: 'Account is not active. Please contact support.',
        status: 'inactive'
      }, { status: 401 })
    }

    // Verify password
    console.log('Attempting password verification...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      console.log('Password verification failed');
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
    console.log('Password verified successfully');

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        user_id: user.user_id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
    )

    await sql`UPDATE users SET updated_at = NOW() WHERE id = ${user.id}`

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role === "receiver" ? "customer" : user.role, // Map receiver role to customer
        phone: user.phone,
        branch_id: user.branch_id,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
