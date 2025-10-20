import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import dynamic from "next/dynamic"

// Import the client DashboardContent (uses useAuth) as a client component
const DashboardContent = dynamic(() => import('@/components/dashboard/dashboard-content'), { ssr: false })

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
