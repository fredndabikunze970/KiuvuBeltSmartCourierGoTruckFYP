import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PackageRegistrationForm } from "@/components/packages/package-registration-form"

export default function DashboardRegisterPackagePage() {
  return (
    <ProtectedRoute requiredRole="agent">
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <PackageRegistrationForm />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
