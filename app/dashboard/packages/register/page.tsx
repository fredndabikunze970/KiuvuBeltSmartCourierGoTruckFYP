import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PackageRegistrationForm } from "@/components/packages/package-registration-form"

export default function DashboardRegisterPackagePage() {
  return (
    <DashboardLayout>
      <ProtectedRoute allowedRoles={["agent", "admin"]}>
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Register New Package
          </h2>
              <p className="text-muted-foreground">Create a new package for delivery</p>
            </div>
          </div>
          <PackageRegistrationForm />
        </div>
      </ProtectedRoute>
    </DashboardLayout>
  )
}
