import { sql } from "@/lib/database";
import { sendSMS } from "@/lib/sms";
import { formatPhoneNumber } from "@/lib/utils";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic behavior for fresh tracking data
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// Normalize mixed timestamp formats (seconds, ms, numeric string, ISO)
function normalizeTs(raw: any): number {
  if (raw == null) return Date.now();
  if (typeof raw === "number") return raw < 1e12 ? raw * 1000 : raw;
  if (typeof raw === "string") {
    if (/^\d+$/.test(raw)) {
      const n = parseInt(raw, 10);
      return n < 1e12 ? n * 1000 : n;
    }
    const d = Date.parse(raw);
    return isNaN(d) ? Date.now() : d;
  }
  return Date.now();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  try {
    const { trackingNumber } = params;
    console.log("GET /api/tracking/:trackingNumber", { trackingNumber });

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "Tracking number is required" },
        { status: 400 }
      );
    }

    // Get package details
    const packageResult = await sql`
      SELECT * FROM packages WHERE package_id = ${trackingNumber}
    `;
    console.log("Package query result count:", packageResult?.length);

    if (packageResult.length === 0) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const packageData = packageResult[0];
    console.log("Package row status:", packageData?.status);

    // Block tracking fetches if the package is already arrived or delivered
    const packageStatus = String(packageData.status || "")
      .trim()
      .toLowerCase();
    if (packageStatus === "arrived" || packageStatus === "delivered") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Package is already delivered or arrived. Tracking is not available.",
        },
        { status: 400 }
      );
    }

    // Check payment status and delivery time
    const paymentResult = await sql`
      SELECT * FROM payments WHERE package_id = ${trackingNumber}
    `;
    console.log("Payment check:", {
      found: paymentResult.length,
      trackingNumber,
    });
    const paymentStatus =
      paymentResult.length > 0 ? paymentResult[0].payment_status : "pending";
    const paymentConfirmed = paymentResult.some(
      (p) => p.payment_status === "confirmed"
    );

    // Check if delivery time has passed - if so, allow tracking even without payment confirmation
    const now = Date.now();
    const deliveryTs = packageData.delivery_time
      ? Date.parse(packageData.delivery_time)
      : null;
    const deliveryTimePassed = deliveryTs && deliveryTs <= now;
    const allowTrackingWithoutPayment = deliveryTimePassed || paymentConfirmed;

    console.log("Delivery time check for payment override:", {
      deliveryTs,
      now,
      deliveryTimePassed,
      paymentConfirmed,
      allowTrackingWithoutPayment,
    });

    // Block tracking if payment not confirmed and delivery time not passed
    if (!allowTrackingWithoutPayment) {
      return NextResponse.json(
        {
          error: "Tracking not available",
          message:
            "Payment for this package has not been confirmed and delivery time is not yet up. Tracking information is not available.",
          paymentConfirmed,
          deliveryTimePassed,
          deliveryTime: packageData.delivery_time,
        },
        { status: 403 }
      );
    }

    // Check delivery time using UTC epoch comparison
    console.log("Delivery time check:", {
      now,
      deliveryTs,
      delivery_time: packageData.delivery_time,
      willBlock: deliveryTs && deliveryTs > now,
    });
    if (deliveryTs && deliveryTs > now) {
      return NextResponse.json(
        {
          error: "Scheduled for later",
          scheduledTime: packageData.delivery_time,
          state: "scheduled",
        },
        { status: 400 }
      );
    }

    // Fetch origin and destination branches
    const originBranch = await sql`
      SELECT * FROM branches WHERE branch_id = ${packageData.origin_branch_id}
    `;
    const destBranch = await sql`
      SELECT * FROM branches WHERE branch_id = ${packageData.destination_branch_id}
    `;

    console.log("📍 Origin Branch:", {
      id: originBranch[0]?.branch_id,
      name: originBranch[0]?.branch_name,
      lat: originBranch[0]?.latitude,
      lon: originBranch[0]?.longitude,
      address: originBranch[0]?.address,
    });

    console.log("🎯 Destination Branch:", {
      id: destBranch[0]?.branch_id,
      name: destBranch[0]?.branch_name,
      lat: destBranch[0]?.latitude,
      lon: destBranch[0]?.longitude,
      address: destBranch[0]?.address,
    });

    if (originBranch.length === 0 || destBranch.length === 0) {
      return NextResponse.json(
        { error: "Branch information not found" },
        { status: 404 }
      );
    }

    // Get route from LocationIQ (uses longitude,latitude order)
    let routeData = null;
    let routePolyline = null;
    let estimatedTime = null;
    let routeDistance = null;
    const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY;

    console.log("🔑 API Key check:", {
      hasKey: !!apiKey,
      keyLength: apiKey?.length,
      keyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : "NOT FOUND",
    });

    if (apiKey) {
      try {
        const url = `https://us1.locationiq.com/v1/directions/driving/${originBranch[0].longitude},${originBranch[0].latitude};${destBranch[0].longitude},${destBranch[0].latitude}?key=${apiKey}&overview=full&geometries=geojson`;

        console.log("🗺️ Fetching route from LocationIQ:", {
          from: `${originBranch[0].branch_name} (${originBranch[0].longitude}, ${originBranch[0].latitude})`,
          to: `${destBranch[0].branch_name} (${destBranch[0].longitude}, ${destBranch[0].latitude})`,
          url: url.replace(apiKey, "API_KEY_HIDDEN"),
        });

        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            "❌ LocationIQ routing error response:",
            response.status,
            errorText
          );
        } else {
          routeData = await response.json();
          console.log(
            "📦 LocationIQ Response:",
            JSON.stringify(routeData, null, 2)
          );

          const route = routeData?.routes?.[0];
          if (route) {
            estimatedTime = route.duration; // in seconds
            routeDistance = route.distance; // in meters
            routePolyline = route.geometry; // GeoJSON coordinates
            console.log("✅ Route calculated successfully:", {
              distance: `${(routeDistance / 1000).toFixed(2)} km`,
              duration: `${Math.round(estimatedTime / 60)} min`,
              coordinatesCount: routePolyline?.coordinates?.length || 0,
              polyline: routePolyline,
            });
          } else {
            console.error("❌ No route found in response:", routeData);
          }
        }
      } catch (error) {
        console.error("❌ LocationIQ routing error:", error);
      }
    } else {
      console.warn("⚠️ LocationIQ API key not configured");
    }

    // Fetch realtime location from Firebase - use vehicle assigned to package
    let realTimeLocation = null;
    let locationHistory: any[] = [];
    let vehicleId = packageData.assigned_car || null;

    // If no vehicle assigned, try to get from latest tracking entry
    if (!vehicleId) {
      const vehicleCheck = await sql`
                SELECT assigned_vehicle_id, vehicle_id FROM tracking 
                WHERE package_id = ${packageData.package_id} 
                AND (assigned_vehicle_id IS NOT NULL OR vehicle_id IS NOT NULL)
                ORDER BY created_at DESC 
                LIMIT 1
            `;
      vehicleId =
        vehicleCheck[0]?.assigned_vehicle_id ||
        vehicleCheck[0]?.vehicle_id ||
        "CAR001";
    }

    console.log("🚗 Vehicle lookup:", {
      packageVehicle: packageData.assigned_car,
      resolvedVehicle: vehicleId,
    });

    // Fetch assigned car details (plate number, model) if available
    let assignedCar = null;
    try {
      const carRow = await sql`
              SELECT car_id, plate_number, model FROM cars WHERE car_id = ${vehicleId}
            `;
      if (carRow && carRow.length > 0) {
        assignedCar = carRow[0];
        console.log("🚘 Assigned car found:", assignedCar);
      } else {
        console.log(
          "🚘 No assigned car record found for vehicleId:",
          vehicleId
        );
      }
    } catch (err) {
      console.warn("🚘 Failed to lookup assigned car:", err);
    }

    try {
      const { database } = await import("@/lib/firebase");
      const locationRef = database.ref(
        `vehicles/${vehicleId}/current_location`
      );

      // Get current location data
      const snapshot = await locationRef.once("value");
      const locationData = snapshot.val();

      if (locationData) {
        console.log("📡 Raw Firebase current_location data:", locationData);

        // Handle the data structure - it might be a single object or have nested properties
        let latitude = locationData.latitude;
        let longitude = locationData.longitude;
        let timestamp =
          locationData.timestamp ||
          locationData.time ||
          locationData.created_at;
        let accuracy = locationData.accuracy;
        let heading = locationData.heading;
        let speed = locationData.speed;
        let battery_level = locationData.battery_level;
        let device_status = locationData.device_status;
        let signal_strength = locationData.signal_strength;

        // If latitude/longitude are not direct properties, try to extract from nested structure
        if (latitude === undefined && longitude === undefined) {
          // Check if it's stored as separate properties
          if (typeof locationData === "object") {
            const keys = Object.keys(locationData);
            for (const key of keys) {
              if (
                key === "latitude" ||
                key === "longitude" ||
                key === "timestamp" ||
                key === "accuracy" ||
                key === "speed" ||
                key === "heading" ||
                key === "battery_level" ||
                key === "device_status" ||
                key === "signal_strength"
              ) {
                if (key === "latitude") latitude = locationData[key];
                if (key === "longitude") longitude = locationData[key];
                if (key === "timestamp") timestamp = locationData[key];
                if (key === "accuracy") accuracy = locationData[key];
                if (key === "speed") speed = locationData[key];
                if (key === "heading") heading = locationData[key];
                if (key === "battery_level") battery_level = locationData[key];
                if (key === "device_status") device_status = locationData[key];
                if (key === "signal_strength")
                  signal_strength = locationData[key];
              }
            }
          }
        }

        console.log("🛰️ Extracted location data:", {
          vehicleId,
          latitude,
          longitude,
          timestamp,
          accuracy,
          speed,
          battery_level,
          device_status,
          signal_strength,
        });

        if (latitude !== undefined && longitude !== undefined) {
          const ts = normalizeTs(timestamp);
          console.log("✅ Valid location found:", {
            vehicleId,
            lat: latitude,
            lng: longitude,
            ts,
          });

          // Use the current location data directly
          let chosenLat = latitude;
          let chosenLng = longitude;
          let chosenTs = ts;
          let chosenAccuracy = accuracy;
          let chosenHeading = heading;
          let chosenSpeed = speed;
          let chosenBatteryLevel = battery_level;
          let chosenDeviceStatus = device_status;
          let chosenSignalStrength = signal_strength;

          const timestampDate = new Date(chosenTs);
          const isValidDate = !isNaN(timestampDate.getTime());

          // Reverse geocode chosen latest coordinate
          let address = null;
          if (apiKey) {
            try {
              const geocodeUrl = `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${chosenLat}&lon=${chosenLng}&format=json`;

              console.log("🔍 Geocoding location:", {
                lat: chosenLat,
                lon: chosenLng,
              });

              const geocodeResponse = await fetch(geocodeUrl);

              if (!geocodeResponse.ok) {
                const errorText = await geocodeResponse.text();
                console.error(
                  "❌ Geocoding error response:",
                  geocodeResponse.status,
                  errorText
                );
              } else {
                const geocodeData = await geocodeResponse.json();
                console.log(
                  "📦 Geocoding Response:",
                  JSON.stringify(geocodeData, null, 2)
                );
                address = geocodeData.display_name || null;
                console.log("✅ Geocoded address:", address);
              }
            } catch (error) {
              console.error("❌ Geocoding error:", error);
            }
          }

          realTimeLocation = {
            latitude: chosenLat,
            longitude: chosenLng,
            accuracy: chosenAccuracy,
            heading: chosenHeading,
            speed: chosenSpeed,
            battery_level: chosenBatteryLevel,
            device_status: chosenDeviceStatus,
            signal_strength: chosenSignalStrength,
            timestamp: chosenTs,
            lastUpdated: isValidDate
              ? timestampDate.toISOString()
              : new Date().toISOString(),
            vehicleId: vehicleId,
            address: address,
          };

          // For now, just use the current location as the single history point
          // TODO: Implement proper history fetching from Firebase
          locationHistory = [
            {
              latitude: chosenLat,
              longitude: chosenLng,
              timestamp: chosenTs,
              lastUpdated: timestampDate.toISOString(),
              accuracy: chosenAccuracy,
              speed: chosenSpeed,
              heading: chosenHeading,
              battery_level: chosenBatteryLevel,
              device_status: chosenDeviceStatus,
              signal_strength: chosenSignalStrength,
              address: address,
            },
          ];

          console.log("📊 Location history prepared:", {
            count: locationHistory.length,
            latest: locationHistory[0]?.lastUpdated,
          });

          console.log("✅ Real-time location found:", {
            lat: realTimeLocation.latitude,
            lon: realTimeLocation.longitude,
            vehicleId,
            address,
            historyCount: locationHistory.length,
            lastUpdated: realTimeLocation.lastUpdated,
          });
        }
      } else {
        // Fallback to current_location if history is empty
        try {
          const currentRef = database.ref(
            `vehicles/${vehicleId}/current_location`
          );
          const currentSnap = await currentRef.once("value");
          const v = currentSnap.val();
          if (
            v &&
            typeof v.latitude === "number" &&
            typeof v.longitude === "number"
          ) {
            const ts = normalizeTs(v.timestamp ?? v.last_updated ?? v.time);
            let address = null;
            if (apiKey) {
              try {
                const geocodeUrl = `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${v.latitude}&lon=${v.longitude}&format=json`;
                const geocodeResponse = await fetch(geocodeUrl);
                if (geocodeResponse.ok) {
                  const geocodeData = await geocodeResponse.json();
                  address = geocodeData.display_name || null;
                }
              } catch {}
            }

            realTimeLocation = {
              latitude: v.latitude,
              longitude: v.longitude,
              accuracy: v.accuracy,
              heading: v.heading,
              speed: v.speed,
              battery_level: v.battery_level,
              device_status: v.device_status,
              signal_strength: v.signal_strength,
              timestamp: ts,
              lastUpdated: new Date(ts).toISOString(),
              vehicleId,
              address,
            };

            locationHistory = [];
            console.log(
              "✅ Fallback current_location used for latest position",
              { vehicleId, lat: v.latitude, lng: v.longitude, ts }
            );
          }
        } catch (err) {
          console.warn("Fallback to current_location failed:", err);
        }
      }
    } catch (error) {
      console.log("❌ No real-time location available:", error);
    }
    const hasRealtime = !!realTimeLocation;
    console.log("Realtime presence:", { hasRealtime, vehicleId });

    // Check both package status and latest tracking status to reduce false negatives
    const latestRow = await sql`
      SELECT status, progress_percentage FROM tracking WHERE package_id = ${packageData.package_id} ORDER BY created_at DESC LIMIT 1
    `;
    console.log("Latest tracking row:", latestRow?.[0]);

    const pkgStatus = String(packageData.status || "")
      .trim()
      .toLowerCase();
    const latestStatus = String(latestRow?.[0]?.status || "")
      .trim()
      .toLowerCase();
    const allowed = new Set(["registered", "in_transit", "out_for_delivery"]);
    console.log("Status check:", {
      pkgStatus,
      latestStatus,
      allowedStatuses: Array.from(allowed),
      hasRealtime,
    });

    // Calculate accurate progress using LocationIQ with incremental updates
    let progress = 0;
    let distanceTraveled = 0;
    let distanceRemaining = 0;
    let isOnRoute = false;
    let estimatedArrival = null;

    if (realTimeLocation && routeDistance && apiKey) {
      try {
        // First, provide immediate estimate using straight-line distance (Haversine)
        const haversineDistance = (
          lat1: number,
          lon1: number,
          lat2: number,
          lon2: number
        ): number => {
          const R = 6371e3; // Earth's radius in meters
          const φ1 = (lat1 * Math.PI) / 180;
          const φ2 = (lat2 * Math.PI) / 180;
          const Δφ = ((lat2 - lat1) * Math.PI) / 180;
          const Δλ = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        const straightLineDistance = haversineDistance(
          originBranch[0].latitude,
          originBranch[0].longitude,
          realTimeLocation.latitude,
          realTimeLocation.longitude
        );
        const initialProgress = Math.min(
          100,
          Math.max(0, (straightLineDistance / routeDistance) * 100)
        );

        console.log("📊 Initial progress estimate (straight-line):", {
          straightLineDistance: `${(straightLineDistance / 1000).toFixed(
            2
          )} km`,
          initialProgress: `${initialProgress.toFixed(1)}%`,
        });

        // Save initial estimate to database immediately (round to integer for INTEGER column)
        await sql`
                    UPDATE tracking 
                    SET progress_percentage = ${Math.round(initialProgress)}
                    WHERE package_id = ${packageData.package_id}
                    AND created_at = (SELECT MAX(created_at) FROM tracking WHERE package_id = ${
                      packageData.package_id
                    })
                `;

        // Calculate distance from origin to current location
        const currentDistanceUrl = `https://us1.locationiq.com/v1/directions/driving/${originBranch[0].longitude},${originBranch[0].latitude};${realTimeLocation.longitude},${realTimeLocation.latitude}?key=${apiKey}&overview=simplified`;

        console.log(
          "📏 Calculating accurate distance from origin to current location..."
        );

        const currentDistResponse = await fetch(currentDistanceUrl);
        if (currentDistResponse.ok) {
          const currentDistData = await currentDistResponse.json();
          const traveledRoute = currentDistData?.routes?.[0];

          if (traveledRoute) {
            distanceTraveled = traveledRoute.distance; // in meters
            distanceRemaining = Math.max(0, routeDistance - distanceTraveled);

            // Calculate progress percentage
            progress = Math.min(
              100,
              Math.max(0, (distanceTraveled / routeDistance) * 100)
            );

            // Check if vehicle is roughly on route (within 10% deviation)
            const deviation = Math.abs(distanceTraveled - routeDistance);
            isOnRoute = deviation < routeDistance * 0.1;

            // Calculate estimated arrival time
            if (realTimeLocation.speed && realTimeLocation.speed > 0) {
              // Speed is in m/s, convert to hours
              const remainingTimeHours =
                distanceRemaining / 1000 / (realTimeLocation.speed * 3.6);
              const remainingTimeMs = remainingTimeHours * 60 * 60 * 1000;
              estimatedArrival = new Date(
                Date.now() + remainingTimeMs
              ).toISOString();
            } else if (estimatedTime && distanceTraveled > 0) {
              // Use average speed from total route
              const avgSpeed = routeDistance / estimatedTime; // m/s
              const remainingTimeSec = distanceRemaining / avgSpeed;
              estimatedArrival = new Date(
                Date.now() + remainingTimeSec * 1000
              ).toISOString();
            }

            console.log("📊 Accurate progress calculated:", {
              totalDistance: `${(routeDistance / 1000).toFixed(2)} km`,
              distanceTraveled: `${(distanceTraveled / 1000).toFixed(2)} km`,
              distanceRemaining: `${(distanceRemaining / 1000).toFixed(2)} km`,
              progress: `${progress.toFixed(1)}%`,
              isOnRoute,
              currentSpeed: realTimeLocation.speed
                ? `${(realTimeLocation.speed * 3.6).toFixed(1)} km/h`
                : "unknown",
              estimatedArrival,
            });

            // Save accurate progress to database (round to integer for INTEGER column)
            await sql`
                            UPDATE tracking 
                            SET progress_percentage = ${Math.round(progress)}
                            WHERE package_id = ${packageData.package_id}
                            AND created_at = (SELECT MAX(created_at) FROM tracking WHERE package_id = ${
                              packageData.package_id
                            })
                        `;
            console.log("✅ Progress saved to database:", Math.round(progress));
          }
        }
      } catch (error) {
        console.error("❌ Error calculating progress:", error);
        // Fallback to database progress
        progress = latestRow?.[0]?.progress_percentage || 0;
      }
    } else {
      // Fallback to database progress if no real-time location
      progress = latestRow?.[0]?.progress_percentage || 0;
      console.log("⚠️ Using fallback progress from database:", progress);
    }

    if (!hasRealtime && !allowed.has(pkgStatus)) {
      console.warn(
        "Blocking tracking fetch due to status (no realtime either):",
        {
          packageStatus: packageData.status,
          latestTrackingStatus: latestRow?.[0]?.status || null,
          hasRealtime,
        }
      );
      return NextResponse.json(
        {
          error: "Package not yet packed in car",
          packageStatus: packageData.status,
          latestTrackingStatus: latestRow?.[0]?.status || null,
          hasRealtime,
        },
        { status: 400 }
      );
    }

    // Get tracking history
    const trackingHistory = await sql`
      SELECT * FROM tracking 
      WHERE package_id = ${packageData.package_id} 
      ORDER BY created_at ASC
    `;

    // realTimeLocation already fetched above
    // Sanitize PII for public tracking
    const sanitizedPackage = {
      ...packageData,
      sender_phone: packageData.sender_phone?.replace(
        /(\+\d{3})\d{5}(\d{2,})/,
        "$1*****$2"
      ),
      receiver_phone: packageData.receiver_phone?.replace(
        /(\+\d{3})\d{5}(\d{2,})/,
        "$1*****$2"
      ),
    };

    // Send progress update SMS notifications.
    // Per request: only send milestone notifications when progress reaches 100%.
    const progressMilestones = [100];
    for (const milestone of progressMilestones) {
      if (progress >= milestone) {
        // Check if notification already sent
        const notificationCheck = await sql`
                    SELECT id FROM tracking
                    WHERE package_id = ${packageData.package_id}
                    AND status = ${`progress_${milestone}_sent`}
                    LIMIT 1
                `;

        if (notificationCheck.length === 0) {
          const message = `KIVU Belt Express: Package ${packageData.package_id} is ${milestone}% complete. Track: ${process.env.NEXT_PUBLIC_API_URL}/track/${packageData.package_id}`;

          // Send to sender
          if (packageData.sender_phone) {
            try {
              const formattedSenderPhone = formatPhoneNumber(
                packageData.sender_phone
              );
              await sendSMS({
                to: formattedSenderPhone,
                message: `Sender Update: ${message}`,
              });
              console.log(
                `📱 Sent ${milestone}% progress SMS to sender: ${formattedSenderPhone}`
              );
            } catch (error) {
              console.error(
                `❌ Failed to send ${milestone}% SMS to sender:`,
                error
              );
            }
          }

          // Send to receiver
          if (packageData.receiver_phone) {
            try {
              const formattedReceiverPhone = formatPhoneNumber(
                packageData.receiver_phone
              );
              await sendSMS({
                to: formattedReceiverPhone,
                message: `Receiver Update: ${message}`,
              });
              console.log(
                `📱 Sent ${milestone}% progress SMS to receiver: ${formattedReceiverPhone}`
              );
            } catch (error) {
              console.error(
                `❌ Failed to send ${milestone}% SMS to receiver:`,
                error
              );
            }
          }

          // Record that notification was sent
          await sql`
                        INSERT INTO tracking (package_id, status, location_name, notes, created_at)
                        VALUES (${
                          packageData.package_id
                        }, ${`progress_${milestone}_sent`}, 'System', 'Progress milestone SMS sent', NOW())
                    `;
          console.log(`✅ Recorded ${milestone}% progress notification sent`);
        }
      }
    }

    console.log("✅ Returning tracking payload", {
      trackingCount: trackingHistory?.length ?? 0,
      hasCurrentLocation: !!realTimeLocation,
      progress: `${progress.toFixed(1)}%`,
      distanceTraveled: `${(distanceTraveled / 1000).toFixed(2)} km`,
      distanceRemaining: `${(distanceRemaining / 1000).toFixed(2)} km`,
      currentLocation: realTimeLocation,
    });

    return NextResponse.json(
      {
        success: true,
        package: sanitizedPackage,
        tracking: trackingHistory,
        currentLocation: realTimeLocation,
        locationHistory,
        originBranch: originBranch[0],
        destinationBranch: destBranch[0],
        assignedCar,
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
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Tracking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
