"use client"

import { useEffect, useRef, useState } from "react"
import type { TrackingEntry } from "@/lib/api"

interface TrackingMapProps {
    packageId: string
    currentLocation?: {
        latitude: number
        longitude: number
        timestamp: number
        lastUpdated: string
        vehicleId?: string
        address?: string
    } | null
    tracking: TrackingEntry[]
    senderAddress: string
    receiverAddress: string
    originBranch?: {
        branch_name: string
        latitude: number
        longitude: number
        address: string
    }
    destinationBranch?: {
        branch_name: string
        latitude: number
        longitude: number
        address: string
    }
    routePolyline?: any
    locationHistory?: Array<{
        latitude: number
        longitude: number
        lastUpdated: string
        speed?: number
        heading?: number
    }>
}

export function TrackingMap({
    packageId,
    currentLocation,
    tracking,
    senderAddress,
    receiverAddress,
    originBranch,
    destinationBranch,
    routePolyline,
    locationHistory = [],
}: TrackingMapProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<any>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        // Dynamically load Leaflet
        const loadLeaflet = async () => {
            if (typeof window === "undefined") return

            // Load Leaflet CSS
            if (!document.querySelector('link[href*="leaflet.css"]')) {
                const link = document.createElement("link")
                link.rel = "stylesheet"
                link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                document.head.appendChild(link)
            }

            // Load Leaflet JS
            if (!window.L) {
                const script = document.createElement("script")
                script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                script.onload = () => setIsLoaded(true)
                document.head.appendChild(script)
            } else {
                setIsLoaded(true)
            }
        }

        loadLeaflet()
    }, [])

    useEffect(() => {
        if (!isLoaded || !mapRef.current || !window.L) return

        // Initialize map
        const map = window.L.map(mapRef.current).setView([-1.9441, 30.0619], 10) // Default to Kigali

        // Add OpenStreetMap tiles
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        mapInstanceRef.current = map

        // Add markers and route
        const markers: any[] = []
        const routePoints: [number, number][] = []

        // Add origin branch marker
        if (originBranch) {
            const originMarker = window.L.marker([originBranch.latitude, originBranch.longitude])
                .addTo(map)
                .bindPopup(
                    `<div>
            <strong>📍 Origin: ${originBranch.branch_name}</strong><br/>
            ${originBranch.address}<br/>
            <small>Pickup Location</small>
          </div>`,
                )

            originMarker.setIcon(
                window.L.divIcon({
                    className: "origin-marker",
                    html: `<div style="
            background-color: #10b981; 
            width: 30px; 
            height: 30px; 
            border-radius: 50%; 
            border: 3px solid white; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          ">🏁</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                }),
            )
            markers.push(originMarker)
            routePoints.push([originBranch.latitude, originBranch.longitude])
        }

        // Add destination branch marker
        if (destinationBranch) {
            const destMarker = window.L.marker([destinationBranch.latitude, destinationBranch.longitude])
                .addTo(map)
                .bindPopup(
                    `<div>
            <strong>🎯 Destination: ${destinationBranch.branch_name}</strong><br/>
            ${destinationBranch.address}<br/>
            <small>Delivery Location</small>
          </div>`,
                )

            destMarker.setIcon(
                window.L.divIcon({
                    className: "destination-marker",
                    html: `<div style="
            background-color: #ef4444; 
            width: 30px; 
            height: 30px; 
            border-radius: 50%; 
            border: 3px solid white; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          ">🎯</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                }),
            )
            markers.push(destMarker)
            routePoints.push([destinationBranch.latitude, destinationBranch.longitude])
        }

        // Add tracking points
        tracking.forEach((entry, index) => {
            if (entry.latitude && entry.longitude) {
                const marker = window.L.marker([entry.latitude, entry.longitude])
                    .addTo(map)
                    .bindPopup(
                        `<div>
              <strong>${entry.status.replace("_", " ")}</strong><br/>
              ${entry.notes || ""}<br/>
              <small>${new Date(entry.created_at).toLocaleString()}</small>
            </div>`,
                    )

                markers.push(marker)
                routePoints.push([entry.latitude, entry.longitude])

                // Different icon colors for different statuses
                const iconColor = getMarkerColor(entry.status)
                marker.setIcon(
                    window.L.divIcon({
                        className: "custom-div-icon",
                        html: `<div style="background-color: ${iconColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10],
                    }),
                )
            }
        })

        // Add current location marker
        if (currentLocation) {
            const currentMarker = window.L.marker([currentLocation.latitude, currentLocation.longitude])
                .addTo(map)
                .bindPopup(
                    `<div>
            <strong>🚗 Current Location</strong><br/>
            ${currentLocation.vehicleId ? `Vehicle: ${currentLocation.vehicleId}<br/>` : ''}
            ${currentLocation.address ? `${currentLocation.address}<br/>` : ''}
            Live GPS Position<br/>
            <small>Updated: ${new Date(currentLocation.lastUpdated).toLocaleString()}</small>
          </div>`,
                )

            // Animated current location marker
            currentMarker.setIcon(
                window.L.divIcon({
                    className: "current-location-marker",
                    html: `<div style="
            width: 20px; 
            height: 20px; 
            background-color: #3b82f6; 
            border-radius: 50%; 
            border: 3px solid white; 
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
            animation: pulse 2s infinite;
          "></div>
          <style>
            @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
              70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
              100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
            }
          </style>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                }),
            )

            markers.push(currentMarker)
            routePoints.push([currentLocation.latitude, currentLocation.longitude])
        }

        // Draw route polyline from LocationIQ (if available)
        if (routePolyline && routePolyline.coordinates) {
            // Convert GeoJSON coordinates [lon, lat] to Leaflet format [lat, lon]
            const coords = routePolyline.coordinates.map((coord: number[]) => [coord[1], coord[0]])
            window.L.polyline(coords, {
                color: "#3b82f6",
                weight: 4,
                opacity: 0.7,
            }).addTo(map)
        } else if (routePoints.length > 1) {
            // Fallback: draw simple line through points
            window.L.polyline(routePoints, {
                color: "#8b5cf6",
                weight: 3,
                opacity: 0.8,
                dashArray: "5, 10",
            }).addTo(map)
        }

        // Draw location history trail
        if (locationHistory.length > 1) {
            const historyCoords = locationHistory.map(loc => [loc.latitude, loc.longitude] as [number, number])
            window.L.polyline(historyCoords, {
                color: "#10b981",
                weight: 2,
                opacity: 0.6,
                dashArray: "3, 6",
            }).addTo(map)

            // Add small markers for history points
            locationHistory.forEach((loc, idx) => {
                if (idx > 0) { // Skip the first one (current location)
                    const histMarker = window.L.circleMarker([loc.latitude, loc.longitude], {
                        radius: 4,
                        fillColor: "#10b981",
                        color: "#ffffff",
                        weight: 1,
                        opacity: 0.8,
                        fillOpacity: 0.6,
                    }).addTo(map)

                    histMarker.bindPopup(`
                        <div class="text-xs">
                            <strong>History Point ${idx}</strong><br/>
                            ${new Date(loc.lastUpdated).toLocaleTimeString()}<br/>
                            ${loc.speed ? `Speed: ${(loc.speed * 3.6).toFixed(1)} km/h` : ''}
                        </div>
                    `)
                }
            })
        }

        // Fit map to show all markers
        if (markers.length > 0) {
            const group = new window.L.featureGroup(markers)
            map.fitBounds(group.getBounds().pad(0.1))
        }

        // Cleanup function
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }
    }, [isLoaded, currentLocation, tracking, packageId, originBranch, destinationBranch, routePolyline, locationHistory])

    const getMarkerColor = (status: string) => {
        switch (status) {
            case "registered":
                return "#6b7280"
            case "picked_up":
                return "#f59e0b"
            case "in_transit":
                return "#8b5cf6"
            case "out_for_delivery":
                return "#f97316"
            case "delivered":
                return "#22c55e"
            case "cancelled":
                return "#ef4444"
            default:
                return "#6b7280"
        }
    }

    if (!isLoaded) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading map...</p>
                </div>
            </div>
        )
    }

    return <div ref={mapRef} className="w-full h-full rounded-lg" />
}
