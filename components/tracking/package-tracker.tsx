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
import { geocodingService } from "@/utils/geocoding-services"

// Normalize timestamps coming from RTDB (seconds, ms, or ISO strings)
function normalizeTimestamp(ts: any): number {
    try {
        if (ts == null) return Date.now()
        if (typeof ts === 'number') {
            // If in seconds, convert to ms
            return ts < 1e12 ? ts * 1000 : ts
        }
        if (typeof ts === 'string') {
            // Numeric string
            if (/^\d+$/.test(ts)) {
                const n = parseInt(ts, 10)
                return n < 1e12 ? n * 1000 : n
            }
            // ISO date string
            const d = Date.parse(ts)
            return isNaN(d) ? Date.now() : d
        }
        return Date.now()
    } catch {
        return Date.now()
    }
}

// Plausible timestamp guard: discard dates before 2000 and far future (> now + 1 day)
function isPlausibleTimestamp(ts: number): boolean {
    const min = new Date('2000-01-01T00:00:00Z').getTime()
    const max = Date.now() + 24 * 60 * 60 * 1000
    return Number.isFinite(ts) && ts >= min && ts <= max
}

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
        accuracy?: number
        heading?: number
        speed?: number
        battery_level?: number
        device_status?: string
        signal_strength?: number
    } | null>(null)
    const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
    const [progress, setProgress] = useState<number>(0)
    const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(true)
    const [allowTrackingWithoutPayment, setAllowTrackingWithoutPayment] = useState<boolean>(true)
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
            setAllowTrackingWithoutPayment(response.allowTrackingWithoutPayment ?? true)
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

    // Real-time Firebase location updates (subscribe to both current_location and history)
    useEffect(() => {
        const activeStatuses = ["in_transit", "out_for_delivery"]
        if (!packageData || !activeStatuses.includes(packageData.status)) return

        // Force a single vehicle for tracking (prefer env, default to CAR001)
        const forcedVehicleId = process.env.NEXT_PUBLIC_FORCE_VEHICLE_ID || 'CAR001'
        const vehicleId = forcedVehicleId
        console.log('🔧 Forced vehicleId for tracking:', vehicleId)

        const historyRef = ref(db, `location_history/${vehicleId}`)
        const currentRef = ref(db, `vehicles/${vehicleId}/current_location`)
        const packageRef = ref(db, `tracking/${packageData.package_id}`)

        console.log("🔥 Setting up Firebase real-time updates for vehicle:", vehicleId)

        // Update helper
        const setLatestLocation = async (lat: number, lng: number, rawTs?: any, additionalData?: any) => {
            const ts = normalizeTimestamp(rawTs)
            console.log('🔄 RTDB normalized', { vehicleId, lat, lng, rawTs, ts })
            let address: string | undefined = undefined
            try {
                const geocodingResult = await geocodingService.geocode(lat, lng)
                address = geocodingResult.address
            } catch (error) {
                // best-effort
                console.warn('⚠️ reverse geocode failed', { vehicleId, lat, lng, error })
            }
            console.log('📍 setCurrentLocation()', {
                vehicleId,
                location: { lat, lng },
                ts,
                lastUpdated: new Date(ts).toISOString(),
                hasAddress: !!address,
            })
            setCurrentLocation({
                latitude: lat,
                longitude: lng,
                timestamp: ts,
                lastUpdated: new Date(ts).toISOString(),
                vehicleId,
                address,
                accuracy: additionalData?.accuracy,
                heading: additionalData?.heading,
                speed: additionalData?.speed,
                battery_level: additionalData?.battery_level,
                device_status: additionalData?.device_status,
                signal_strength: additionalData?.signal_strength,
            })
        }

        // Listen to current live position
        onValue(currentRef, (snapshot) => {
            const v = snapshot.val()
            console.log('📡 Raw current_location data from RTDB:', v)

            if (v) {
                // Handle the data structure - it might be a single object or have nested properties
                let latitude = v.latitude
                let longitude = v.longitude
                let timestamp = v.timestamp || v.time || v.created_at
                let accuracy = v.accuracy
                let heading = v.heading
                let speed = v.speed
                let battery_level = v.battery_level
                let device_status = v.device_status
                let signal_strength = v.signal_strength

                // If latitude/longitude are not direct properties, try to extract from nested structure
                if (latitude === undefined && longitude === undefined) {
                    // Check if it's stored as separate properties
                    if (typeof v === 'object') {
                        const keys = Object.keys(v)
                        for (const key of keys) {
                            if (key === 'latitude') latitude = v[key]
                            if (key === 'longitude') longitude = v[key]
                            if (key === 'timestamp') timestamp = v[key]
                            if (key === 'accuracy') accuracy = v[key]
                            if (key === 'speed') speed = v[key]
                            if (key === 'heading') heading = v[key]
                            if (key === 'battery_level') battery_level = v[key]
                            if (key === 'device_status') device_status = v[key]
                            if (key === 'signal_strength') signal_strength = v[key]
                        }
                    }
                }

                if (latitude !== undefined && longitude !== undefined) {
                    console.log('📡 current_location update', { vehicleId, lat: latitude, lng: longitude, ts: timestamp })
                    setLatestLocation(latitude, longitude, timestamp, {
                        accuracy,
                        heading,
                        speed,
                        battery_level,
                        device_status,
                        signal_strength
                    })
                } else {
                    console.warn('📡 current_location update failed - invalid coordinates', { vehicleId, latitude, longitude })
                }
            }
        }, (error) => {
            console.error("Firebase current_location listener error:", error)
        })

        // Listen to package-specific tracking path (some devices write here)
        onValue(packageRef, (snapshot) => {
            const v = snapshot.val()
            if (v && typeof v.latitude === 'number' && typeof v.longitude === 'number') {
                const ts = v.timestamp || v.lastUpdated || v.time
                console.log('📦 tracking/<packageId> update', { packageId: packageData.package_id, lat: v.latitude, lng: v.longitude, ts })
                setLatestLocation(v.latitude, v.longitude, ts, v)
            }
        }, (error) => {
            console.error("Firebase tracking/<packageId> listener error:", error)
        })

        // Listen to history (for trail and as fallback) - try both paths
        onValue(historyRef, async (snapshot) => {
            const data = snapshot.val()
            console.log('📜 Raw history data from RTDB:', data)

            if (!data) {
                console.log('📜 No history data available')
                return
            }

            let allLocations: any[] = []

            // Handle different data structures
            if (Array.isArray(data)) {
                // If it's an array
                allLocations = data.map((loc: any, idx: number) => ({
                    ...loc,
                    _ts: normalizeTimestamp(loc.timestamp ?? loc.time ?? loc.created_at ?? Date.now() - idx * 1000)
                }))
            } else if (typeof data === 'object') {
                // If it's an object with keys
                const rawLocations = Object.keys(data).map(key => ({ ...data[key], key }))
                allLocations = rawLocations
                    .map((loc: any) => ({
                        ...loc,
                        _ts: normalizeTimestamp(loc.timestamp ?? loc.time ?? loc.created_at ?? loc.key)
                    }))
            }

            // Filter and sort valid locations
            allLocations = allLocations
                .filter((loc: any) => loc.latitude !== undefined && loc.longitude !== undefined && isPlausibleTimestamp(loc._ts))
                .sort((a: any, b: any) => b._ts - a._ts)

            console.log('📜 Processed history locations:', { count: allLocations.length })

            if (allLocations.length > 0) {
                const latest = allLocations[0]
                console.log('📜 history latest', { vehicleId, lat: latest.latitude, lng: latest.longitude, ts: latest._ts })

                // Only update if this is newer than current location
                if (!currentLocation || latest._ts > currentLocation.timestamp) {
                    await setLatestLocation(latest.latitude, latest.longitude, latest._ts, latest)
                }

                // Process recent locations for history display
                const recent = allLocations.slice(0, 4)
                const geocoded = await Promise.all(recent.map(async (loc: any) => {
                    const ts = loc._ts
                    try {
                        const geocodingResult = await geocodingService.geocode(loc.latitude, loc.longitude)
                        return {
                            latitude: loc.latitude,
                            longitude: loc.longitude,
                            timestamp: ts,
                            lastUpdated: new Date(ts).toISOString(),
                            accuracy: loc.accuracy,
                            speed: loc.speed,
                            heading: loc.heading,
                            battery_level: loc.battery_level,
                            device_status: loc.device_status,
                            signal_strength: loc.signal_strength,
                            address: geocodingResult.address,
                        }
                    } catch {
                        return {
                            latitude: loc.latitude,
                            longitude: loc.longitude,
                            timestamp: ts,
                            lastUpdated: new Date(ts).toISOString(),
                            accuracy: loc.accuracy,
                            speed: loc.speed,
                            heading: loc.heading,
                            battery_level: loc.battery_level,
                            device_status: loc.device_status,
                            signal_strength: loc.signal_strength,
                            address: null,
                        }
                    }
                }))

                console.log('🧭 history geocoded ready', {
                    vehicleId,
                    count: geocoded.length,
                    first: geocoded[0] ? { lat: geocoded[0].latitude, lng: geocoded[0].longitude, ts: geocoded[0].timestamp } : null
                })
                setLocationHistory(geocoded)
            }
        }, (error) => {
            console.error("Firebase history listener error:", error)
        })

        // Refresh non-location data lightly every 15s to keep progress/ETAs up to date
        const metaRefresh = setInterval(() => {
            fetchTrackingData(packageData.package_id)
        }, 15000)

        return () => {
            console.log("🔥 Cleaning up Firebase listeners for", vehicleId)
            off(historyRef)
            off(currentRef)
            off(packageRef)
            clearInterval(metaRefresh)
        }
    }, [packageData?.package_id, packageData?.status, packageData?.assigned_car])

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
                return "bg-green-100 border-green-200 text-green-800"
            case "cancelled":
                return "bg-red-100 border-red-200 text-red-800"
            case "in_transit":
                return "bg-blue-100 border-blue-200 text-blue-800"
            case "out_for_delivery":
                return "bg-orange-100 border-orange-200 text-orange-800"
            case "picked_up":
                return "bg-yellow-100 border-yellow-200 text-yellow-800"
            default:
                return "bg-gray-100 border-gray-200 text-gray-800"
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
        <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl print:space-y-4 print:px-0 print:py-0 print:max-w-none">
            {/* Hero Search Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl p-6 text-white print:hidden">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl font-bold mb-3">Track Your Package</h1>
                    <p className="text-lg text-blue-100 mb-6">
                        Enter your package ID to track its current location and status in real-time
                    </p>
                    
                    <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                        <div className="flex gap-3">
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
                                    className="h-12 text-base border-0 shadow-md rounded-lg"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    disabled={loading || !trackingNumber.trim()}
                                    className="h-12 px-6 text-base bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-md font-medium"
                                >
                                    {loading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="mr-2 h-4 w-4" />
                                    )}
                                    Track
                                </Button>
                                {packageData && (
                                    <Button
                                        type="button"
                                        onClick={() => fetchTrackingData(trackingNumber)}
                                        disabled={loading}
                                        variant="outline"
                                        className="h-12 px-6 text-base border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg shadow-md font-medium"
                                    >
                                        {loading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <ArrowRight className="mr-2 h-4 w-4" />
                                        )}
                                        Refresh
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <Alert variant="destructive" className="rounded-lg border">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
            )}

            {/* Payment Warning */}
            {packageData && !allowTrackingWithoutPayment && (
                <Alert className="rounded-lg border-yellow-500 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800 text-sm font-medium">Tracking Not Available</AlertTitle>
                    <AlertDescription className="text-yellow-700 text-sm">
                        Payment for this package has not been confirmed and delivery time is not yet up. Tracking information is not available.
                    </AlertDescription>
                </Alert>
            )}

            {/* Package Information */}
            {packageData && (
                <div className="space-y-6 print:space-y-4">
                    {/* Status Overview Card - Moved to first position */}
                    <Card className="rounded-xl border shadow-md print:border-none print:shadow-none">
                        <CardHeader className="pb-3 print:pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(packageData.status)}
                                    <div>
                                        <CardTitle className="text-xl print:text-lg">Package Status</CardTitle>
                                        <CardDescription className="text-sm print:text-xs">Real-time tracking updates</CardDescription>
                                    </div>
                                </div>
                                <Badge 
                                    className={`${getStatusColor(packageData.status)} px-3 py-1 text-xs font-medium border rounded-full print:text-xs print:px-2 print:py-0.5`}
                                    variant="secondary"
                                >
                                    {packageData.status.replace("_", " ").toUpperCase()}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="print:pt-0">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2">
                                {/* Progress Bar */}
                                <div className="md:col-span-4">
                                    <div className="flex items-center justify-between mb-1 print:mb-0.5">
                                        <span className="text-xs font-medium text-gray-600 print:text-xs">Delivery Progress</span>
                                        <span className="text-xs font-bold text-blue-600 print:text-xs">{progress}% Complete</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden print:h-1.5">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-1000 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Package Info */}
                                <div className="space-y-2 print:space-y-1">
                                    <div className="flex items-center gap-2">
                                        <PackageIcon className="h-4 w-4 text-blue-600 print:h-3.5 w-3.5" />
                                        <div>
                                            <p className="text-xs font-medium text-gray-600 print:text-xs">Package ID</p>
                                            <p className="font-mono font-medium text-base print:text-sm">{packageData.package_id}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sender Info */}
                                <div className="space-y-2 print:space-y-1">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-green-600 print:h-3.5 w-3.5" />
                                        <div>
                                            <p className="text-xs font-medium text-gray-600 print:text-xs">Sender</p>
                                            <p className="font-medium text-sm print:text-xs">{packageData.sender_name}</p>
                                            <p className="text-xs text-gray-500 print:text-xs">{packageData.sender_phone}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Receiver Info */}
                                <div className="space-y-2 print:space-y-1">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-purple-600 print:h-3.5 w-3.5" />
                                        <div>
                                            <p className="text-xs font-medium text-gray-600 print:text-xs">Receiver</p>
                                            <p className="font-medium text-sm print:text-xs">{packageData.receiver_name}</p>
                                            <p className="text-xs text-gray-500 print:text-xs">{packageData.receiver_phone}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Route Info */}
                                <div className="space-y-2 print:space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Navigation className="h-4 w-4 text-orange-600 print:h-3.5 w-3.5" />
                                        <div>
                                            <p className="text-xs font-medium text-gray-600 print:text-xs">Distance</p>
                                            <p className="font-bold text-base print:text-sm">{formatDistance(routeDistance)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:gap-4 print:grid-cols-1 print:lg:grid-cols-3">
                        {/* Main Content - Map and Timeline */}
                        <div className="lg:col-span-2 space-y-6 print:space-y-4">
                            {/* Real-time Map */}
                            <Card className="rounded-xl border shadow-md print:border-none print:shadow-none">
                                <CardHeader className="print:pb-2">
                                    <CardTitle className="flex items-center gap-2 text-xl print:text-lg">
                                        <MapPin className="h-5 w-5 print:h-4 w-4" />
                                        Live Location Tracking
                                    </CardTitle>
                                    <CardDescription className="space-y-2 text-sm print:text-xs print:space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse print:animate-none print:w-2 h-2"></div>
                                            <span className="font-medium text-green-700">
                                                🔴 Live Tracking Active
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <span>
                                                {currentLocation
                                                    ? `Last updated: ${new Date(currentLocation.lastUpdated).toLocaleString()}`
                                                    : "Waiting for GPS data..."}
                                            </span>
                                        </div>
                                        {currentLocation && (
                                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded-md border border-blue-200 print:p-1 print:border print:text-xs">
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0 print:h-3.5 w-3.5" />
                                                    <div className="flex-1">
                                                        {currentLocation.address ? (
                                                            <>
                                                                <p className="text-sm font-medium text-gray-800 mb-0.5 print:text-xs print:mb-0">
                                                                    📍 {currentLocation.address}
                                                                </p>
                                                                <p className="text-xs text-gray-600 font-mono print:text-xs">
                                                                    GPS: {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <p className="text-sm font-medium text-gray-800 font-mono print:text-xs">
                                                                📍 {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
                                                            </p>
                                                        )}
                                                        {currentLocation.vehicleId && (
                                                            <p className="text-xs text-blue-600 font-medium mt-0.5 print:text-xs print:mt-0">
                                                                Vehicle: {currentLocation.vehicleId}
                                                            </p>
                                                        )}
                                                        {currentLocation.battery_level !== undefined && (
                                                            <p className="text-xs text-green-600 font-medium mt-0.5 print:text-xs print:mt-0">
                                                                🔋 Battery: {currentLocation.battery_level}%
                                                            </p>
                                                        )}
                                                        {currentLocation.device_status && (
                                                            <p className="text-xs text-purple-600 font-medium mt-0.5 print:text-xs print:mt-0">
                                                                📡 Status: {currentLocation.device_status}
                                                            </p>
                                                        )}
                                                        {currentLocation.signal_strength !== undefined && (
                                                            <p className="text-xs text-orange-600 font-medium mt-0.5 print:text-xs print:mt-0">
                                                                📶 Signal: {currentLocation.signal_strength} dBm
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {estimatedTime && (
                                            <div className="flex items-center gap-2 text-sm font-medium text-green-600 bg-green-50 p-2 rounded-md print:text-xs print:p-1">
                                                <Clock className="h-4 w-4 print:h-3.5 w-3.5" />
                                                Estimated delivery: {Math.round(estimatedTime / 60)} minutes
                                            </div>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0 print:hidden"> {/* Hide map on print, as it may not fit well on paper */}
                                    <div className="h-80 rounded-b-xl overflow-hidden lg:h-96">
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
                                <CardContent className="hidden print:block pt-2"> {/* Print-friendly alternative for map */}
                                    <p className="text-sm text-gray-600 italic">Map view not available in print mode. Please view online for interactive map.</p>
                                </CardContent>
                            </Card>

                        </div>

                        {/* Sidebar - Package Details */}
                        <div className="space-y-6 print:space-y-4">
                            {/* Package Details Card */}
                            <Card className="rounded-xl border shadow-md print:border-none print:shadow-none">
                                <CardHeader className="print:pb-2">
                                    <CardTitle className="flex items-center gap-2 text-xl print:text-lg">
                                        <PackageIcon className="h-5 w-5 print:h-4 w-4" />
                                        Package Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 print:space-y-2 print:pt-0">
                                    <div className="grid grid-cols-2 gap-3 print:gap-2">
                                        <div>
                                            <p className="text-xs font-medium text-gray-600 print:text-xs">Created</p>
                                            <p className="text-sm print:text-xs">{formatDate(packageData.created_at)}</p>
                                        </div>
                                        {packageData.delivered_at && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-600 print:text-xs">Delivered</p>
                                                <p className="text-sm print:text-xs">{formatDate(packageData.delivered_at)}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Location History with Geocoding */}
                                    {locationHistory.length > 0 && (
                                        <div className="pt-3 border-t print:pt-2">
                                            <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-2 print:text-xs print:mb-1">
                                                <MapPin className="h-4 w-4 print:h-3.5 w-3.5" />
                                                Recent Locations
                                            </p>
                                            <div className="space-y-2 print:space-y-1">
                                                {locationHistory.map((loc, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md border border-blue-100 print:p-1 print:text-xs print:border-none print:bg-none">
                                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-sm print:w-6 h-6 print:shadow-none">
                                                            <Navigation className="h-4 w-4 text-white print:h-3.5 w-3.5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-800 mb-0.5 print:text-xs print:mb-0">
                                                                {loc.address ? (
                                                                    <span className="flex items-center gap-1">
                                                                        📍 {loc.address}
                                                                    </span>
                                                                ) : (
                                                                    <span className="font-mono">
                                                                        {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                                                                    </span>
                                                                )}
                                                            </p>
                                                            {loc.address && (
                                                                <p className="text-xs text-gray-600 font-mono mb-0.5 print:text-xs print:mb-0">
                                                                    Coordinates: {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 print:text-xs print:gap-1">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3 print:h-2.5 w-2.5" />
                                                                    {new Date(loc.lastUpdated).toLocaleTimeString()}
                                                                </span>
                                                                {loc.speed && (
                                                                    <span className="flex items-center gap-1 text-green-600 font-medium">
                                                                        <Truck className="h-3 w-3 print:h-2.5 w-2.5" />
                                                                        {(loc.speed * 3.6).toFixed(1)} km/h
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Contact Information */}
                            <Card className="rounded-xl border shadow-md print:hidden">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <Phone className="h-5 w-5" />
                                        Contact Support
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Need help with your shipment? Contact our support team.
                                    </p>
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">
                                        <Phone className="mr-2 h-4 w-4" />
                                        Contact Support
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* No Data State */}
            {!loading && !error && !packageData && trackingNumber && (
                <Card className="rounded-xl border shadow-md text-center py-12 print:py-8">
                    <CardContent>
                        <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 print:w-12 h-12 print:mb-2">
                                <Search className="h-8 w-8 text-gray-400 print:h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2 print:text-lg print:mb-1">No Package Found</h3>
                            <p className="text-gray-600 mb-4 text-sm print:text-xs print:mb-2">
                                We couldn't find a package with that tracking ID. Please check your package ID and try again.
                            </p>
                            <Button 
                                onClick={() => setTrackingNumber("")}
                                variant="outline"
                                className="rounded-lg text-sm print:text-xs"
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