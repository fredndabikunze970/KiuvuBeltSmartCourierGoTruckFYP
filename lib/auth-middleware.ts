import jwt from "jsonwebtoken"
import type { NextRequest } from "next/server"

export interface AuthUser {
  id: number
  email: string
  role: "admin" | "agent" | "customer"
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    }
  } catch (error) {
    return null
  }
}

export function getAuthUser(request: NextRequest): AuthUser | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
}

export function requireAuth(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = getAuthUser(request)
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
    const user = getAuthUser(request)
    if (!user || user.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }
    return handler(request, user)
  }
}
