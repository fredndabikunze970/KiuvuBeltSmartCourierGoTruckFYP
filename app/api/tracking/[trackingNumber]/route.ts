import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { sendSMS } from "@/lib/sms"
import { formatPhoneNumber } from "@/lib/utils"

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

        // Check payment status and delivery time
        const paymentResult = await sql`
      SELECT * FROM payments WHERE package_id = ${trackingNumber}
    `
        console.log("Payment check:", { found: paymentResult.length, trackingNumber })
        const paymentStatus = paymentResult.length > 0 ? paymentResult[0].payment_status : 'pending'
        const paymentConfirmed = paymentResult.some(p => p.payment_status === 'confirmed')

        // Check if delivery time has passed - if so, allow tracking even without payment confirmation
        const now = Date.now()
        const deliveryTs = packageData.delivery_time ? Date.parse(packageData.delivery_time) : null
        const deliveryTimePassed = deliveryTs && deliveryTs <= now
        const allowTrackingWithoutPayment = deliveryTimePassed || paymentConfirmed

        console.log("Delivery time check for payment override:", {
          deliveryTs,
          now,
          deliveryTimePassed,
          paymentConfirmed,
          allowTrackingWithoutPayment
        })

        // Block tracking if payment not confirmed and delivery time not passed
        if (!allowTrackingWithoutPayment) {
            return NextResponse.json({
                error: "Tracking not available",
                message: "Payment for this package has not been confirmed and delivery time is not yet up. Tracking information is not available.",
                paymentConfirmed,
                deliveryTimePassed,
                deliveryTime: packageData.delivery_time
            }, { status: 403 })
        }

        // Check delivery time using UTC epoch comparison
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

        console.log("📍 Origin Branch:", {
            id: originBranch[0]?.branch_id,
            name: originBranch[0]?.branch_name,
            lat: originBranch[0]?.latitude,
            lon: originBranch[0]?.longitude,
            address: originBranch[0]?.address
        })

        console.log("🎯 Destination Branch:", {
            id: destBranch[0]?.branch_id,
            name: destBranch[0]?.branch_name,
            lat: destBranch[0]?.latitude,
            lon: destBranch[0]?.longitude,
            address: destBranch[0]?.address
        })

        if (originBranch.length === 0 || destBranch.length === 0) {
            return NextResponse.json({ error: "Branch information not found" }, { status: 404 })
        }

        // Get route from LocationIQ (uses longitude,latitude order)
        let routeData = null
        let routePolyline = null
        let estimatedTime = null
        let routeDistance = null
        const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY

        console.log("🔑 API Key check:", {
            hasKey: !!apiKey,
            keyLength: apiKey?.length,
            keyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT FOUND'
        })

        if (apiKey) {
            try {
                const url = `https://us1.locationiq.com/v1/directions/driving/${originBranch[0].longitude},${originBranch[0].latitude};${destBranch[0].longitude},${destBranch[0].latitude}?key=${apiKey}&overview=full&geometries=geojson`

                console.log("🗺️ Fetching route from LocationIQ:", {
                    from: `${originBranch[0].branch_name} (${originBranch[0].longitude}, ${originBranch[0].latitude})`,
                    to: `${destBranch[0].branch_name} (${destBranch[0].longitude}, ${destBranch[0].latitude})`,
                    url: url.replace(apiKey, 'API_KEY_HIDDEN')
                })

                const response = await fetch(url)

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error("❌ LocationIQ routing error response:", response.status, errorText)
                } else {
                    routeData = await response.json()
                    console.log("📦 LocationIQ Response:", JSON.stringify(routeData, null, 2))

                    const route = routeData?.routes?.[0]
                    if (route) {
                        estimatedTime = route.duration // in seconds
                        routeDistance = route.distance // in meters
                        routePolyline = route.geometry // GeoJSON coordinates
                        console.log("✅ Route calculated successfully:", {
                            distance: `${(routeDistance / 1000).toFixed(2)} km`,
                            duration: `${Math.round(estimatedTime / 60)} min`,
                            coordinatesCount: routePolyline?.coordinates?.length || 0,
                            polyline: routePolyline
                        })
                    } else {
                        console.error("❌ No route found in response:", routeData)
                    }
                }
            } catch (error) {
                console.error("❌ LocationIQ routing error:", error)
            }
        } else {
            console.warn("⚠️ LocationIQ API key not configured")
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

        console.log("🚗 Vehicle lookup:", { packageVehicle: packageData.assigned_car, resolvedVehicle: vehicleId })

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

                // Validate and fix timestamp (Firebase might store in seconds, not milliseconds)
                let timestamp = latestLocation.timestamp || Date.now()

                // If timestamp is too small (less than year 2000), it's probably in seconds
                if (timestamp < 946684800000) { // Jan 1, 2000 in milliseconds
                    timestamp = timestamp * 1000 // Convert seconds to milliseconds
                    console.log("🕐 Converting timestamp from seconds to milliseconds:", {
                        original: latestLocation.timestamp,
                        converted: timestamp
                    })
                }

                const timestampDate = new Date(timestamp)
                const isValidDate = !isNaN(timestampDate.getTime())

                // Reverse geocode current location using LocationIQ
                let address = null
                if (apiKey) {
                    try {
                        const geocodeUrl = `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${latestLocation.latitude}&lon=${latestLocation.longitude}&format=json`

                        console.log("🔍 Geocoding location:", {
                            lat: latestLocation.latitude,
                            lon: latestLocation.longitude
                        })

                        const geocodeResponse = await fetch(geocodeUrl)

                        if (!geocodeResponse.ok) {
                            const errorText = await geocodeResponse.text()
                            console.error("❌ Geocoding error response:", geocodeResponse.status, errorText)
                        } else {
                            const geocodeData = await geocodeResponse.json()
                            console.log("📦 Geocoding Response:", JSON.stringify(geocodeData, null, 2))
                            address = geocodeData.display_name || null
                            console.log("✅ Geocoded address:", address)
                        }
                    } catch (error) {
                        console.error("❌ Geocoding error:", error)
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

                // Prepare location history (last 4 points) with geocoding
                const geocodePromises = allLocations.map(async (loc, idx) => {
                    let ts = loc.timestamp || Date.now()

                    // Fix timestamp if in seconds
                    if (ts < 946684800000) {
                        ts = ts * 1000
                    }

                    const tsDate = new Date(ts)

                    // Geocode this location
                    let locationAddress = null
                    if (apiKey && loc.latitude && loc.longitude) {
                        try {
                            const geocodeUrl = `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${loc.latitude}&lon=${loc.longitude}&format=json`
                            const geocodeResponse = await fetch(geocodeUrl)

                            if (geocodeResponse.ok) {
                                const geocodeData = await geocodeResponse.json()
                                locationAddress = geocodeData.display_name || null
                                console.log(`📍 Geocoded history[${idx}]: ${locationAddress}`)
                            }
                        } catch (error) {
                            console.error(`❌ Error geocoding history[${idx}]:`, error)
                        }
                    }

                    return {
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        timestamp: ts,
                        lastUpdated: !isNaN(tsDate.getTime()) ? tsDate.toISOString() : new Date().toISOString(),
                        accuracy: loc.accuracy,
                        speed: loc.speed,
                        heading: loc.heading,
                        address: locationAddress,
                    }
                })

                // Wait for all geocoding to complete
                locationHistory = await Promise.all(geocodePromises)

                console.log("📊 Location history prepared:", {
                    count: locationHistory.length,
                    latest: locationHistory[0]?.lastUpdated,
                    oldest: locationHistory[locationHistory.length - 1]?.lastUpdated
                })

                console.log("✅ Real-time location found:", {
                    lat: realTimeLocation.latitude,
                    lon: realTimeLocation.longitude,
                    vehicleId,
                    address,
                    historyCount: locationHistory.length,
                    lastUpdated: realTimeLocation.lastUpdated
                })
            }
        } catch (error) {
            console.log("❌ No real-time location available:", error)
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

        // Calculate accurate progress using LocationIQ
        let progress = 0
        let distanceTraveled = 0
        let distanceRemaining = 0
        let isOnRoute = false
        let estimatedArrival = null

        if (realTimeLocation && routeDistance && apiKey) {
            try {
                // Calculate distance from origin to current location
                const currentDistanceUrl = `https://us1.locationiq.com/v1/directions/driving/${originBranch[0].longitude},${originBranch[0].latitude};${realTimeLocation.longitude},${realTimeLocation.latitude}?key=${apiKey}&overview=simplified`

                console.log("📏 Calculating distance from origin to current location...")

                const currentDistResponse = await fetch(currentDistanceUrl)
                if (currentDistResponse.ok) {
                    const currentDistData = await currentDistResponse.json()
                    const traveledRoute = currentDistData?.routes?.[0]

                    if (traveledRoute) {
                        distanceTraveled = traveledRoute.distance // in meters
                        distanceRemaining = Math.max(0, routeDistance - distanceTraveled)

                        // Calculate progress percentage
                        progress = Math.min(100, Math.max(0, (distanceTraveled / routeDistance) * 100))

                        // Check if vehicle is roughly on route (within 10% deviation)
                        const deviation = Math.abs(distanceTraveled - routeDistance)
                        isOnRoute = deviation < (routeDistance * 0.1)

                        // Calculate estimated arrival time
                        if (realTimeLocation.speed && realTimeLocation.speed > 0) {
                            // Speed is in m/s, convert to hours
                            const remainingTimeHours = (distanceRemaining / 1000) / (realTimeLocation.speed * 3.6)
                            const remainingTimeMs = remainingTimeHours * 60 * 60 * 1000
                            estimatedArrival = new Date(Date.now() + remainingTimeMs).toISOString()
                        } else if (estimatedTime && distanceTraveled > 0) {
                            // Use average speed from total route
                            const avgSpeed = routeDistance / estimatedTime // m/s
                            const remainingTimeSec = distanceRemaining / avgSpeed
                            estimatedArrival = new Date(Date.now() + (remainingTimeSec * 1000)).toISOString()
                        }

                        console.log("📊 Progress calculated:", {
                            totalDistance: `${(routeDistance / 1000).toFixed(2)} km`,
                            distanceTraveled: `${(distanceTraveled / 1000).toFixed(2)} km`,
                            distanceRemaining: `${(distanceRemaining / 1000).toFixed(2)} km`,
                            progress: `${progress.toFixed(1)}%`,
                            isOnRoute,
                            currentSpeed: realTimeLocation.speed ? `${(realTimeLocation.speed * 3.6).toFixed(1)} km/h` : 'unknown',
                            estimatedArrival
                        })
                    }
                }
            } catch (error) {
                console.error("❌ Error calculating progress:", error)
                // Fallback to database progress
                progress = latestRow?.[0]?.progress_percentage || 0
            }
        } else {
            // Fallback to database progress if no real-time location
            progress = latestRow?.[0]?.progress_percentage || 0
            console.log("⚠️ Using fallback progress from database:", progress)
        }

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

        // Send progress update SMS notifications (only once per milestone)
        const progressMilestones = [50, 80, 100]
        for (const milestone of progressMilestones) {
            if (progress >= milestone) {
                // Check if notification already sent
                const notificationCheck = await sql`
                    SELECT id FROM tracking
                    WHERE package_id = ${packageData.package_id}
                    AND status = ${`progress_${milestone}_sent`}
                    LIMIT 1
                `

                if (notificationCheck.length === 0) {
                const message = `KIVU Belt Express: Package ${packageData.package_id} is ${milestone}% complete. Track: ${process.env.NEXT_PUBLIC_API_URL}/track/${packageData.package_id}`

                    // Send to sender
                    if (packageData.sender_phone) {
                        try {
                            const formattedSenderPhone = formatPhoneNumber(packageData.sender_phone);
                            await sendSMS({
                                to: formattedSenderPhone,
                                message: `Sender Update: ${message}`,
                            })
                            console.log(`📱 Sent ${milestone}% progress SMS to sender: ${formattedSenderPhone}`)
                        } catch (error) {
                            console.error(`❌ Failed to send ${milestone}% SMS to sender:`, error)
                        }
                    }

                    // Send to receiver
                    if (packageData.receiver_phone) {
                        try {
                            const formattedReceiverPhone = formatPhoneNumber(packageData.receiver_phone);
                            await sendSMS({
                                to: formattedReceiverPhone,
                                message: `Receiver Update: ${message}`,
                            })
                            console.log(`📱 Sent ${milestone}% progress SMS to receiver: ${formattedReceiverPhone}`)
                        } catch (error) {
                            console.error(`❌ Failed to send ${milestone}% SMS to receiver:`, error)
                        }
                    }

                    // Record that notification was sent
                    await sql`
                        INSERT INTO tracking (package_id, status, location, notes, created_at)
                        VALUES (${packageData.package_id}, ${`progress_${milestone}_sent`}, 'System', 'Progress milestone SMS sent', NOW())
                    `
                    console.log(`✅ Recorded ${milestone}% progress notification sent`)
                }
            }
        }

        console.log("✅ Returning tracking payload", {
            trackingCount: trackingHistory?.length ?? 0,
            hasCurrentLocation: !!realTimeLocation,
            progress: `${progress.toFixed(1)}%`,
            distanceTraveled: `${(distanceTraveled / 1000).toFixed(2)} km`,
            distanceRemaining: `${(distanceRemaining / 1000).toFixed(2)} km`
        })

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
            distanceTraveled,
            distanceRemaining,
            estimatedTime,
            estimatedArrival,
            isOnRoute,
            progress: Math.round(progress * 10) / 10, // Round to 1 decimal
            paymentStatus,
            paymentConfirmed,
            allowTrackingWithoutPayment,
        })
    } catch (error) {
        console.error("Tracking error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
