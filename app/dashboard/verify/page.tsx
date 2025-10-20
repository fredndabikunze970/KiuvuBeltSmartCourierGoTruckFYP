import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DeliveryVerification } from "@/components/tracking/delivery-verification"

export default function VerifyPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          {/* <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Verify Delivery
          </h2>
          <p className="text-muted-foreground">
            Confirm package delivery using the package ID and pickup code.
          </p> */}
        </div>
        <DeliveryVerification />
      </div>
    </DashboardLayout>
  )
}
