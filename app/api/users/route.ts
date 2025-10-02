import { sql } from "@/lib/database"
import { NextRequest, NextResponse } from "next/server"

// GET /api/users - Get all users
export async function GET(request: NextRequest) {
  try {
    const result = await sql`
      SELECT id, email, full_name, role, phone, created_at 
      FROM users 
      ORDER BY created_at DESC
    `

    return NextResponse.json({ users: result }, { status: 200 })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const { email, full_name, role, phone, password } = await request.json()

    // Basic validation
    if (!email || !full_name || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create user
    const result = await sql`
      INSERT INTO users (email, full_name, role, phone, password)     
      VALUES (${email}, ${full_name}, ${role || 'agent'}, ${phone}, ${password})
      RETURNING id, email, full_name, role, phone
    `

    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error('Failed to create user: No result returned')
    }

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

// PATCH /api/users - Update a user
export async function PATCH(request: NextRequest) {
  try {
    const { id, email, full_name, role, phone } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await sql`
      SELECT id FROM users WHERE id = ${id}
    `

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Build the dynamic update query
    const updateParts = []
    if (email) updateParts.push(sql`email = ${email}`)
    if (full_name) updateParts.push(sql`full_name = ${full_name}`)
    if (role) updateParts.push(sql`role = ${role}`)
    if (phone) updateParts.push(sql`phone = ${phone}`)

    if (updateParts.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE users 
      SET ${sql.join(updateParts, sql`, `)}
      WHERE id = ${id}
      RETURNING id, email, full_name, role, phone
    `

    if (!result || !Array.isArray(result) || result.length === 0) {
      return NextResponse.json(
        { error: 'User not found or no changes applied' },
        { status: 404 }
      )
    }

    return NextResponse.json(result[0], { status: 200 })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/users - Delete a user
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await sql`
      SELECT id FROM users WHERE id = ${id}
    `

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete user
    await sql`DELETE FROM users WHERE id = ${id}`

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}