"use client"

import { MapPin, Navigation, Clock, Activity, Map } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface LocationHistoryItem {
    latitude: number
    longitude: number
    lastUpdated: string
    speed?: number
    heading?: number
    accuracy?: number
    address?: string | null
}

interface ProfessionalLocationHistoryProps {
    locationHistory: LocationHistoryItem[]
}

export function ProfessionalLocationHistory({ locationHistory }: ProfessionalLocationHistoryProps) {
    if (!locationHistory || locationHistory.length === 0) {
        return (
            <Card className="rounded-2xl border-2 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        Location History
                    </CardTitle>
                    <CardDescription>GPS tracking checkpoints with geocoded addresses</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                    <Map className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No location history available yet</p>
                    <p className="text-xs text-gray-400 mt-1">GPS data will appear here when tracking starts</p>
                </CardContent>
            </Card>
        )
    }

    const formatSpeed = (speed?: number) => {
        if (!speed || speed === 0) return { value: "0", unit: "km/h", color: "text-gray-400" }
        const kmh = speed * 3.6
        return {
            value: kmh.toFixed(1),
            unit: "km/h",
            color: kmh > 50 ? "text-green-600" : kmh > 20 ? "text-blue-600" : "text-orange-600"
        }
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return {
            time: date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }),
            date: date.toLocaleDateString([], {
                month: 'short',
                day: 'numeric'
            })
        }
    }

    const formatCoordinates = (lat: number, lon: number) => {
        return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
    }

    const getAccuracyColor = (accuracy?: number) => {
        if (!accuracy) return "bg-gray-200 text-gray-700"
        if (accuracy < 10) return "bg-green-100 text-green-700"
        if (accuracy < 50) return "bg-blue-100 text-blue-700"
        return "bg-orange-100 text-orange-700"
    }

    return (
        <Card className="rounded-2xl border-2 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    Location History
                </CardTitle>
                <CardDescription>
                    {locationHistory.length} GPS checkpoints • Real-time tracking with geocoded addresses
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {locationHistory.map((location, index) => {
                        const speedData = formatSpeed(location.speed)
                        const timeData = formatTime(location.lastUpdated)
                        const isCurrent = index === 0

                        return (
                            <div
                                key={index}
                                className={`relative p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-md ${isCurrent
                                        ? "bg-blue-50 border-blue-400 shadow-lg"
                                        : "bg-white border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                {/* Current Location Badge */}
                                {isCurrent && (
                                    <div className="absolute -top-3 left-4">
                                        <Badge className="bg-blue-600 text-white px-3 py-1 shadow-md">
                                            <Activity className="h-3 w-3 mr-1 inline animate-pulse" />
                                            Current Location
                                        </Badge>
                                    </div>
                                )}

                                {/* Position Number for Historical Points */}
                                {!isCurrent && (
                                    <div className="absolute -top-3 left-4">
                                        <Badge variant="outline" className="bg-white px-3 py-1 shadow-sm">
                                            Checkpoint {index + 1}
                                        </Badge>
                                    </div>
                                )}

                                {/* Address */}
                                {location.address ? (
                                    <div className="mb-3 mt-2">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                                                    {location.address}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-3 mt-2">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-gray-500 italic">
                                                Address not available
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Coordinates */}
                                <div className="flex items-center gap-2 mb-3 pl-7">
                                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                    <p className="font-mono text-xs text-gray-600">
                                        {formatCoordinates(location.latitude, location.longitude)}
                                    </p>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                                    {/* Time */}
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1 mb-2">
                                            <Clock className="h-4 w-4 text-gray-500" />
                                        </div>
                                        <p className="text-xs text-gray-500 mb-1">Time</p>
                                        <p className="text-sm font-bold text-gray-900">{timeData.time}</p>
                                        <p className="text-xs text-gray-500">{timeData.date}</p>
                                    </div>

                                    {/* Speed */}
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1 mb-2">
                                            <Navigation className="h-4 w-4 text-gray-500" />
                                        </div>
                                        <p className="text-xs text-gray-500 mb-1">Speed</p>
                                        <p className={`text-sm font-bold ${speedData.color}`}>
                                            {speedData.value}
                                        </p>
                                        <p className="text-xs text-gray-500">{speedData.unit}</p>
                                    </div>

                                    {/* Accuracy */}
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1 mb-2">
                                            <Activity className="h-4 w-4 text-gray-500" />
                                        </div>
                                        <p className="text-xs text-gray-500 mb-1">Accuracy</p>
                                        {location.accuracy ? (
                                            <>
                                                <p className={`text-sm font-bold inline-block px-2 py-1 rounded ${getAccuracyColor(location.accuracy)}`}>
                                                    ±{location.accuracy.toFixed(0)}m
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-gray-400">N/A</p>
                                        )}
                                    </div>
                                </div>

                                {/* Status Indicator */}
                                {isCurrent && (
                                    <div className="mt-4 pt-3 border-t border-blue-200">
                                        <div className="flex items-center justify-center gap-2 text-xs text-blue-700">
                                            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                                            <span className="font-medium">Live GPS Tracking Active</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Summary Footer */}
                {locationHistory.length > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-gray-700">Total GPS Points</span>
                            </div>
                            <span className="font-bold text-gray-900">{locationHistory.length}</span>
                        </div>
                        {locationHistory[0]?.lastUpdated && (
                            <div className="flex items-center justify-between text-sm mt-2">
                                <span className="text-gray-500">Last Updated</span>
                                <span className="font-medium text-gray-700">
                                    {new Date(locationHistory[0].lastUpdated).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
