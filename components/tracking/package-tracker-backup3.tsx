"use client"

import type React from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiService, type Package, type TrackingEntry } from "@/lib/api"
import { AlertCircle, CheckCircle, Clock, Loader2, MapPin, Search, Truck, AlertTriangle, Navigation, Package as PackageIcon, User, Phone, Calendar, ArrowRight } from "lucide-react"
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
        vehicleId?: string
        address?: string
    } | null>(null)
    const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
    const [progress, setProgress] = useState<number>(0)
    const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(true)
    const [originBranch, setOriginBranch] = useState<any>(null)
    const [destinationBranch, setDestinationBranch] = useState<any>(null)
    const [routePolyline, setRoutePolyline] = useState<any>(null)
    const [routeDistance, setRouteDistance] = useState<number | null>(null)
    const [locationHistory, setLocationHistory] = useState<any[]>([])
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
            setRoutePolyline(response.routePolyline || null)
            setRouteDistance(response.routeDistance || null)
            setLocationHistory(response.locationHistory || [])
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

        const vehicleId = currentLocation?.vehicleId || packageData.assigned_car || 'CAR001'

        console.log("🔥 Setting up Firebase real-time updates for vehicle:", vehicleId)

        const locationRef = ref(db, `location_history/${vehicleId}`)

        const fetchLocation = () => {
            onValue(locationRef, (snapshot) => {
                const data = snapshot.val()
                if (data) {
                    const keys = Object.keys(data)
                    const allLocations = keys.map(key => ({
                        ...data[key],
                        key: key
                    })).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))

                    const latestLocation = allLocations[0]

                    console.log("📍 Real-time location update:", latestLocation)

                    const timestamp = latestLocation.timestamp || Date.now()
                    setCurrentLocation({
                        latitude: latestLocation.latitude,
                        longitude: latestLocation.longitude,
                        timestamp: timestamp,
                        lastUpdated: new Date(timestamp).toISOString(),
                        vehicleId: vehicleId,
                        address: latestLocation.address,
                    })

                    setLocationHistory(allLocations.slice(0, 4).map((loc: any) => ({
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        timestamp: loc.timestamp,
                        lastUpdated: new Date(loc.timestamp || Date.now()).toISOString(),
                        accuracy: loc.accuracy,
                        speed: loc.speed,
                        heading: loc.heading,
                    })))
                }
            }, (error) => {
                console.error("Firebase listener error:", error)
            })
        }

        fetchLocation()
        const intervalId = setInterval(fetchLocation, 3000)
        const fullRefreshId = setInterval(() => {
            fetchTrackingData(packageData.package_id)
        }, 30000)

        return () => {
            console.log("🔥 Cleaning up Firebase listener")
            off(locationRef)
            clearInterval(intervalId)
            clearInterval(fullRefreshId)
        }
    }, [packageData?.package_id, packageData?.status, packageData?.assigned_car])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchTrackingData(trackingNumber)
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "delivered":
                return <CheckCircle className="h-6 w-6 text-green-600" />
            case "cancelled":
                return <AlertCircle className="h-6 w-6 text-red-600" />
            case "in_transit":
            case "out_for_delivery":
                return <Truck className="h-6 w-6 text-blue-600" />
            default:
                return <Clock className="h-6 w-6 text-yellow-600" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "delivered":
                return "bg-green-50 border-green-200 text-green-800"
            case "cancelled":
                return "bg-red-50 border-red-200 text-red-800"
            case "in_transit":
                return "bg-blue-50 border-blue-200 text-blue-800"
            case "out_for_delivery":
                return "bg-orange-50 border-orange-200 text-orange-800"
            case "picked_up":
                return "bg-yellow-50 border-yellow-200 text-yellow-800"
            default:
                return "bg-gray-50 border-gray-200 text-gray-800"
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

    const formatDistance = (meters: number | null) => {
        if (!meters) return null
        if (meters < 1000) return `${meters.toFixed(0)} m`
        return `${(meters / 1000).toFixed(2)} km`
    }

    return (
        <div className="space-y-8">
            {/* Hero Search Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-8 text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl font-bold mb-4">Track Your Package</h1>
                    <p className="text-xl text-blue-100 mb-8">
                        Enter your package ID to track its current location and status in real-time
                    </p>
                    
                    <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                        <div className="flex gap-4">
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
                                    className="h-14 text-lg border-0 shadow-lg rounded-xl"
                                />
                            </div>
                            <Button 
                                type="submit" 
                                disabled={loading || !trackingNumber.trim()}
                                className="h-14 px-8 text-lg bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-lg font-semibold"
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <Search className="mr-2 h-5 w-5" />
                                )}
                                Track Package
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <Alert variant="destructive" className="rounded-xl border-2">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
            )}

            {/* Payment Warning */}
            {packageData && !paymentConfirmed && (
                <Alert className="rounded-xl border-2 border-yellow-500 bg-yellow-50">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <AlertTitle className="text-yellow-800 font-semibold">Payment Pending</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                        Payment for this package has not been confirmed yet. Tracking information is limited.
                    </AlertDescription>
                </Alert>
            )}

            {/* Package Information */}
            {packageData && (
                <div className="space-y-6">
                    {/* Status Overview Card */}
                    <Card className="rounded-2xl border-2 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(packageData.status)}
                                    <div>
                                        <CardTitle className="text-2xl">Package Status</CardTitle>
                                        <CardDescription>Real-time tracking updates</CardDescription>
                                    </div>
                                </div>
                                <Badge 
                                    className={`${getStatusColor(packageData.status)} px-4 py-2 text-sm font-semibold border-2 rounded-full`}
                                    variant="secondary"
                                >
                                    {packageData.status.replace("_", " ").toUpperCase()}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {/* Progress Bar */}
                                <div className="md:col-span-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-600">Delivery Progress</span>
                                        <span className="text-sm font-bold text-blue-600">{progress}% Complete</span>
                                    </div>
                                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-1000 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Package Info */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <PackageIcon className="h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-600">Package ID</p>
                                            <p className="font-mono font-bold text-lg">{packageData.package_id}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sender Info */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <User className="h-5 w-5 text-green-600" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-600">Sender</p>
                                            <p className="font-medium">{packageData.sender_name}</p>
                                            <p className="text-sm text-gray-500">{packageData.sender_phone}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Receiver Info */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <User className="h-5 w-5 text-purple-600" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-600">Receiver</p>
                                            <p className="font-medium">{packageData.receiver_name}</p>
                                            <p className="text-sm text-gray-500">{packageData.receiver_phone}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Route Info */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Navigation className="h-5 w-5 text-orange-600" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-600">Distance</p>
                                            <p className="font-bold text-lg">{formatDistance(routeDistance)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Sidebar - Package Details */}
                        <div className="space-y-6">
                            {/* Package Details Card */}
                            <Card className="rounded-2xl border-2 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <PackageIcon className="h-5 w-5" />
                                        Package Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-600">Created</p>
                                            <p className="text-sm">{formatDate(packageData.created_at)}</p>
                                        </div>
                                        {packageData.delivered_at && (
                                            <div>
                                                <p className="text-sm font-semibold text-gray-600">Delivered</p>
                                                <p className="text-sm">{formatDate(packageData.delivered_at)}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Location History */}
                                    {locationHistory.length > 0 && (
                                        <div className="pt-4 border-t">
                                            <p className="text-sm font-semibold text-gray-600 mb-3">Recent Locations</p>
                                            <div className="space-y-3">
                                                {locationHistory.map((loc, idx) => (
                                                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                            <Navigation className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-mono font-semibold">
                                                                {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {new Date(loc.lastUpdated).toLocaleTimeString()}
                                                            </p>
                                                            {loc.speed && (
                                                                <p className="text-xs text-green-600 font-medium">
                                                                    {(loc.speed * 3.6).toFixed(1)} km/h
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Contact Information */}
                            <Card className="rounded-2xl border-2 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Phone className="h-5 w-5" />
                                        Contact Support
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Need help with your shipment? Contact our support team.
                                    </p>
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl">
                                        <Phone className="mr-2 h-4 w-4" />
                                        Contact Support
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Content - Map and Timeline */}
                        <div className="xl:col-span-2 space-y-6">
                            {/* Real-time Map */}
                            <Card className="rounded-2xl border-2 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Live Location Tracking
                                    </CardTitle>
                                    <CardDescription className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                            <span className="font-medium">
                                                {currentLocation
                                                    ? `Last updated: ${new Date(currentLocation.lastUpdated).toLocaleString()}`
                                                    : "No GPS data available"}
                                            </span>
                                        </div>
                                        {currentLocation?.address && (
                                            <div className="text-sm font-medium text-gray-700 bg-blue-50 p-2 rounded-lg">
                                                📍 {currentLocation.address}
                                            </div>
                                        )}
                                        {estimatedTime && (
                                            <div className="text-sm font-semibold text-green-600">
                                                Estimated delivery time: {Math.round(estimatedTime / 60)} minutes
                                            </div>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="h-96 rounded-b-2xl overflow-hidden">
                                        <TrackingMap
                                            packageId={packageData.package_id}
                                            currentLocation={currentLocation}
                                            tracking={tracking}
                                            senderAddress={packageData.sender_address}
                                            receiverAddress={packageData.receiver_address}
                                            originBranch={originBranch}
                                            destinationBranch={destinationBranch}
                                            routePolyline={routePolyline}
                                            locationHistory={locationHistory}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Tracking Timeline */}
                            <Card className="rounded-2xl border-2 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        Tracking History
                                    </CardTitle>
                                    <CardDescription>
                                        {tracking.length} status updates • Real-time progress tracking
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <TrackingTimeline tracking={tracking} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* No Data State */}
            {!loading && !error && !packageData && trackingNumber && (
                <Card className="rounded-2xl border-2 shadow-lg text-center py-16">
                    <CardContent>
                        <div className="max-w-md mx-auto">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="h-10 w-10 text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Package Found</h3>
                            <p className="text-gray-600 mb-6">
                                We couldn't find a package with that tracking ID. Please check your package ID and try again.
                            </p>
                            <Button 
                                onClick={() => setTrackingNumber("")}
                                variant="outline"
                                className="rounded-xl"
                            >
                                Try Another ID
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}