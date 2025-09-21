import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PackageDetails } from "@/components/packages/package-details"

interface DashboardPackageDetailsPageProps {
  params: {
    packageId: string
  }
}

export default function DashboardPackageDetailsPage({ params }: DashboardPackageDetailsPageProps) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <PackageDetails packageId={params.packageId} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
