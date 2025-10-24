"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Package } from "@/lib/api"
import { AlertCircle, Calendar, Car, Clock, DollarSign, FileText, Hash, Info, MapPin, Package as PackageIcon, Phone, Scale, TrendingUp, Truck, User } from "lucide-react"
import { useEffect, useState } from "react"

interface PackageDetailsModalProps {
  packageData: Package | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  registered: { label: "Registered", color: "bg-blue-100 text-blue-800 border-blue-200", icon: "📦" },
  picked_up: { label: "Picked Up", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "🚚" },
  in_transit: { label: "In Transit", color: "bg-purple-100 text-purple-800 border-purple-200", icon: "🚛" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-orange-100 text-orange-800 border-orange-200", icon: "🏍️" },
  arrived: { label: "Arrived", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: "🏁" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800 border-green-200", icon: "✅" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200", icon: "❌" },
}

export function PackageDetailsModal({ packageData, open, onOpenChange }: PackageDetailsModalProps) {
  const [tracking, setTracking] = useState<any[]>([])
  const [loadingTracking, setLoadingTracking] = useState(false)

  useEffect(() => {
    if (open && packageData) {
      fetchTracking()
    }
  }, [open, packageData])

  const fetchTracking = async () => {
    if (!packageData) return
    try {
      setLoadingTracking(true)
      const trackingId = (packageData as any).tracking_number ?? (packageData as any).package_id ?? (packageData as any).pickup_code
      const response = await fetch(`/api/tracking/${trackingId}`)
      if (response.ok) {
        const data = await response.json()
        setTracking(data.tracking || [])
      }
    } catch (error) {
      console.error("Error fetching tracking:", error)
    } finally {
      setLoadingTracking(false)
    }
  }

  if (!packageData) return null

  const status = statusConfig[packageData.status] || statusConfig.registered
  const trackingId = (packageData as any).tracking_number ?? (packageData as any).package_id ?? (packageData as any).pickup_code
  const weightKg = (packageData as any).weight_kg ?? (packageData as any).weight ?? 0
  const cost = (packageData as any).cost ?? (packageData as any).delivery_fee ?? 0
  const formatRwf = (amt: number) => {
    try {
      return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(Number(amt) || 0)
    } catch (e) {
      return `RWF ${amt}`
    }
  }
  const description = (packageData as any).description ?? (packageData as any).package_description ?? "No description"
  const assignedCarPlate = (packageData as any).assigned_car_plate ?? (packageData as any).car_plate_number ?? (packageData as any).assigned_car ?? "Not assigned"
  const assignedAgentName = (packageData as any).agent_name ?? (packageData as any).driver_name ?? (packageData as any).assigned_driver ?? "Not assigned"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="w-[96vw] max-w-7xl h-[92vh] max-h-[96vh] overflow-y-auto rounded-2xl p-6 shadow-2xl bg-white/80 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Package Details
          </DialogTitle>
          <DialogDescription>
            Complete information about package {trackingId}
          </DialogDescription>
        </DialogHeader>

  <div className="space-y-6 py-6">
          {/* Status Header */}
          <div className="rounded-2xl bg-gradient-to-r from-white to-indigo-50 dark:from-slate-800 dark:to-slate-900 p-6 shadow-lg ring-1 ring-slate-200/60 border border-transparent">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-4xl ring-4 ring-white/50 dark:ring-slate-900/50">
                  {status.icon}
                </div>
                <div>
                  <h3 className="text-3xl font-extrabold leading-tight">{trackingId}</h3>
                  <div className="mt-2">
                    <Badge className={`${status.color} mt-1`}>{status.label}</Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Package ID</p>
                <p className="font-mono font-semibold">{packageData.package_id}</p>
              </div>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Scale className="h-4 w-4" />
                <p className="text-xs font-medium">Weight</p>
              </div>
              <p className="text-2xl font-bold">{weightKg} kg</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <p className="text-xs font-medium">Cost</p>
              </div>
              <p className="text-2xl font-bold">{formatRwf(cost)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <p className="text-xs font-medium">Priority</p>
              </div>
              <p className="text-lg font-bold capitalize">{packageData.priority || "Normal"}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                <p className="text-xs font-medium">Created</p>
              </div>
              <p className="text-sm font-semibold">{new Date(packageData.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Sender & Receiver */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card">
              <div className="p-4 border-b bg-muted/50">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Sender Information
                </h4>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                  <p className="font-semibold">{packageData.sender_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </p>
                  <p className="font-mono">{packageData.sender_phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Address
                  </p>
                  <p className="text-sm">{packageData.sender_address}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <div className="p-4 border-b bg-muted/50">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-600" />
                  Receiver Information
                </h4>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                  <p className="font-semibold">{packageData.receiver_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </p>
                  <p className="font-mono">{packageData.receiver_phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Address
                  </p>
                  <p className="text-sm">{packageData.receiver_address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Package Details */}
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b bg-muted/50">
              <h4 className="font-semibold flex items-center gap-2">
                <PackageIcon className="h-4 w-4 text-green-600" />
                Package Details
              </h4>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Weight</p>
                  <p className="font-semibold">{packageData.weight_kg || 0} kg</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Dimensions</p>
                  <p className="font-semibold">{packageData.dimensions || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Description
                </p>
                <p className="text-sm">{description}</p>
              </div>
              {(packageData as any).special_instructions && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Special Instructions
                  </p>
                  <p className="text-sm bg-yellow-50 dark:bg-yellow-950 p-2 rounded border border-yellow-200">
                    {(packageData as any).special_instructions}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Route & Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card">
              <div className="p-4 border-b bg-muted/50">
                <h4 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  Route Information
                </h4>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Origin</p>
                  <p className="font-semibold">{packageData.origin_branch_name || "N/A"}</p>
                </div>
                <div className="flex items-center justify-center text-muted-foreground">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Destination</p>
                  <p className="font-semibold">{packageData.destination_branch_name || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <div className="p-4 border-b bg-muted/50">
                <h4 className="font-semibold flex items-center gap-2">
                  <Truck className="h-4 w-4 text-indigo-600" />
                  Assignment
                </h4>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    Vehicle
                  </p>
                  <p className="font-semibold">{assignedCarPlate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Driver
                  </p>
                  <p className="font-semibold">{assignedAgentName}</p>
                </div>
                {packageData.delivery_time && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expected Delivery
                    </p>
                    <p className="font-semibold">{new Date(packageData.delivery_time).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment & Pickup */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card">
              <div className="p-4 border-b bg-muted/50">
                <h4 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Payment
                </h4>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                  <p className="text-2xl font-bold text-green-600">{formatRwf(cost)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge className={packageData.payment_confirmed ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {packageData.payment_confirmed ? "Confirmed" : "Pending"}
                  </Badge>
                </div>
              </div>
            </div>

            {packageData.pickup_code && (
              <div className="rounded-lg border bg-card">
                <div className="p-4 border-b bg-muted/50">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Hash className="h-4 w-4 text-red-600" />
                    Pickup Code
                  </h4>
                </div>
                <div className="p-4">
                  <p className="text-3xl font-mono font-bold tracking-wider text-red-600">{packageData.pickup_code}</p>
                  <p className="text-xs text-muted-foreground mt-2">Share with receiver</p>
                </div>
              </div>
            )}
          </div>

          {/* Tracking History */}
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b bg-muted/50">
              <h4 className="font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                Tracking History
              </h4>
            </div>
            <div className="p-4">
              {loadingTracking ? (
                <p className="text-center text-muted-foreground py-4">Loading...</p>
              ) : tracking.length > 0 ? (
                <div className="space-y-3">
                  {tracking.map((entry: any, index: number) => (
                    <div key={index} className="flex gap-3 pb-3 border-b last:border-0">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 mt-1" />
                        {index !== tracking.length - 1 && (
                          <div className="w-0.5 h-full bg-gradient-to-b from-blue-600 to-purple-600 mt-1" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold capitalize">{entry.status?.replace('_', ' ')}</p>
                            {entry.location_name && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {entry.location_name}
                              </p>
                            )}
                            {entry.notes && <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>}
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(entry.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No tracking history</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-4">Close</Button>
          <Button onClick={() => window.open(`/track/${trackingId}`, '_blank')} className="h-10 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-95 text-white">
            <MapPin className="h-4 w-4 mr-2" />
            Track Package
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
