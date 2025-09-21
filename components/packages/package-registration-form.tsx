"use client"

import type React from "react"

import { useState } from "react"
import { apiService } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Package, User, Phone, MapPin, DollarSign, Weight, Ruler } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PackageFormData {
  senderName: string
  senderPhone: string
  senderAddress: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  packageDescription: string
  weight: string
  dimensions: string
  declaredValue: string
  deliveryFee: string
  priority: "normal" | "express" | "urgent"
}

export function PackageRegistrationForm() {
  const [formData, setFormData] = useState<PackageFormData>({
    senderName: "",
    senderPhone: "",
    senderAddress: "",
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    packageDescription: "",
    weight: "",
    dimensions: "",
    declaredValue: "",
    deliveryFee: "",
    priority: "normal",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<{ packageId: string; pickupCode: string } | null>(null)
  const { toast } = useToast()

  const handleInputChange = (field: keyof PackageFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const packageData = {
        senderName: formData.senderName,
        senderPhone: formData.senderPhone,
        senderAddress: formData.senderAddress,
        receiverName: formData.receiverName,
        receiverPhone: formData.receiverPhone,
        receiverAddress: formData.receiverAddress,
        packageDescription: formData.packageDescription || undefined,
        weight: formData.weight ? Number.parseFloat(formData.weight) : undefined,
        dimensions: formData.dimensions || undefined,
        declaredValue: formData.declaredValue ? Number.parseFloat(formData.declaredValue) : undefined,
        deliveryFee: Number.parseFloat(formData.deliveryFee),
        priority: formData.priority,
      }

      const response = await apiService.registerPackage(packageData)

      setSuccess({
        packageId: response.package.package_id,
        pickupCode: response.package.pickup_code,
      })

      toast({
        title: "Package Registered Successfully",
        description: `Package ID: ${response.package.package_id}`,
      })

      // Reset form
      setFormData({
        senderName: "",
        senderPhone: "",
        senderAddress: "",
        receiverName: "",
        receiverPhone: "",
        receiverAddress: "",
        packageDescription: "",
        weight: "",
        dimensions: "",
        declaredValue: "",
        deliveryFee: "",
        priority: "normal",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto bg-green-100 text-green-600 p-3 rounded-full w-fit mb-4">
            <Package className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl text-green-600">Package Registered Successfully!</CardTitle>
          <CardDescription>Your package has been registered in the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-card p-4 rounded-lg border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Package ID</Label>
                <p className="text-lg font-mono font-bold">{success.packageId}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Pickup Code</Label>
                <p className="text-lg font-mono font-bold">{success.pickupCode}</p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Please save the Package ID and Pickup Code. The receiver will need the pickup code to verify delivery.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={() => setSuccess(null)} className="flex-1">
              Register Another Package
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              Print Slip
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Register New Package
        </CardTitle>
        <CardDescription>Enter package details to register for delivery</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Sender Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Sender Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="senderName">Full Name *</Label>
                <Input
                  id="senderName"
                  value={formData.senderName}
                  onChange={(e) => handleInputChange("senderName", e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senderPhone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="senderPhone"
                    value={formData.senderPhone}
                    onChange={(e) => handleInputChange("senderPhone", e.target.value)}
                    placeholder="+250788123456"
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderAddress">Address *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="senderAddress"
                  value={formData.senderAddress}
                  onChange={(e) => handleInputChange("senderAddress", e.target.value)}
                  placeholder="Street address, city, district"
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Receiver Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Receiver Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receiverName">Full Name *</Label>
                <Input
                  id="receiverName"
                  value={formData.receiverName}
                  onChange={(e) => handleInputChange("receiverName", e.target.value)}
                  placeholder="Jane Smith"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiverPhone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="receiverPhone"
                    value={formData.receiverPhone}
                    onChange={(e) => handleInputChange("receiverPhone", e.target.value)}
                    placeholder="+250788654321"
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiverAddress">Address *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="receiverAddress"
                  value={formData.receiverAddress}
                  onChange={(e) => handleInputChange("receiverAddress", e.target.value)}
                  placeholder="Street address, city, district"
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Package Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Package Details
            </h3>
            <div className="space-y-2">
              <Label htmlFor="packageDescription">Description</Label>
              <Textarea
                id="packageDescription"
                value={formData.packageDescription}
                onChange={(e) => handleInputChange("packageDescription", e.target.value)}
                placeholder="Brief description of package contents"
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <div className="relative">
                  <Weight className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => handleInputChange("weight", e.target.value)}
                    placeholder="2.5"
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="dimensions"
                    value={formData.dimensions}
                    onChange={(e) => handleInputChange("dimensions", e.target.value)}
                    placeholder="30x20x10 cm"
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="declaredValue">Declared Value (RWF)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="declaredValue"
                    type="number"
                    value={formData.declaredValue}
                    onChange={(e) => handleInputChange("declaredValue", e.target.value)}
                    placeholder="50000"
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Delivery Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="express">Express</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryFee">Delivery Fee (RWF) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="deliveryFee"
                    type="number"
                    value={formData.deliveryFee}
                    onChange={(e) => handleInputChange("deliveryFee", e.target.value)}
                    placeholder="5000"
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering Package...
              </>
            ) : (
              "Register Package"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
