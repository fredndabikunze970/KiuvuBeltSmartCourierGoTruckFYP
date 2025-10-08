"use client"

import type React from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiService, type Package, type TrackingEntry } from "@/lib/api"
import { AlertCircle, CheckCircle, Clock, Loader2, MapPin, Search, Truck, AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"
import { TrackingMap } from "./tracking-map"
import { TrackingTimeline } from "./tracking-timeline"
import { db } from "@/lib/firebase-client"
import { ref, onValue, off } from "firebase/database"

interface PackageTrackerProps {
    trackingId?: string
}

export function PackageTracker({ trackingId }: PackageTrackerProps) {
    const [trackingNumber, setTrackingNumber] = useState(trackingId || "")
    const [packageData, setPackageData] = useState<Package | null>(null)
    const [tracking, setTracking] = useState<TrackingEntry[]>([])
    const [currentLocation, setCurrentLocation] = useState<{
        latitude: number
        longitude: number
        timestamp: number
        lastUpdated: string
    } | null>(null)
    const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
    const [progress, setProgress] = useState<number>(0)
    const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(true)
    const [originBranch, setOriginBranch] = useState<any>(null)
    const [destinationBranch, setDestinationBranch] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const fetchTrackingData = async (trackingId: string) => {
        if (!trackingId.trim()) return

        try {
            setLoading(true)
            setError("")

            const response = await apiService.getTracking(trackingId)
            setPackageData(response.package)
            setTracking(response.tracking)
            setCurrentLocation(response.currentLocation || null)
            setEstimatedTime(response.estimatedTime || null)
            setProgress(response.progress || 0)
            setPaymentConfirmed(response.paymentConfirmed ?? true)
            setOriginBranch(response.originBranch || null)
            setDestinationBranch(response.destinationBranch || null)
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
        if (trackingId) {
            fetchTrackingData(trackingId)
        }
    }, [trackingId])

    // Real-time Firebase location updates
    useEffect(() => {
        const activeStatuses = ["in_transit", "out_for_delivery"]
        if (!packageData || !activeStatuses.includes(packageData.status)) return

        // Get vehicle ID from current location or package data
        const vehicleId = currentLocation?.vehicleId || packageData.assigned_car || 'CAR001'

        console.log("🔥 Setting up Firebase listener for vehicle:", vehicleId)

        // Listen to Firebase real-time location updates
        const locationRef = ref(db, `location_history/${vehicleId}`)

        const unsubscribe = onValue(locationRef, (snapshot) => {
            const data = snapshot.val()
            if (data) {
                // Get the latest location entry
                const keys = Object.keys(data)
                const latestKey = keys[keys.length - 1]
                const latestLocation = data[latestKey]

                console.log("📍 Real-time location update:", latestLocation)

                setCurrentLocation({
                    latitude: latestLocation.latitude,
                    longitude: latestLocation.longitude,
                    timestamp: latestLocation.timestamp,
                    lastUpdated: new Date(latestLocation.timestamp).toISOString(),
                    vehicleId: vehicleId,
                })
            }
        }, (error) => {
            console.error("Firebase listener error:", error)
        })

        // Also refresh full tracking data periodically (for status updates)
        const intervalId = setInterval(() => {
            fetchTrackingData(packageData.package_id)
        }, 30000) // Poll every 30 seconds for status updates

        return () => {
            console.log("🔥 Cleaning up Firebase listener")
            off(locationRef)
            clearInterval(intervalId)
        }
    }, [packageData?.package_id, packageData?.status, packageData?.assigned_car, currentLocation?.vehicleId])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchTrackingData(trackingNumber)
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
                            <Label htmlFor="trackingNumber" className="sr-only">
                                Tracking Number
                            </Label>
                            <Input
                                id="trackingNumber"
                                placeholder="Enter tracking number (e.g., PKG-ABC123)"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <Button type="submit" disabled={loading || !trackingNumber.trim()}>
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

            {/* Payment Warning */}
            {packageData && !paymentConfirmed && (
                <Alert variant="default" className="border-yellow-500 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800">Payment Pending</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                        Payment for this package has not been confirmed yet. Tracking information is limited.
                    </AlertDescription>
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
                                <CardDescription className="space-y-1">
                                    <div>
                                        {currentLocation
                                            ? `Last updated: ${new Date(currentLocation.lastUpdated).toLocaleString()}`
                                            : "No GPS data available"}
                                    </div>
                                    {estimatedTime && (
                                        <div className="text-sm">
                                            Estimated time: {Math.round(estimatedTime / 60)} minutes
                                        </div>
                                    )}
                                    {progress > 0 && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-600 transition-all duration-500"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium">{progress}%</span>
                                        </div>
                                    )}
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
                                        originBranch={originBranch}
                                        destinationBranch={destinationBranch}
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
            {!loading && !error && !packageData && trackingNumber && (
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
