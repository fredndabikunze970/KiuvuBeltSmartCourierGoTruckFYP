import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DeliveryVerification } from "@/components/tracking/delivery-verification"

export default function VerifyPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verify Delivery</h1>
          <p className="text-muted-foreground">
            Confirm package delivery using the package ID and pickup code.
          </p>
        </div>
        <DeliveryVerification />
      </div>
    </DashboardLayout>
  )
}
