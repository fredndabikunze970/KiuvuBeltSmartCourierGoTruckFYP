"use client"

import { useState, useEffect } from "react"
import { apiService, type Package } from "@/lib/api"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StatusUpdateForm } from "@/components/tracking/status-update-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, PackageIcon } from "lucide-react"
import Link from "next/link"

interface DashboardUpdatePackagePageProps {
  params: {
    packageId: string
  }
}

export default function DashboardUpdatePackagePage({ params }: DashboardUpdatePackagePageProps) {
  const [packageData, setPackageData] = useState<Package | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchPackageData = async () => {
    try {
      setLoading(true)
      const response = await apiService.getPackage(params.packageId)
      setPackageData(response.package)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch package data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPackageData()
  }, [params.packageId])

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

  if (loading) {
    return (
      <ProtectedRoute requiredRole="agent">
        <DashboardLayout>
          <div className="container mx-auto py-6">
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (error || !packageData) {
    return (
      <ProtectedRoute requiredRole="agent">
        <DashboardLayout>
          <div className="container mx-auto py-6">
            <div className="text-center p-8">
              <p className="text-red-600">{error || "Package not found"}</p>
              <Link href="/dashboard/packages">
                <Button variant="outline" className="mt-4 bg-transparent">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Packages
                </Button>
              </Link>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="agent">
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={`/dashboard/packages/${params.packageId}`}>
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">Update Package Status</h1>
                  <p className="text-muted-foreground">Package ID: {packageData.package_id}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Package Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PackageIcon className="h-5 w-5" />
                    Package Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Status</p>
                    <Badge className={getStatusColor(packageData.status)} variant="secondary">
                      {packageData.status.replace("_", " ").toUpperCase()}
                    </Badge>
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
                    <p className="text-sm font-medium text-muted-foreground">Priority</p>
                    <Badge variant="outline">{packageData.priority}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Status Update Form */}
              <div className="lg:col-span-2">
                <StatusUpdateForm
                  packageId={packageData.package_id}
                  currentStatus={packageData.status}
                  onUpdate={fetchPackageData}
                />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
