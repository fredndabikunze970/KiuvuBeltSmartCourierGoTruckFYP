"use client"

// Mobile package registration form for agents
import { useState } from "react"
import { MobileLayout } from "./MobileLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function PackageRegistrationMobile() {
  const [formData, setFormData] = useState({
    sender_name: "",
    sender_phone: "",
    sender_address: "",
    receiver_name: "",
    receiver_phone: "",
    receiver_address: "",
    package_type: "",
    weight: "",
    declared_value: "",
    special_instructions: "",
  })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      console.log("Package registered:", formData)
      // Reset form or navigate to success page
    } catch (error) {
      console.error("Registration failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sender Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sender_name">Full Name</Label>
            <Input
              id="sender_name"
              value={formData.sender_name}
              onChange={(e) => handleInputChange("sender_name", e.target.value)}
              placeholder="Enter sender's full name"
            />
          </div>
          <div>
            <Label htmlFor="sender_phone">Phone Number</Label>
            <Input
              id="sender_phone"
              value={formData.sender_phone}
              onChange={(e) => handleInputChange("sender_phone", e.target.value)}
              placeholder="+250788123456"
            />
          </div>
          <div>
            <Label htmlFor="sender_address">Address</Label>
            <Textarea
              id="sender_address"
              value={formData.sender_address}
              onChange={(e) => handleInputChange("sender_address", e.target.value)}
              placeholder="Enter pickup address"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Receiver Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="receiver_name">Full Name</Label>
            <Input
              id="receiver_name"
              value={formData.receiver_name}
              onChange={(e) => handleInputChange("receiver_name", e.target.value)}
              placeholder="Enter receiver's full name"
            />
          </div>
          <div>
            <Label htmlFor="receiver_phone">Phone Number</Label>
            <Input
              id="receiver_phone"
              value={formData.receiver_phone}
              onChange={(e) => handleInputChange("receiver_phone", e.target.value)}
              placeholder="+250788123456"
            />
          </div>
          <div>
            <Label htmlFor="receiver_address">Delivery Address</Label>
            <Textarea
              id="receiver_address"
              value={formData.receiver_address}
              onChange={(e) => handleInputChange("receiver_address", e.target.value)}
              placeholder="Enter delivery address"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Package Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="package_type">Package Type</Label>
            <Select value={formData.package_type} onValueChange={(value) => handleInputChange("package_type", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select package type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="documents">Documents</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
                <SelectItem value="food">Food Items</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              value={formData.weight}
              onChange={(e) => handleInputChange("weight", e.target.value)}
              placeholder="0.5"
              step="0.1"
            />
          </div>
          <div>
            <Label htmlFor="declared_value">Declared Value (RWF)</Label>
            <Input
              id="declared_value"
              type="number"
              value={formData.declared_value}
              onChange={(e) => handleInputChange("declared_value", e.target.value)}
              placeholder="50000"
            />
          </div>
          <div>
            <Label htmlFor="special_instructions">Special Instructions</Label>
            <Textarea
              id="special_instructions"
              value={formData.special_instructions}
              onChange={(e) => handleInputChange("special_instructions", e.target.value)}
              placeholder="Any special handling instructions"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <MobileLayout title={`Register Package (${step}/3)`} showBackButton={step > 1} onBack={handlePrevious}>
      <div className="p-4">
        {/* Progress Indicator */}
        <div className="flex mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= step ? "bg-kivu-primary text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {i}
              </div>
              {i < 3 && <div className={`flex-1 h-1 mx-2 ${i < step ? "bg-kivu-primary" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {/* Form Steps */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={handlePrevious} className="flex-1 bg-transparent">
              Previous
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext} className="flex-1 bg-kivu-primary hover:bg-kivu-primary/90">
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-kivu-primary hover:bg-kivu-primary/90"
            >
              {loading ? "Registering..." : "Register Package"}
            </Button>
          )}
        </div>
      </div>
    </MobileLayout>
  )
}
