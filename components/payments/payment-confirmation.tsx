"use client"

// Payment confirmation component for manual payment verification
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface Payment {
  payment_id: string
  package_id: string
  amount: number
  payment_method: string
  payment_status: string
  transaction_reference: string
  created_at: string
  package_details?: {
    sender_name: string
    receiver_name: string
    receiver_phone: string
  }
}

interface PaymentConfirmationProps {
  payment: Payment
  onPaymentConfirmed: (paymentId: string) => void
}

export function PaymentConfirmation({ payment, onPaymentConfirmed }: PaymentConfirmationProps) {
  const [confirming, setConfirming] = useState(false)
  const [confirmationData, setConfirmationData] = useState({
    transaction_reference: payment.transaction_reference || "",
    payment_method: payment.payment_method || "",
    notes: "",
  })
  const { toast } = useToast()

  const handleConfirmPayment = async () => {
    setConfirming(true)
    try {
      const response = await fetch(`/api/payments/${payment.payment_id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(confirmationData),
      })

      if (response.ok) {
        toast({
          title: "Payment Confirmed",
          description: `Payment for ${payment.package_id} has been confirmed successfully.`,
        })
        onPaymentConfirmed(payment.payment_id)
      } else {
        throw new Error("Failed to confirm payment")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setConfirming(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">Payment Confirmation</CardTitle>
          <Badge className={getStatusColor(payment.payment_status)}>{payment.payment_status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Package ID:</span>
            <div className="font-medium">{payment.package_id}</div>
          </div>
          <div>
            <span className="text-gray-600">Amount:</span>
            <div className="font-medium text-kivu-secondary">{payment.amount.toLocaleString()} RWF</div>
          </div>
          <div>
            <span className="text-gray-600">Payment Method:</span>
            <div className="font-medium capitalize">{payment.payment_method.replace("_", " ")}</div>
          </div>
          <div>
            <span className="text-gray-600">Created:</span>
            <div className="font-medium">{new Date(payment.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        {payment.package_details && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Package Details</h4>
            <div className="text-sm space-y-1">
              <div>From: {payment.package_details.sender_name}</div>
              <div>To: {payment.package_details.receiver_name}</div>
              <div>Phone: {payment.package_details.receiver_phone}</div>
            </div>
          </div>
        )}

        {payment.payment_status === "pending" && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium">Confirm Payment</h4>

            <div className="space-y-3">
              <div>
                <Label htmlFor="transaction_reference">Transaction Reference</Label>
                <Input
                  id="transaction_reference"
                  value={confirmationData.transaction_reference}
                  onChange={(e) => setConfirmationData((prev) => ({ ...prev, transaction_reference: e.target.value }))}
                  placeholder="Enter transaction reference"
                />
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={confirmationData.payment_method}
                  onValueChange={(value) => setConfirmationData((prev) => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={confirmationData.notes}
                  onChange={(e) => setConfirmationData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional notes about the payment"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleConfirmPayment}
                disabled={confirming || !confirmationData.transaction_reference}
                className="w-full bg-kivu-primary hover:bg-kivu-primary/90"
              >
                {confirming ? "Confirming..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
