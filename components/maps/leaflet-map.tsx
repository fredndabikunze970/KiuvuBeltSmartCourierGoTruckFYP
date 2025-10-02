"use client"

import L from "leaflet"
import "leaflet/dist/leaflet.css"
import dynamic from "next/dynamic"
import { useEffect, useRef } from "react"

// Create a dynamic version of the LeafletMap component that only loads on the client side
const DynamicLeafletMap = dynamic(() => Promise.resolve(LeafletMap), {
  ssr: false, // This will disable server-side rendering for this component
})

// Fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
})

interface MapProps {
  center: [number, number]
  zoom?: number
  markers?: Array<{
    position: [number, number]
    popup?: string
    isActive?: boolean
  }>
  className?: string
}

export function LeafletMap({ center, zoom = 13, markers = [], className = "" }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map
    const map = L.map(mapRef.current).setView(center, zoom)

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [center, zoom])

  useEffect(() => {
    if (!mapInstanceRef.current) return

    const map = mapInstanceRef.current

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })

    // Add new markers
    markers.forEach(({ position, popup, isActive }) => {
      const customIcon = L.divIcon({
        className: `custom-marker ${isActive ? "active pulse" : ""}`,
        html: `<div class="marker-inner">
          <div class="marker-pin"></div>
          ${isActive ? '<div class="marker-pulse"></div>' : ''}
        </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      })

      const marker = L.marker(position, { icon: customIcon })

      if (popup) {
        marker.bindPopup(
          `<div class="custom-popup">
            <div class="popup-content">
              ${popup}
            </div>
          </div>`,
          {
            className: 'custom-popup-wrapper',
            closeButton: true,
          }
        )
      }

      // Add marker with animation
      marker.addTo(map)
      const element = marker.getElement()
      if (element) {
        element.style.opacity = '0'
        element.style.transform = 'translateY(-20px)'
        setTimeout(() => {
          element.style.transition = 'all 0.3s ease-out'
          element.style.opacity = '1'
          element.style.transform = 'translateY(0)'
        }, 100)
      }
    })
  }, [markers])

  return <div ref={mapRef} className={`leaflet-container ${className}`} />
}
