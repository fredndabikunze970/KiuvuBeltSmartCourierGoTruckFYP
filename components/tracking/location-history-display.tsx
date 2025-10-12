"use client"

import { MapPin, Navigation, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LocationHistoryItem {
    latitude: number
    longitude: number
    lastUpdated: string
    speed?: number
    heading?: number
    accuracy?: number
    address?: string | null
}

interface LocationHistoryDisplayProps {
    locationHistory: LocationHistoryItem[]
}

export function LocationHistoryDisplay({ locationHistory }: LocationHistoryDisplayProps) {
    if (!locationHistory || locationHistory.length === 0) {
        return (
            <Card>
                <CardContent className="text-center py-8">
                    <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No location history available</p>
                </CardContent>
            </Card>
        )
    }

    const formatSpeed = (speed?: number) => {
        if (!speed) return "N/A"
        return `${(speed * 3.6).toFixed(1)} km/h`
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    const formatCoordinates = (lat: number, lon: number) => {
        return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {locationHistory.map((location, index) => (
                <Card key={index} className={index === 0 ? "border-blue-500 border-2" : ""}>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Navigation className={`h-4 w-4 ${index === 0 ? 'text-blue-600 animate-pulse' : 'text-muted-foreground'}`} />
                            {index === 0 ? "Current Location" : `Location ${index + 1}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 sm:space-y-3">
                        {/* Address */}
                        {location.address && (
                            <div className="flex items-start gap-2 text-sm sm:text-base flex-wrap">
                                <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <p className="text-foreground font-medium">{location.address}</p>
                            </div>
                        )}

                        {/* Coordinates */}
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <div className="w-4 h-4 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                            </div>
                            <p className="font-mono text-muted-foreground">
                                {formatCoordinates(location.latitude, location.longitude)}
                            </p>
                        </div>

                        {/* Time and Speed */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t sm:gap-6">
                            <div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                    <Clock className="h-3 w-3" />
                                    <span>Time</span>
                                </div>
                                <p className="text-sm font-semibold text-foreground">
                                    {formatTime(location.lastUpdated)}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                    <Navigation className="h-3 w-3" />
                                    <span>Speed</span>
                                </div>
                                <p className={`text-sm font-semibold ${location.speed && location.speed > 0
                                        ? 'text-blue-600'
                                        : 'text-muted-foreground'
                                    }`}>
                                    {formatSpeed(location.speed)}
                                </p>
                            </div>
                        </div>

                        {/* Accuracy */}
                        {location.accuracy && (
                            <div className="text-xs sm:text-sm text-muted-foreground">
                                Accuracy: ±{location.accuracy.toFixed(0)}m
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
