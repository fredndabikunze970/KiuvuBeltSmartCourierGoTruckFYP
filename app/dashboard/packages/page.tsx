import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PackageList } from "@/components/packages/package-list"

export default function DashboardPackagesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <PackageList />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
