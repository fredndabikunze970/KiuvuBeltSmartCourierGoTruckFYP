"use client"

import { useState, useEffect } from "react"
import { apiService, type Package, type TrackingEntry } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, PackageIcon, User, Phone, MapPin, Calendar, DollarSign, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PackageDetailsProps {
  packageId: string
}

const statusColors = {
  registered: "bg-blue-100 text-blue-800",
  picked_up: "bg-yellow-100 text-yellow-800",
  in_transit: "bg-purple-100 text-purple-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

export function PackageDetails({ packageId }: PackageDetailsProps) {
  const [packageData, setPackageData] = useState<Package | null>(null)
  const [tracking, setTracking] = useState<TrackingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchPackageDetails = async () => {
      try {
        setLoading(true)
        const [packageResponse, trackingResponse] = await Promise.all([
          apiService.getPackage(packageId),
          apiService.getTracking(packageId),
        ])

        setPackageData(packageResponse.package)
        setTracking(trackingResponse.tracking)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch package details")
      } finally {
        setLoading(false)
      }
    }

    fetchPackageDetails()
  }, [packageId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !packageData) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">{error || "Package not found"}</p>
        <Link href="/dashboard/packages">
          <Button variant="outline" className="mt-4 bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Packages
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/packages">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Package Details</h1>
            <p className="text-muted-foreground">Package ID: {packageData.package_id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/packages/${packageId}/update`}>
            <Button variant="outline">Update Status</Button>
          </Link>
          <Link href={`/track/${packageId}`}>
            <Button>Track Package</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageIcon className="h-5 w-5" />
                Package Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Package ID</p>
                  <p className="font-mono font-bold">{packageData.package_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pickup Code</p>
                  <p className="font-mono font-bold">{packageData.pickup_code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={statusColors[packageData.status]}>{packageData.status.replace("_", " ")}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Priority</p>
                  <Badge variant="outline">{packageData.priority}</Badge>
                </div>
              </div>

              {packageData.package_description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p>{packageData.package_description}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                {packageData.weight && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Weight</p>
                    <p>{packageData.weight} kg</p>
                  </div>
                )}
                {packageData.dimensions && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Dimensions</p>
                    <p>{packageData.dimensions}</p>
                  </div>
                )}
                {packageData.declared_value && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Declared Value</p>
                    <p>{formatCurrency(packageData.declared_value)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sender & Receiver */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Sender
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{packageData.sender_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p>{packageData.sender_phone}</p>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <p className="text-sm">{packageData.sender_address}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Receiver
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{packageData.receiver_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p>{packageData.receiver_phone}</p>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <p className="text-sm">{packageData.receiver_address}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Delivery Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Delivery Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivery Fee</p>
                <p className="text-lg font-bold">{formatCurrency(packageData.delivery_fee)}</p>
              </div>
              <Separator />
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
            </CardContent>
          </Card>

          {/* Tracking History */}
          <Card>
            <CardHeader>
              <CardTitle>Tracking History</CardTitle>
              <CardDescription>{tracking.length} updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tracking.map((entry, index) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${index === 0 ? "bg-primary" : "bg-muted-foreground"}`} />
                      {index < tracking.length - 1 && <div className="w-px h-8 bg-border mt-2" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-sm">{entry.status.replace("_", " ")}</p>
                      {entry.notes && <p className="text-sm text-muted-foreground">{entry.notes}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
                      </div>
                      {entry.updated_by_name && (
                        <p className="text-xs text-muted-foreground">by {entry.updated_by_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
