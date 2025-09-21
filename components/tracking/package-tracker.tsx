"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { apiService, type Package, type TrackingEntry } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, MapPin, Search, Clock, Truck, CheckCircle, AlertCircle } from "lucide-react"
import { TrackingMap } from "./tracking-map"
import { TrackingTimeline } from "./tracking-timeline"

interface PackageTrackerProps {
  initialPackageId?: string
}

export function PackageTracker({ initialPackageId }: PackageTrackerProps) {
  const [packageId, setPackageId] = useState(initialPackageId || "")
  const [packageData, setPackageData] = useState<Package | null>(null)
  const [tracking, setTracking] = useState<TrackingEntry[]>([])
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number
    longitude: number
    timestamp: number
    lastUpdated: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchTrackingData = async (pkgId: string) => {
    if (!pkgId.trim()) return

    try {
      setLoading(true)
      setError("")

      const response = await apiService.getTracking(pkgId)
      setPackageData(response.package)
      setTracking(response.tracking)
      setCurrentLocation(response.currentLocation || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tracking data")
      setPackageData(null)
      setTracking([])
      setCurrentLocation(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialPackageId) {
      fetchTrackingData(initialPackageId)
    }
  }, [initialPackageId])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchTrackingData(packageId)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "cancelled":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case "in_transit":
      case "out_for_delivery":
        return <Truck className="h-5 w-5 text-blue-600" />
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "in_transit":
        return "bg-blue-100 text-blue-800"
      case "out_for_delivery":
        return "bg-orange-100 text-orange-800"
      case "picked_up":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Track Your Package
          </CardTitle>
          <CardDescription>Enter your package ID to track its current location and status</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="packageId" className="sr-only">
                Package ID
              </Label>
              <Input
                id="packageId"
                placeholder="Enter package ID (e.g., PKG-ABC123)"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading || !packageId.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Track
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Package Information */}
      {packageData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Package Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(packageData.status)}
                Package Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Badge className={getStatusColor(packageData.status)} variant="secondary">
                  {packageData.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Package ID</p>
                  <p className="font-mono font-bold">{packageData.package_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">From</p>
                  <p className="font-medium">{packageData.sender_name}</p>
                  <p className="text-sm text-muted-foreground">{packageData.sender_phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">To</p>
                  <p className="font-medium">{packageData.receiver_name}</p>
                  <p className="text-sm text-muted-foreground">{packageData.receiver_phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(packageData.created_at)}</p>
                </div>
                {packageData.delivered_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                    <p className="text-sm">{formatDate(packageData.delivered_at)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Map and Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Real-time Map */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Live Location
                </CardTitle>
                <CardDescription>
                  {currentLocation
                    ? `Last updated: ${new Date(currentLocation.lastUpdated).toLocaleString()}`
                    : "No GPS data available"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 rounded-lg overflow-hidden">
                  <TrackingMap
                    packageId={packageData.package_id}
                    currentLocation={currentLocation}
                    tracking={tracking}
                    senderAddress={packageData.sender_address}
                    receiverAddress={packageData.receiver_address}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tracking Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Tracking History</CardTitle>
                <CardDescription>{tracking.length} status updates</CardDescription>
              </CardHeader>
              <CardContent>
                <TrackingTimeline tracking={tracking} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && !packageData && packageId && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Package Found</h3>
            <p className="text-muted-foreground">
              Please check your package ID and try again. Make sure you've entered the correct package ID.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
