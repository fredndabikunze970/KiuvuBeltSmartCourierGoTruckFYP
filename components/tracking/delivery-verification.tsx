"use client"

import type React from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api"
import { CheckCircle, Loader2, Package } from "lucide-react"
import { useState } from "react"

export function DeliveryVerification() {
  const [formData, setFormData] = useState({
    packageId: "",
    pickupCode: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const { toast } = useToast()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await apiService.verifyDelivery(formData.packageId, formData.pickupCode)

      setSuccess(true)
      toast({
        title: "Delivery Verified",
        description: "Package has been successfully delivered and verified",
      })

      // Reset form
      setFormData({
        packageId: "",
        pickupCode: "",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50/50 w-full max-w-md mx-auto sm:max-w-lg">
        <CardContent className="text-center py-12">
          <div className="mx-auto bg-green-100 text-green-600 p-4 rounded-full w-fit mb-6 animate-pulse">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-green-700 sm:text-3xl">Delivery Verified Successfully!</h3>
          <p className="text-muted-foreground mb-6 text-lg sm:text-xl">
            The package has been marked as delivered in our system. Thank you for using KIVU Belt Express!
          </p>
          <div className="space-y-3">
            <Button onClick={() => setSuccess(false)} variant="outline" className="w-full">
              Verify Another Package
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto sm:max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          <Package className="h-5 w-5 text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparentt" />
          Verify Delivery
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Enter the package ID and pickup code to verify delivery. Only the receiver should have the pickup code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="packageId">Package ID *</Label>
            <Input
              id="packageId"
              placeholder="PKG-XXXXX"
              value={formData.packageId}
              onChange={(e) => handleInputChange("packageId", e.target.value)}
              required
              disabled={loading}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupCode">Pickup Code *</Label>
            <Input
              id="pickupCode"
              placeholder="6-digit pickup code"
              value={formData.pickupCode}
              onChange={(e) => handleInputChange("pickupCode", e.target.value.toUpperCase())}
              maxLength={6}
              required
              disabled={loading}
              className="w-full"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !formData.packageId || !formData.pickupCode}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Delivery"
            )}
          </Button>

        <div className="mt-4 p-4 bg-muted rounded-lg text-center sm:text-left">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> The pickup code is provided to the receiver when the package is registered. This
            ensures that only the intended recipient can confirm delivery.
          </p>
        </div>
        </form>
      </CardContent>
    </Card>
  )
}
