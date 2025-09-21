import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { RecentPackages } from "@/components/dashboard/recent-packages"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your courier operations</p>
          </div>

          <DashboardStats />
          <RecentPackages />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
