 import { requireAdmin } from "@/lib/auth-middleware"
import { sql } from "@/lib/database"
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"

// GET /api/users - Get all users
export const GET = requireAdmin(async (request: NextRequest, user: any) => {
  try {
    const result = await sql`
      SELECT
        u.id, u.email, u.full_name, u.role, u.phone, u.created_at, u.branch_id,
        b.branch_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.branch_id
      ORDER BY u.created_at DESC
    `

    return NextResponse.json({ users: result }, { status: 200 })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
})

// POST /api/users - Create a new user
export const POST = requireAdmin(async (request: NextRequest, user: any) => {
  try {
    const { email, full_name, role, phone, password, branch_id } = await request.json()

    // Basic validation
    if (!email || !full_name || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: email, full_name, password' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['admin', 'agent', 'receiver']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: admin, agent, receiver' },
        { status: 400 }
      )
    }

    // For agents, branch_id is required
    if (role === 'agent' && !branch_id) {
      return NextResponse.json(
        { error: 'Branch is required for agent role' },
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

    // Check if branch exists if provided
    if (branch_id) {
      const branchCheck = await sql`
        SELECT branch_id FROM branches WHERE branch_id = ${branch_id}
      `
      if (branchCheck.length === 0) {
        return NextResponse.json(
          { error: 'Invalid branch ID' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const saltRounds = 12
    const password_hash = await bcrypt.hash(password, saltRounds)

    // Generate user_id
    const user_id = `USR${Date.now()}${Math.floor(Math.random() * 1000)}`

    // Create user
    const result = await sql`
      INSERT INTO users (user_id, email, password_hash, full_name, role, phone, branch_id)
      VALUES (${user_id}, ${email}, ${password_hash}, ${full_name}, ${role || 'agent'}, ${phone}, ${branch_id})
      RETURNING id, user_id, email, full_name, role, phone, branch_id
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
})

// PATCH /api/users - Update a user
export const PATCH = requireAdmin(async (request: NextRequest, user: any) => {
  try {
    const { id, email, full_name, role, phone, branch_id } = await request.json()

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

    // Validate role if provided
    const validRoles = ['admin', 'agent', 'receiver']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: admin, agent, receiver' },
        { status: 400 }
      )
    }

    // For agents, branch_id is required
    if (role === 'agent' && !branch_id) {
      return NextResponse.json(
        { error: 'Branch is required for agent role' },
        { status: 400 }
      )
    }

    // Check if branch exists if provided
    if (branch_id) {
      const branchCheck = await sql`
        SELECT branch_id FROM branches WHERE branch_id = ${branch_id}
      `
      if (branchCheck.length === 0) {
        return NextResponse.json(
          { error: 'Invalid branch ID' },
          { status: 400 }
        )
      }
    }

    // Update user with conditional fields
    let result
    if (email !== undefined && full_name !== undefined && role !== undefined && phone !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, full_name = ${full_name}, role = ${role}, phone = ${phone}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && full_name !== undefined && role !== undefined && phone !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, full_name = ${full_name}, role = ${role}, phone = ${phone}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && full_name !== undefined && role !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, full_name = ${full_name}, role = ${role}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && full_name !== undefined && phone !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, full_name = ${full_name}, phone = ${phone}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && role !== undefined && phone !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, role = ${role}, phone = ${phone}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (full_name !== undefined && role !== undefined && phone !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET full_name = ${full_name}, role = ${role}, phone = ${phone}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && full_name !== undefined && role !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, full_name = ${full_name}, role = ${role}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && full_name !== undefined && phone !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, full_name = ${full_name}, phone = ${phone}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && full_name !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, full_name = ${full_name}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && role !== undefined && phone !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, role = ${role}, phone = ${phone}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && role !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, role = ${role}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && phone !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, phone = ${phone}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (full_name !== undefined && role !== undefined && phone !== undefined) {
      result = await sql`
        UPDATE users
        SET full_name = ${full_name}, role = ${role}, phone = ${phone}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (full_name !== undefined && role !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET full_name = ${full_name}, role = ${role}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (full_name !== undefined && phone !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET full_name = ${full_name}, phone = ${phone}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (role !== undefined && phone !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET role = ${role}, phone = ${phone}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && full_name !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, full_name = ${full_name}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && role !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, role = ${role}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && phone !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, phone = ${phone}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (full_name !== undefined && role !== undefined) {
      result = await sql`
        UPDATE users
        SET full_name = ${full_name}, role = ${role}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (full_name !== undefined && phone !== undefined) {
      result = await sql`
        UPDATE users
        SET full_name = ${full_name}, phone = ${phone}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (full_name !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET full_name = ${full_name}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (role !== undefined && phone !== undefined) {
      result = await sql`
        UPDATE users
        SET role = ${role}, phone = ${phone}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (role !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET role = ${role}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (phone !== undefined && branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET phone = ${phone}, branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (email !== undefined) {
      result = await sql`
        UPDATE users
        SET email = ${email}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (full_name !== undefined) {
      result = await sql`
        UPDATE users
        SET full_name = ${full_name}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (role !== undefined) {
      result = await sql`
        UPDATE users
        SET role = ${role}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (phone !== undefined) {
      result = await sql`
        UPDATE users
        SET phone = ${phone}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else if (branch_id !== undefined) {
      result = await sql`
        UPDATE users
        SET branch_id = ${branch_id}
        WHERE id = ${id}
        RETURNING id, email, full_name, role, phone, branch_id
      `
    } else {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

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
})

// DELETE /api/users - Delete a user
export const DELETE = requireAdmin(async (request: NextRequest, user: any) => {
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
})
