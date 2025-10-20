import { DeliveryVerification } from "@/components/tracking/delivery-verification"

export default function VerifyPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Verify Delivery
          </h2>
          <p className="text-muted-foreground">Confirm package delivery with your pickup code</p>
        </div>
        <DeliveryVerification />
      </div>
    </div>
  )
}
