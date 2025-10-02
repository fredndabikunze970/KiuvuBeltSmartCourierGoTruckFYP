import { ProtectedRoute } from "@/components/auth/protected-route"
import { EnhancedDashboardNew } from "@/components/dashboard/enhanced-dashboard-new"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <EnhancedDashboardNew />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
