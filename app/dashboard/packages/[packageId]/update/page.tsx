"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import PackageEditForm from "@/components/packages/package-edit-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiService, type Package } from "@/lib/api"
import { ArrowLeft, FileText, Loader2, MapPin, PackageIcon, Scale, Truck, User } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface DashboardUpdatePackagePageProps {
  params: {
    packageId: string
  }
}

export default function DashboardUpdatePackagePage({ params }: DashboardUpdatePackagePageProps) {
  const [packageData, setPackageData] = useState<Package | null>(null)
  const [tracking, setTracking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchPackageData = async () => {
    try {
      setLoading(true)
      const response = await apiService.getPackage(params.packageId)
      setPackageData(response.package)
      setTracking(response.tracking || [])
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
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200"
      case "in_transit":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "out_for_delivery":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "picked_up":
        return "bg-indigo-50 text-indigo-700 border-indigo-200"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "delivered":
        return "default"
      case "cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="agent">
        <DashboardLayout>
          <div className="container mx-auto py-8">
            <div className="flex items-center justify-center p-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-slate-600">Loading package details...</p>
              </div>
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
          <div className="container mx-auto py-8">
            <div className="text-center p-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-rose-50 rounded-full flex items-center justify-center">
                <PackageIcon className="h-8 w-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Package Not Found</h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">{error || "The requested package could not be found."}</p>
              <Link href="/dashboard/packages">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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
        <div className="container mx-auto py-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={`/dashboard/packages/${params.packageId}`}>
                  <Button variant="outline" size="sm" className="border-slate-300 hover:bg-slate-50">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Edit Package</h1>
                  <p className="text-slate-600 mt-1">Update package information and tracking details</p>
                </div>
              </div>
              <Badge
                className={`${getStatusColor(packageData.status)} border px-3 py-1 font-medium`}
                variant={getStatusVariant(packageData.status) as any}
              >
                {packageData.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Left Column - Package Summary & Tracking */}
              <div className="xl:col-span-1 space-y-6">
                {/* Package Summary */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-4 border-b border-slate-100">
                    <CardTitle className="flex items-center gap-2 text-slate-900 text-lg">
                      <PackageIcon className="h-5 w-5 text-blue-600" />
                      Package Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Sender & Receiver */}
                    <div className="grid grid-cols-1 gap-6">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4 text-blue-600" />
                          <p className="text-sm font-semibold text-slate-700">Sender</p>
                        </div>
                        <p className="font-medium text-slate-900">{packageData.sender_name}</p>
                        <p className="text-sm text-slate-600 mt-1">{packageData.sender_phone}</p>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4 text-green-600" />
                          <p className="text-sm font-semibold text-slate-700">Receiver</p>
                        </div>
                        <p className="font-medium text-slate-900">{packageData.receiver_name}</p>
                        <p className="text-sm text-slate-600 mt-1">{packageData.receiver_phone}</p>
                      </div>
                    </div>

                    {/* Package Details */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Priority</span>
                        <Badge variant="outline" className="uppercase font-medium border-blue-200 text-blue-700">
                          {packageData.priority}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Delivery Fee</span>
                        <span className="font-semibold text-slate-900">
                          {typeof packageData.delivery_fee === 'number'
                            ? `UGX ${packageData.delivery_fee.toLocaleString()}`
                            : packageData.delivery_fee}
                        </span>
                      </div>
                    </div>

                    {/* Branch Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        Branch Information
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Origin</p>
                          <p className="text-sm font-medium text-slate-900 mt-1">
                            {packageData.origin_branch_name || packageData.origin_branch_id}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Destination</p>
                          <p className="text-sm font-medium text-slate-900 mt-1">
                            {packageData.destination_branch_name || packageData.destination_branch_id}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Assignment Details */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Truck className="h-4 w-4 text-blue-600" />
                        Assignment
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vehicle</p>
                          <p className="text-sm font-medium text-slate-900 mt-1">
                            {packageData.car_model
                              ? `${packageData.car_model} • ${packageData.car_plate_number}`
                              : (packageData.assigned_car || 'Unassigned')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Driver</p>
                          <p className="text-sm font-medium text-slate-900 mt-1">
                            {packageData.driver_name || packageData.assigned_driver || 'Unassigned'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Package Specifications */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Scale className="h-4 w-4 text-blue-600" />
                        Specifications
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Weight</p>
                          <p className="text-sm font-medium text-slate-900 mt-1">
                            {packageData.weight ? `${packageData.weight} kg` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Value</p>
                          <p className="text-sm font-medium text-slate-900 mt-1">
                            {packageData.declared_value ? `RWF ${packageData.declared_value}` : '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {packageData.package_description && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Description
                        </div>
                        <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                          {packageData.package_description}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tracking History */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-4 border-b border-slate-100">
                    <CardTitle className="text-slate-900 text-lg">Tracking History</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {tracking.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                          <MapPin className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-sm">No tracking entries yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tracking.slice(0, 5).map((t, index) => (
                          <div key={t.id} className="flex gap-4 group">
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-slate-300'
                                }`} />
                              {index < tracking.slice(0, 5).length - 1 && (
                                <div className="w-0.5 h-full bg-slate-200 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-4 group-last:pb-0">
                              <p className="font-medium text-slate-900 capitalize">
                                {t.status?.replace(/_/g, ' ') || 'Update'}
                              </p>
                              <p className="text-sm text-slate-600 mt-1">
                                {t.location_name || '—'} {t.notes && `• ${t.notes}`}
                              </p>
                              <div className="flex justify-between items-center mt-2">
                                <p className="text-xs text-slate-500">
                                  {t.updated_by_name || t.updated_by}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(t.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Edit Form */}
              <div className="xl:col-span-3">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50 rounded-t-lg">
                    <CardTitle className="text-slate-900 text-xl">Edit Package Details</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      Update package information, tracking status, and assignment details
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <PackageEditForm pkg={packageData} onSaved={fetchPackageData} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}