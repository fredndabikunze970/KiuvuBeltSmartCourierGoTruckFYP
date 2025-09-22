import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { EnhancedDashboard } from "@/components/dashboard/enhanced-dashboard"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <EnhancedDashboard />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
