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
import { Loader2, MapPin, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StatusUpdateFormProps {
  packageId: string
  currentStatus: string
  onUpdate?: () => void
}

export function StatusUpdateForm({ packageId, currentStatus, onUpdate }: StatusUpdateFormProps) {
  const [formData, setFormData] = useState({
    status: "",
    notes: "",
    latitude: "",
    longitude: "",
    locationName: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const statusOptions = [
    { value: "registered", label: "Registered" },
    { value: "picked_up", label: "Picked Up" },
    { value: "in_transit", label: "In Transit" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }))
        toast({
          title: "Location Updated",
          description: "Current GPS coordinates have been captured",
        })
      },
      (error) => {
        setError(`Location error: ${error.message}`)
      },
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.status) {
      setError("Please select a status")
      return
    }

    setLoading(true)

    try {
      const updateData: any = {
        status: formData.status,
        notes: formData.notes || undefined,
      }

      if (formData.latitude && formData.longitude) {
        updateData.latitude = Number.parseFloat(formData.latitude)
        updateData.longitude = Number.parseFloat(formData.longitude)
      }

      if (formData.locationName) {
        updateData.locationName = formData.locationName
      }

      await apiService.updatePackageStatus(packageId, updateData)

      toast({
        title: "Status Updated",
        description: `Package status updated to ${formData.status.replace("_", " ")}`,
      })

      // Reset form
      setFormData({
        status: "",
        notes: "",
        latitude: "",
        longitude: "",
        locationName: "",
      })

      if (onUpdate) {
        onUpdate()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Update Package Status
        </CardTitle>
        <CardDescription>Update the current status and location of package {packageId}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">New Status *</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} disabled={option.value === currentStatus}>
                    {option.label}
                    {option.value === currentStatus && " (Current)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this status update..."
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationName">Location Name</Label>
            <Input
              id="locationName"
              placeholder="e.g., Kigali Distribution Center"
              value={formData.locationName}
              onChange={(e) => handleInputChange("locationName", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="-1.9441"
                value={formData.latitude}
                onChange={(e) => handleInputChange("latitude", e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="30.0619"
                value={formData.longitude}
                onChange={(e) => handleInputChange("longitude", e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <Button type="button" variant="outline" onClick={getCurrentLocation} className="w-full bg-transparent">
            <MapPin className="mr-2 h-4 w-4" />
            Use Current Location
          </Button>

          <Button type="submit" className="w-full" disabled={loading || !formData.status}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Status...
              </>
            ) : (
              "Update Status"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
