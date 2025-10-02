"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ("agent" | "admin" | "customer")[]
  requiredRole?: "agent" | "admin" | "customer" // Keep for backward compatibility
}

export function ProtectedRoute({ children, allowedRoles, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !user) {
        console.log('Not authenticated, redirecting to login');
        router.push("/login")
        return
      }

      // Check if user has the required role or is in allowed roles
      const hasRequiredRole = !requiredRole || user.role === requiredRole;
      const hasAllowedRole = !allowedRoles || allowedRoles.includes(user.role);
      
      if (!hasRequiredRole && !hasAllowedRole) {
        console.log('User role:', user.role, 'Required:', requiredRole, 'Allowed:', allowedRoles);
        router.push("/unauthorized")
        return
      }
    }
  }, [user, loading, isAuthenticated, requiredRole, allowedRoles, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Check if user has the required role or is in allowed roles
  const hasRequiredRole = !requiredRole || user?.role === requiredRole;
  const hasAllowedRole = !allowedRoles || allowedRoles.includes(user?.role as any);
      
  if (!hasRequiredRole && !hasAllowedRole) {
    console.log('Access denied - User role:', user?.role, 'Required:', requiredRole, 'Allowed:', allowedRoles);
    return null;
  }

  return <>{children}</>
}
