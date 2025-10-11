import jwt from "jsonwebtoken"
import { sql } from "@/lib/database"
import type { NextRequest } from "next/server"

export interface AuthUser {
  id: number
  user_id: string
  email: string
  role: "admin" | "agent" | "customer"
  branch_id?: string
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return {
      id: decoded.id,
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
    }
  } catch (error) {
    return null
  }
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)
  if (!decoded) return null

  // Fetch full user details including branch_id
  try {
    const userResult = await sql`
      SELECT id, user_id, email, role, branch_id FROM users WHERE user_id = ${decoded.user_id}
    `
    if (userResult.length === 0) return null

    return {
      id: userResult[0].id,
      user_id: userResult[0].user_id,
      email: userResult[0].email,
      role: userResult[0].role,
      branch_id: userResult[0].branch_id,
    }
  } catch (error) {
    console.error("Error fetching user details:", error)
    return null
  }
}

export function requireAuth(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await getAuthUser(request)
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }
    return handler(request, user)
  }
}

export function requireAdmin(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await getAuthUser(request)
    if (!user || user.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }
    return handler(request, user)
  }
}
