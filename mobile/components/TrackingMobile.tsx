"use client"

// Mobile tracking component for receivers
import { useState } from "react"
import { MobileLayout } from "./MobileLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TrackingData {
  package: {
    package_id: string
    sender_name: string
    receiver_name: string
    status: string
    created_at: string
    delivery_fee: number
  }
  tracking: Array<{
    status: string
    notes: string
    created_at: string
    updated_by_name: string
  }>
  currentLocation?: {
    latitude: number
    longitude: number
    lastUpdated: string
  }
}

export function TrackingMobile() {
  const [packageId, setPackageId] = useState("")
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleTrack = async () => {
    if (!packageId.trim()) {
      setError("Please enter a package ID")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock tracking data
      setTrackingData({
        package: {
          package_id: packageId,
          sender_name: "John Doe",
          receiver_name: "Jane Smith",
          status: "in_transit",
          created_at: new Date().toISOString(),
          delivery_fee: 5000,
        },
        tracking: [
          {
            status: "registered",
            notes: "Package registered and ready for pickup",
            created_at: new Date(Date.now() - 3600000).toISOString(),
            updated_by_name: "Agent Smith",
          },
          {
            status: "picked_up",
            notes: "Package picked up from sender",
            created_at: new Date(Date.now() - 1800000).toISOString(),
            updated_by_name: "Agent Smith",
          },
          {
            status: "in_transit",
            notes: "Package in transit to destination",
            created_at: new Date(Date.now() - 900000).toISOString(),
            updated_by_name: "System",
          },
        ],
        currentLocation: {
          latitude: -2.05,
          longitude: 30.0,
          lastUpdated: new Date().toISOString(),
        },
      })
    } catch (err) {
      setError("Failed to fetch tracking information")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      registered: "bg-gray-100 text-gray-800",
      picked_up: "bg-blue-100 text-blue-800",
      in_transit: "bg-yellow-100 text-yellow-800",
      out_for_delivery: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-RW", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <MobileLayout title="Track Package">
      <div className="p-4 space-y-4">
        {/* Search Section */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Input
                placeholder="Enter Package ID (e.g., PKG-TEST-001)"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                className="text-center font-mono"
              />
              <Button
                onClick={handleTrack}
                disabled={loading}
                className="w-full bg-kivu-primary hover:bg-kivu-primary/90"
              >
                {loading ? "Tracking..." : "Track Package"}
              </Button>
              {error && <div className="text-red-600 text-sm text-center">{error}</div>}
            </div>
          </CardContent>
        </Card>

        {/* Tracking Results */}
        {trackingData && (
          <div className="space-y-4">
            {/* Package Info */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{trackingData.package.package_id}</CardTitle>
                  <Badge className={getStatusColor(trackingData.package.status)}>
                    {trackingData.package.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">From:</span>
                  <span className="font-medium">{trackingData.package.sender_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">To:</span>
                  <span className="font-medium">{trackingData.package.receiver_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee:</span>
                  <span className="font-medium text-kivu-secondary">
                    {trackingData.package.delivery_fee.toLocaleString()} RWF
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Current Location */}
            {trackingData.currentLocation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 rounded-lg p-4 text-center">
                    <div className="text-sm text-gray-600 mb-2">GPS Coordinates</div>
                    <div className="font-mono text-sm">
                      {trackingData.currentLocation.latitude.toFixed(4)},{" "}
                      {trackingData.currentLocation.longitude.toFixed(4)}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Last updated: {formatDate(trackingData.currentLocation.lastUpdated)}
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-3 bg-transparent">
                    View on Map
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Tracking Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tracking History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trackingData.tracking.map((event, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${index === 0 ? "bg-kivu-primary" : "bg-gray-300"}`} />
                        {index < trackingData.tracking.length - 1 && <div className="w-px h-8 bg-gray-200 mt-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex justify-between items-start mb-1">
                          <Badge className={getStatusColor(event.status)} variant="secondary">
                            {event.status.replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-gray-500">{formatDate(event.created_at)}</span>
                        </div>
                        <div className="text-sm text-gray-700">{event.notes}</div>
                        <div className="text-xs text-gray-500 mt-1">Updated by: {event.updated_by_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
