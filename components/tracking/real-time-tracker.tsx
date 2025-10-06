"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LeafletMap } from "@/components/maps/leaflet-map"
import { MapPin, Navigation, Clock, Play, Pause, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LocationData {
  latitude: number
  longitude: number
  address?: string
  timestamp: number
  lastUpdated: string
  speed?: number
  accuracy?: number
}

interface RealTimeTrackerProps {
  trackingNumber: string
  packageData?: {
    sender_address: string
    receiver_address: string
    status: string
  }
}

export function RealTimeTracker({ trackingNumber, packageData }: RealTimeTrackerProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([])
  const [watchId, setWatchId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const mapRef = useRef<any>(null)

  useEffect(() => {
    // Subscribe to Firebase real-time updates using client SDK
    let unsub: (() => void) | undefined
    const setup = async () => {
      try {
        const { db } = await import("@/lib/firebase-client")
        const { ref, onValue, off } = await import("firebase/database")
        const r = ref(db, `tracking/${trackingNumber}`)
        const handler = (snapshot: any) => {
          const data = snapshot.val() as any
          if (data) {
            const loc: LocationData = {
              latitude: data.latitude,
              longitude: data.longitude,
              address: data.address,
              timestamp: data.timestamp || Date.now(),
              lastUpdated: data.lastUpdated || new Date().toISOString(),
              speed: data.speed,
              accuracy: data.accuracy,
            }
            setCurrentLocation(loc)
            setLocationHistory((prev) => [...prev.slice(-20), loc])
          }
        }
        onValue(r, handler)
        unsub = () => off(r, "value", handler)
      } catch (e) {
        console.error("Failed to subscribe to Firebase:", e)
      }
    }
    setup()
    return () => {
      if (unsub) unsub()
      stopTracking()
    }
  }, [trackingNumber])

  // Removed simulated subscription

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser")
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
          lastUpdated: new Date().toISOString(),
          speed: position.coords.speed || undefined,
          accuracy: position.coords.accuracy,
        }

        setCurrentLocation(locationData)
        setLocationHistory((prev) => [...prev.slice(-20), locationData])
        setError(null)

        // Update Firebase with real location
        updateLocationInFirebase(locationData)
      },
      (error) => {
        setError(`Location error: ${error.message}`)
        console.error("Geolocation error:", error)
      },
      options,
    )

    setWatchId(id)
    setIsTracking(true)
    toast({
      title: "GPS Tracking Started",
      description: "Real-time location tracking is now active",
    })
  }

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
    }
    setIsTracking(false)
    toast({
      title: "GPS Tracking Stopped",
      description: "Location tracking has been disabled",
    })
  }

  const updateLocationInFirebase = async (location: LocationData) => {
    try {
      await fetch("/api/tracking/location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("kivu_belt_token")}`,
        },
        body: JSON.stringify({
          trackingNumber,
          location,
        }),
      })
    } catch (error) {
      console.error("Failed to update location:", error)
    }
  }

  const clearHistory = () => {
    setLocationHistory([])
    toast({
      title: "History Cleared",
      description: "Location history has been cleared",
    })
  }

  const mapMarkers = [
    ...(currentLocation
      ? [
          {
            position: [currentLocation.latitude, currentLocation.longitude] as [number, number],
            popup: `Current Location\n${currentLocation.address || "Unknown address"}\nLast updated: ${new Date(currentLocation.timestamp).toLocaleTimeString()}`,
            isActive: true,
          },
        ]
      : []),
    ...locationHistory.slice(-5).map((loc, index) => ({
      position: [loc.latitude, loc.longitude] as [number, number],
      popup: `Historical Location ${index + 1}\n${new Date(loc.timestamp).toLocaleTimeString()}`,
      isActive: false,
    })),
  ]

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Real-time GPS Tracking
            <Badge variant={isTracking ? "default" : "secondary"}>{isTracking ? "Active" : "Inactive"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={isTracking ? stopTracking : startTracking}
              variant={isTracking ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isTracking ? (
                <>
                  <Pause className="h-4 w-4" />
                  Stop Tracking
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Tracking
                </>
              )}
            </Button>

            <Button
              onClick={clearHistory}
              variant="outline"
              disabled={locationHistory.length === 0}
              className="flex items-center gap-2 bg-transparent"
            >
              <RotateCcw className="h-4 w-4" />
              Clear History
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          {currentLocation && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card rounded-lg border">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Coordinates</div>
                <div className="font-mono text-sm">
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Last Updated</div>
                <div className="text-sm">{new Date(currentLocation.timestamp).toLocaleTimeString()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Accuracy</div>
                <div className="text-sm">
                  {currentLocation.accuracy ? `±${currentLocation.accuracy.toFixed(0)}m` : "Unknown"}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Map */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Live Location Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 rounded-lg overflow-hidden">
            <LeafletMap
              center={currentLocation ? [currentLocation.latitude, currentLocation.longitude] : [-1.9441, 30.0619]}
              zoom={15}
              markers={mapMarkers}
              className="w-full h-full"
            />
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {locationHistory.length > 0
                ? `${locationHistory.length} location updates recorded`
                : "No location data yet"}
            </span>
            <span>Package: {trackingNumber}</span>
          </div>
        </CardContent>
      </Card>

      {/* Location History */}
      {locationHistory.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Location History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {locationHistory
                .slice()
                .reverse()
                .map((location, index) => (
                  <div
                    key={location.timestamp}
                    className="flex items-center justify-between p-3 bg-card rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-mono text-sm">
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {location.address || "Address not available"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{new Date(location.timestamp).toLocaleTimeString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {location.speed ? `${location.speed.toFixed(1)} km/h` : "Speed unknown"}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
