import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"

export async function GET(request: NextRequest, { params }: { params: { trackingNumber: string } }) {
    try {
        const { trackingNumber } = params
        console.log("GET /api/tracking/:trackingNumber", { trackingNumber })

        if (!trackingNumber) {
            return NextResponse.json({ error: "Tracking number is required" }, { status: 400 })
        }

        // Get package details
        const packageResult = await sql`
      SELECT * FROM packages WHERE package_id = ${trackingNumber}
    `
        console.log("Package query result count:", packageResult?.length)

        if (packageResult.length === 0) {
            return NextResponse.json({ error: "Package not found" }, { status: 404 })
        }

        const packageData = packageResult[0]
        console.log("Package row status:", packageData?.status)

        // Check payment status (informational, don't block tracking)
        const paymentResult = await sql`
      SELECT * FROM payments WHERE package_id = ${trackingNumber}
    `
        console.log("Payment check:", { found: paymentResult.length, trackingNumber })
        const paymentStatus = paymentResult.length > 0 ? paymentResult[0].payment_status : 'pending'
        const paymentConfirmed = paymentResult.some(p => p.payment_status === 'confirmed')

        // Check delivery time using UTC epoch comparison
        const now = Date.now()
        const deliveryTs = packageData.delivery_time ? Date.parse(packageData.delivery_time) : null
        console.log("Delivery time check:", { now, deliveryTs, delivery_time: packageData.delivery_time, willBlock: deliveryTs && deliveryTs > now })
        if (deliveryTs && deliveryTs > now) {
            return NextResponse.json({
                error: "Scheduled for later",
                scheduledTime: packageData.delivery_time,
                state: "scheduled"
            }, { status: 400 })
        }

        // Fetch origin and destination branches
        const originBranch = await sql`
      SELECT * FROM branches WHERE branch_id = ${packageData.origin_branch_id}
    `
        const destBranch = await sql`
      SELECT * FROM branches WHERE branch_id = ${packageData.destination_branch_id}
    `
        if (originBranch.length === 0 || destBranch.length === 0) {
            return NextResponse.json({ error: "Branch information not found" }, { status: 404 })
        }

        // Get route from LocationIQ (uses longitude,latitude order)
        let routeData = null
        let routePolyline = null
        let estimatedTime = null
        let routeDistance = null
        const apiKey = process.env.LOCATIONIQ_API_KEY

        if (apiKey) {
            try {
                const url = `https://us1.locationiq.com/v1/directions/driving/${originBranch[0].longitude},${originBranch[0].latitude};${destBranch[0].longitude},${destBranch[0].latitude}?key=${apiKey}&overview=full&geometries=geojson`
                const response = await fetch(url)
                if (response.ok) {
                    routeData = await response.json()
                    const route = routeData?.routes?.[0]
                    if (route) {
                        estimatedTime = route.duration // in seconds
                        routeDistance = route.distance // in meters
                        routePolyline = route.geometry // GeoJSON coordinates
                        console.log("🗺️ Route calculated:", {
                            distance: `${(routeDistance / 1000).toFixed(2)} km`,
                            duration: `${Math.round(estimatedTime / 60)} min`
                        })
                    }
                }
            } catch (error) {
                console.error("LocationIQ routing error:", error)
            }
        }

        // Fetch realtime location from Firebase - use vehicle assigned to package
        let realTimeLocation = null
        let locationHistory: any[] = []
        let vehicleId = packageData.assigned_car || null

        // If no vehicle assigned, try to get from latest tracking entry
        if (!vehicleId) {
            const vehicleCheck = await sql`
                SELECT assigned_vehicle_id, vehicle_id FROM tracking 
                WHERE package_id = ${packageData.package_id} 
                AND (assigned_vehicle_id IS NOT NULL OR vehicle_id IS NOT NULL)
                ORDER BY created_at DESC 
                LIMIT 1
            `
            vehicleId = vehicleCheck[0]?.assigned_vehicle_id || vehicleCheck[0]?.vehicle_id || 'CAR001'
        }

        console.log("Vehicle lookup:", { packageVehicle: packageData.assigned_car, resolvedVehicle: vehicleId })

        try {
            const { database } = await import("@/lib/firebase")
            const locationRef = database.ref(`location_history/${vehicleId}`)

            // Get last 4 location entries for history
            const snapshot = await locationRef.limitToLast(4).once("value")
            const locationData = snapshot.val()

            if (locationData) {
                const keys = Object.keys(locationData)
                const allLocations = keys.map(key => ({
                    ...locationData[key],
                    key: key
                })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

                // Get the latest location
                const latestLocation = allLocations[0]

                // Validate timestamp
                const timestamp = latestLocation.timestamp || Date.now()
                const timestampDate = new Date(timestamp)
                const isValidDate = !isNaN(timestampDate.getTime())

                // Reverse geocode current location using LocationIQ
                let address = null
                if (apiKey) {
                    try {
                        const geocodeUrl = `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${latestLocation.latitude}&lon=${latestLocation.longitude}&format=json`
                        const geocodeResponse = await fetch(geocodeUrl)
                        if (geocodeResponse.ok) {
                            const geocodeData = await geocodeResponse.json()
                            address = geocodeData.display_name || null
                            console.log("📍 Geocoded address:", address)
                        }
                    } catch (error) {
                        console.error("Geocoding error:", error)
                    }
                }

                realTimeLocation = {
                    latitude: latestLocation.latitude,
                    longitude: latestLocation.longitude,
                    accuracy: latestLocation.accuracy,
                    heading: latestLocation.heading,
                    speed: latestLocation.speed,
                    timestamp: timestamp,
                    lastUpdated: isValidDate ? timestampDate.toISOString() : new Date().toISOString(),
                    vehicleId: vehicleId,
                    address: address,
                }

                // Prepare location history (last 4 points)
                locationHistory = allLocations.map(loc => {
                    const ts = loc.timestamp || Date.now()
                    const tsDate = new Date(ts)
                    return {
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        timestamp: ts,
                        lastUpdated: !isNaN(tsDate.getTime()) ? tsDate.toISOString() : new Date().toISOString(),
                        accuracy: loc.accuracy,
                        speed: loc.speed,
                        heading: loc.heading,
                    }
                })

                console.log("📍 Real-time location found:", {
                    lat: realTimeLocation.latitude,
                    lon: realTimeLocation.longitude,
                    vehicleId,
                    address,
                    historyCount: locationHistory.length,
                    lastUpdated: realTimeLocation.lastUpdated
                })
            }
        } catch (error) {
            console.log("No real-time location available:", error)
        }
        const hasRealtime = !!realTimeLocation
        console.log("Realtime presence:", { hasRealtime, vehicleId })

        // Check both package status and latest tracking status to reduce false negatives
        const latestRow = await sql`
      SELECT status, progress_percentage FROM tracking WHERE package_id = ${packageData.package_id} ORDER BY created_at DESC LIMIT 1
    `
        console.log("Latest tracking row:", latestRow?.[0])

        const pkgStatus = String(packageData.status || '').trim().toLowerCase()
        const latestStatus = String(latestRow?.[0]?.status || '').trim().toLowerCase()
        const allowed = new Set(['registered', 'in_transit', 'out_for_delivery'])
        console.log("Status check:", { pkgStatus, latestStatus, allowedStatuses: Array.from(allowed), hasRealtime })

        // Determine if car is on route
        let isOnRoute = false
        if (realTimeLocation) {
            // For simplicity, assume on route if realtime location is available
            // In production, implement proper route matching logic
            isOnRoute = true
        }

        // Get progress
        const progress = latestRow?.[0]?.progress_percentage || 0

        if (!hasRealtime && !allowed.has(pkgStatus)) {
            console.warn("Blocking tracking fetch due to status (no realtime either):", {
                packageStatus: packageData.status,
                latestTrackingStatus: latestRow?.[0]?.status || null,
                hasRealtime,
            })
            return NextResponse.json({
                error: "Package not yet packed in car",
                packageStatus: packageData.status,
                latestTrackingStatus: latestRow?.[0]?.status || null,
                hasRealtime,
            }, { status: 400 })
        }

        // Get tracking history
        const trackingHistory = await sql`
      SELECT * FROM tracking 
      WHERE package_id = ${packageData.package_id} 
      ORDER BY created_at ASC
    `

        // realTimeLocation already fetched above
        // Sanitize PII for public tracking
        const sanitizedPackage = {
            ...packageData,
            sender_phone: packageData.sender_phone?.replace(/(\+\d{3})\d{5}(\d{2,})/, "$1*****$2"),
            receiver_phone: packageData.receiver_phone?.replace(/(\+\d{3})\d{5}(\d{2,})/, "$1*****$2"),
        }

        console.log("Returning tracking payload", { trackingCount: trackingHistory?.length ?? 0, hasCurrentLocation: !!realTimeLocation })
        return NextResponse.json({
            success: true,
            package: sanitizedPackage,
            tracking: trackingHistory,
            currentLocation: realTimeLocation,
            locationHistory,
            originBranch: originBranch[0],
            destinationBranch: destBranch[0],
            route: routeData,
            routePolyline,
            routeDistance,
            estimatedTime,
            isOnRoute,
            progress,
            paymentStatus,
            paymentConfirmed,
        })
    } catch (error) {
        console.error("Tracking error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
