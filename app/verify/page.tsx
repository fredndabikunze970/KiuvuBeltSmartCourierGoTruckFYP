import { DeliveryVerification } from "@/components/tracking/delivery-verification"

export default function VerifyPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Verify Delivery</h1>
          <p className="text-muted-foreground">Confirm package delivery with your pickup code</p>
        </div>
        <DeliveryVerification />
      </div>
    </div>
  )
}
