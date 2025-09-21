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
  } | null
  tracking: TrackingEntry[]
  senderAddress: string
  receiverAddress: string
}

export function TrackingMap({
  packageId,
  currentLocation,
  tracking,
  senderAddress,
  receiverAddress,
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
            <strong>Current Location</strong><br/>
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

    // Draw route line
    if (routePoints.length > 1) {
      window.L.polyline(routePoints, {
        color: "#8b5cf6",
        weight: 3,
        opacity: 0.8,
        dashArray: "5, 10",
      }).addTo(map)
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
  }, [isLoaded, currentLocation, tracking, packageId])

  const getMarkerColor = (status: string) => {
    switch (status) {
      case "registered":
        return "#6b7280"
      case "picked_up":
        return "#eab308"
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
