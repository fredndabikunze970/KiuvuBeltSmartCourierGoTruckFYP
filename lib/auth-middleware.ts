import { sql } from "@/lib/database"
import jwt from "jsonwebtoken"
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

    // Some tokens use different claim names - be flexible
    const userId = decoded.user_id || decoded.userId || decoded.id || decoded.sub || null
    const email = decoded.email || decoded.mail || null
    const role = decoded.role || decoded.user_role || null

    if (!userId) return null

    return {
      id: decoded.id || 0,
      user_id: String(userId),
      email: email || '',
      role: role || 'customer',
    }
  } catch (error: any) {
    // Surface jwt verification errors for debugging (no token value logged)
    try {
      console.warn('JWT verification failed:', error && error.message ? error.message : String(error))
    } catch {}
    return null
  }
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // Check Authorization header (Bearer)
  let token: string | null = null
  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7)
  }

  // Fallback: x-access-token header (some clients use this)
  if (!token) {
    const alt = request.headers.get("x-access-token")
    if (alt) token = alt
  }

  // Fallback: cookie (useful when frontend sets cookie for server-side requests)
  if (!token && typeof request.cookies?.get === 'function') {
    try {
      const cookieToken = request.cookies.get('kivu_belt_token')?.value
      if (cookieToken) token = cookieToken
    } catch (err) {
      // ignore cookie read errors
    }
  }

  // Fallback: query string ?token=...
  if (!token) {
    try {
      const url = new URL(request.url)
      const q = url.searchParams.get('token')
      if (q) token = q
    } catch (err) {
      // ignore URL parse errors
    }
  }

  if (!token) {
    // No token found in any fallback location
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded) return null

  // Fetch full user details including branch_id
  try {
    const userResult = await sql`
      SELECT id, user_id, email, role, branch_id FROM users WHERE user_id = ${decoded.user_id}
    `
    if (userResult.length === 0) {
      try {
        console.warn('Auth token decoded to user_id but no DB user found for:', decoded.user_id)
      } catch {}
      return null
    }

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
      // Diagnostic: log which token sources were present (without revealing token values)
      try {
        const hasAuthHeader = !!request.headers.get('authorization')
        const hasAltHeader = !!request.headers.get('x-access-token')
        let hasCookie = false
        try { hasCookie = typeof request.cookies?.get === 'function' && !!request.cookies.get('kivu_belt_token') } catch (e) { hasCookie = false }
        let hasQuery = false
        try { hasQuery = !!(new URL(request.url).searchParams.get('token')) } catch (e) { hasQuery = false }
        console.warn('Unauthorized request to', request.method, request.url, { hasAuthHeader, hasAltHeader, hasCookie, hasQuery })
      } catch (logErr) {
        // ignore logging errors
      }
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
