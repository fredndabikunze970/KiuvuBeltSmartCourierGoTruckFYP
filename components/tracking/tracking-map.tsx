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

    // Layer groups to update incrementally without destroying the map
    const branchGroupRef = useRef<any>(null)
    const trackingGroupRef = useRef<any>(null)
    const routeGroupRef = useRef<any>(null)
    const historyGroupRef = useRef<any>(null)

    // Current marker ref for smooth updates
    const currentMarkerRef = useRef<any>(null)
    const currentAnimRef = useRef<number | null>(null)
    const lastLatLngRef = useRef<{ lat: number; lng: number } | null>(null)

    const [isLoaded, setIsLoaded] = useState(false)
    const [loadingProgress, setLoadingProgress] = useState(0)

    // Utility: create styled divIcon
    const createCustomIcon = (html: string, size: number, className: string) => {
        return window.L.divIcon({
            className: `custom-marker ${className}`,
            html: html,
            iconSize: [size, size],
            iconAnchor: [size / 2, size],
            popupAnchor: [0, -size]
        })
    }

    const getMarkerColor = (status: string) => {
        const colors = {
            registered: { background: "#9E9E9E" },
            picked_up: { background: "#FBBC04" },  // Google yellow
            in_transit: { background: "#7C3AED" },
            out_for_delivery: { background: "#EA4335" },  // Google red
            delivered: { background: "#34A853" },  // Google green
            cancelled: { background: "#EA4335" },
        }
        return (colors as any)[status] || colors.registered
    }

    // Load Leaflet and plugin assets
    useEffect(() => {
        const loadLeaflet = async () => {
            if (typeof window === "undefined") return

            const progressInterval = setInterval(() => {
                setLoadingProgress(prev => Math.min(prev + 10, 90))
            }, 100)

            if (!document.querySelector('link[href*="leaflet.css"]')) {
                const link = document.createElement("link")
                link.rel = "stylesheet"
                link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                link.crossOrigin = ""
                document.head.appendChild(link)
            }

            if (!document.querySelector('link[href*="Control.FullScreen.css"]')) {
                const fsLink = document.createElement("link")
                fsLink.rel = "stylesheet"
                fsLink.href = "https://unpkg.com/leaflet.fullscreen@2.4.0/Control.FullScreen.css"
                document.head.appendChild(fsLink)
            }

            const loadFullscreenPlugin = (progressInterval: NodeJS.Timeout) => {
                // @ts-ignore
                if (!window.L.control.fullscreen) {
                    const fsScript = document.createElement("script")
                    fsScript.src = "https://unpkg.com/leaflet.fullscreen@2.4.0/Control.FullScreen.js"
                    fsScript.onload = () => {
                        clearInterval(progressInterval)
                        setLoadingProgress(100)
                        setTimeout(() => setIsLoaded(true), 300)
                    }
                    document.head.appendChild(fsScript)
                } else {
                    clearInterval(progressInterval)
                    setLoadingProgress(100)
                    setTimeout(() => setIsLoaded(true), 300)
                }
            }

            if (!(window as any).L) {
                const script = document.createElement("script")
                script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
                script.crossOrigin = ""
                script.onload = () => loadFullscreenPlugin(progressInterval as any)
                document.head.appendChild(script)
            } else {
                loadFullscreenPlugin(progressInterval as any)
            }
        }

        loadLeaflet()
    }, [])

    // Initialize map once
    useEffect(() => {
        if (!isLoaded || !mapRef.current || !(window as any).L || mapInstanceRef.current) return

        // Initialize map centered on Kigali, Rwanda
        const map = window.L.map(mapRef.current, {
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            boxZoom: true,
            keyboard: true,
            dragging: true,
            attributionControl: true
        }).setView([-1.9441, 30.0619], 10)

        // Base layers
        const streetMap = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
            maxZoom: 19,
        })
        const satelliteMap = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19,
        })
        streetMap.addTo(map)
        window.L.control.layers({ "Street Map": streetMap, "Satellite": satelliteMap }).addTo(map)
        window.L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map)

        // Create and attach layer groups
        branchGroupRef.current = window.L.layerGroup().addTo(map)
        trackingGroupRef.current = window.L.layerGroup().addTo(map)
        routeGroupRef.current = window.L.layerGroup().addTo(map)
        historyGroupRef.current = window.L.layerGroup().addTo(map)

        mapInstanceRef.current = map

        return () => {
            if (currentAnimRef.current) cancelAnimationFrame(currentAnimRef.current)
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
            currentMarkerRef.current = null
            lastLatLngRef.current = null
        }
    }, [isLoaded])

    // Render branches when they change
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || !branchGroupRef.current || !(window as any).L) return

        branchGroupRef.current.clearLayers()

        const addBranchMarker = (b: any, isDestination: boolean) => {
            if (!b) return
            const icon = createCustomIcon(`
                <div style="
                    background: linear-gradient(135deg, ${isDestination ? '#ef4444, #dc2626' : '#10b981, #059669'});
                    width: 32px;
                    height: 32px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 2px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    color: white;
                ">
                    <span style="transform: rotate(45deg);">${isDestination ? '🎯' : '🏁'}</span>
                </div>
            `, 32, isDestination ? 'destination-marker' : 'origin-marker')

            const popup = isDestination ? `
                <div style="padding: 8px; min-width: 200px; font-family: Arial, sans-serif;">
                    <h3 style="font-size: 14px; font-weight: bold; color: #dc2626; margin-bottom: 4px;">Destination Branch</h3>
                    <p style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">${b.branch_name}</p>
                    <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${b.address}</p>
                    <p style="font-size: 11px; color: #888; margin-top: 8px; border-top: 1px solid #eee; padding-top: 4px;">Delivery Location</p>
                </div>
            ` : `
                <div style="padding: 8px; min-width: 200px; font-family: Arial, sans-serif;">
                    <h3 style="font-size: 14px; font-weight: bold; color: #059669; margin-bottom: 4px;">Origin Branch</h3>
                    <p style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">${b.branch_name}</p>
                    <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${b.address}</p>
                    <p style="font-size: 11px; color: #888; margin-top: 8px; border-top: 1px solid #eee; padding-top: 4px;">Pickup Location</p>
                </div>
            `

            window.L.marker([b.latitude, b.longitude], { icon }).addTo(branchGroupRef.current).bindPopup(popup, { className: 'professional-popup' })
        }

        addBranchMarker(originBranch, false)
        addBranchMarker(destinationBranch, true)
    }, [originBranch, destinationBranch])

    // Render tracking status points
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || !trackingGroupRef.current || !(window as any).L) return

        trackingGroupRef.current.clearLayers()

        tracking.forEach((entry) => {
            if (entry.latitude && entry.longitude) {
                const iconColor = getMarkerColor(entry.status)
                const icon = createCustomIcon(`
                    <div style="
                        background: ${iconColor.background};
                        width: 24px;
                        height: 24px;
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 2px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        position: relative;
                    "></div>
                `, 24, "tracking-marker")

                const popup = `
                    <div style="padding: 8px; min-width: 200px; font-family: Arial, sans-serif;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${iconColor.background};"></div>
                            <h3 style="font-size: 14px; font-weight: bold; text-transform: capitalize;">${entry.status.replace("_", " ")}</h3>
                        </div>
                        <p style="font-size: 12px; color: #666; margin-bottom: 8px;">${entry.notes || "Status update"}</p>
                        <p style="font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 4px;">${new Date(entry.created_at).toLocaleString()}</p>
                    </div>
                `

                window.L.marker([entry.latitude, entry.longitude], { icon }).addTo(trackingGroupRef.current).bindPopup(popup, { className: 'professional-popup' })
            }
        })
    }, [tracking])

    // Render route polyline
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || !routeGroupRef.current || !(window as any).L) return

        routeGroupRef.current.clearLayers()
        if (routePolyline && routePolyline.coordinates) {
            const coords = routePolyline.coordinates.map((coord: number[]) => [coord[1], coord[0]])
            window.L.polyline(coords, {
                color: "#4285F4",
                weight: 4,
                opacity: 0.85,
                smoothFactor: 1,
                lineCap: "round",
                lineJoin: "round",
            }).addTo(routeGroupRef.current)
        }
    }, [routePolyline])

    // Render history trail and markers
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || !historyGroupRef.current || !(window as any).L) return

        historyGroupRef.current.clearLayers()

        if (locationHistory.length > 1) {
            const historyCoords = locationHistory.map(loc => [loc.latitude, loc.longitude] as [number, number])
            window.L.polyline(historyCoords, {
                color: "#34A853",
                weight: 3,
                opacity: 0.7,
                dashArray: "4 8",
                lineCap: "round",
            }).addTo(historyGroupRef.current)

            locationHistory.forEach((loc, idx) => {
                if (idx > 0) {
                    const histMarker = window.L.circleMarker([loc.latitude, loc.longitude], {
                        radius: 4,
                        fillColor: "#34A853",
                        color: "#ffffff",
                        weight: 1.5,
                        opacity: 1,
                        fillOpacity: 0.8,
                    }).addTo(historyGroupRef.current)

                    histMarker.bindPopup(`
                        <div style="padding: 8px; min-width: 180px; font-family: Arial, sans-serif;">
                            <h3 style="font-size: 13px; font-weight: bold; color: #15803d; margin-bottom: 4px;">History Point ${idx}</h3>
                            <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${new Date(loc.lastUpdated).toLocaleTimeString()}</p>
                            ${loc.speed ? `<p style="font-size: 12px; color: #15803d; font-weight: 500;">Speed: ${(loc.speed * 3.6).toFixed(1)} km/h</p>` : ''}
                        </div>
                    `, { className: 'professional-popup' })
                }
            })
        }
    }, [locationHistory])

    // Fit bounds when static layers update (or when first current location arrives)
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || !(window as any).L) return

        const bounds = window.L.latLngBounds([])

        // Rwanda bounds to constrain
        const rwandaBounds = window.L.latLngBounds([
            [-2.8406, 28.8618],
            [-1.0474, 30.8990]
        ])

        const extendGroupBounds = (group: any) => {
            if (!group) return
            // @ts-ignore
            group.eachLayer((layer: any) => {
                try {
                    if (layer.getLatLng) bounds.extend(layer.getLatLng())
                    else if (layer.getBounds) bounds.extend(layer.getBounds())
                } catch {}
            })
        }

        extendGroupBounds(branchGroupRef.current)
        extendGroupBounds(trackingGroupRef.current)
        extendGroupBounds(routeGroupRef.current)
        extendGroupBounds(historyGroupRef.current)
        if (currentLocation) bounds.extend([currentLocation.latitude, currentLocation.longitude])

        if (bounds.isValid()) {
            if (!rwandaBounds.contains(bounds)) bounds.extend(rwandaBounds)
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
        } else {
            map.fitBounds(rwandaBounds, { padding: [50, 50], maxZoom: 12 })
        }

        // Only run this "initial" fit when key static props change or first currentLocation
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [originBranch, destinationBranch, tracking, routePolyline, locationHistory, !!currentLocation])

    // Smoothly update the current location marker position
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || !(window as any).L) return

        // Destroy current marker if no location
        if (!currentLocation) {
            if (currentMarkerRef.current) {
                currentMarkerRef.current.remove()
                currentMarkerRef.current = null
                lastLatLngRef.current = null
            }
            return
        }

        const to = window.L.latLng(currentLocation.latitude, currentLocation.longitude)

        // Create marker if missing
        if (!currentMarkerRef.current) {
            const icon = createCustomIcon(`
                <div class="current-location-bounce">
                    <div style="
                        width: 28px;
                        height: 28px;
                        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 2px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        position: relative;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <span style="transform: rotate(45deg); font-size: 16px; color: white;">🚗</span>
                    </div>
                </div>
                <style>
                    .current-location-bounce { animation: bounce 1s infinite ease-in-out; }
                    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                </style>
            `, 28, "current-location-marker")

            currentMarkerRef.current = window.L.marker(to, { icon }).addTo(map).bindPopup(() => {
                return `
                    <div style="padding: 8px; min-width: 220px; font-family: Arial, sans-serif;">
                        <h3 style="font-size: 14px; font-weight: bold; color: #1d4ed8; margin-bottom: 8px;">Current Location</h3>
                        ${currentLocation.vehicleId ? `<p style="font-size: 12px; margin-bottom: 4px;"><strong>Vehicle:</strong> ${currentLocation.vehicleId}</p>` : ''}
                        ${currentLocation.address ? `<p style="font-size: 12px; color: #666; margin-bottom: 8px;">${currentLocation.address}</p>` : ''}
                        <p style="font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 4px;">
                            Live GPS Position<br>
                            Updated: ${new Date(currentLocation.lastUpdated).toLocaleString()}
                        </p>
                    </div>
                `
            }, { className: 'professional-popup' })

            lastLatLngRef.current = { lat: to.lat, lng: to.lng }
            return
        }

        // Update popup content (address/updated time may change)
        try {
            const popup = currentMarkerRef.current.getPopup()
            if (popup) {
                popup.setContent(`
                    <div style="padding: 8px; min-width: 220px; font-family: Arial, sans-serif;">
                        <h3 style="font-size: 14px; font-weight: bold; color: #1d4ed8; margin-bottom: 8px;">Current Location</h3>
                        ${currentLocation.vehicleId ? `<p style="font-size: 12px; margin-bottom: 4px;"><strong>Vehicle:</strong> ${currentLocation.vehicleId}</p>` : ''}
                        ${currentLocation.address ? `<p style="font-size: 12px; color: #666; margin-bottom: 8px;">${currentLocation.address}</p>` : ''}
                        <p style="font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 4px;">
                            Live GPS Position<br>
                            Updated: ${new Date(currentLocation.lastUpdated).toLocaleString()}
                        </p>
                    </div>
                `)
            }
        } catch {}

        const from = lastLatLngRef.current ? window.L.latLng(lastLatLngRef.current.lat, lastLatLngRef.current.lng) : currentMarkerRef.current.getLatLng()
        const duration = 1000 // ms

        // Cancel any in-flight animation
        if (currentAnimRef.current) cancelAnimationFrame(currentAnimRef.current)

        const start = performance.now()
        const animate = (t: number) => {
            const elapsed = t - start
            const p = Math.min(elapsed / duration, 1)
            const lat = from.lat + (to.lat - from.lat) * p
            const lng = from.lng + (to.lng - from.lng) * p
            currentMarkerRef.current!.setLatLng([lat, lng])
            if (p < 1) {
                currentAnimRef.current = requestAnimationFrame(animate)
            } else {
                lastLatLngRef.current = { lat: to.lat, lng: to.lng }
                currentAnimRef.current = null
            }
        }

        currentAnimRef.current = requestAnimationFrame(animate)
    }, [currentLocation])

    if (!isLoaded) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
                <div className="text-center space-y-3">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                        <div 
                            className="absolute inset-0 border-4 border-blue-600 rounded-full animate-spin"
                            style={{
                                borderTopColor: 'transparent',
                                borderRightColor: 'transparent',
                                borderBottomColor: 'transparent',
                            }}
                        ></div>
                    </div>
                    <p className="text-sm font-medium text-gray-600">Loading Map...</p>
                    <div className="w-32 bg-gray-200 rounded-full h-1.5">
                        <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${loadingProgress}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div 
            ref={mapRef} 
            className="w-full h-full rounded-xl shadow-md border border-gray-200"
            style={{ minHeight: '400px' }}
        />
    )
}