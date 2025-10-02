import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { database } from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    // Get all active cars/trucks with their assigned packages
    const carsResult = await sql`
      SELECT
        c.car_id,
        c.plate_number,
        c.model,
        c.status as car_status,
        c.current_driver_id,
        d.driver_id,
        d.status as driver_status,
        u.full_name as driver_name,
        u.phone as driver_phone,
        b.branch_name,
        b.city as branch_city
      FROM cars c
      LEFT JOIN drivers d ON c.current_driver_id = d.driver_id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN branches b ON c.branch_id = b.branch_id
      WHERE c.status IN ('available', 'in-use')
      ORDER BY c.updated_at DESC
    `

    const trucksData = []

    for (const car of carsResult) {
      // Get assigned packages for this car
      const packagesResult = await sql`
        SELECT
          p.package_id,
          p.tracking_number,
          p.receiver_name,
          p.receiver_address,
          p.status as package_status,
          p.priority,
          p.created_at as package_created_at
        FROM packages p
        WHERE p.assigned_car_id = ${car.car_id}
        AND p.status IN ('picked_up', 'in_transit', 'out_for_delivery')
        ORDER BY p.created_at DESC
      `

      // Get real-time location from Firebase
      let realTimeLocation = null
      try {
        const locationRef = database.ref(`location_history/${car.car_id}`)
        const snapshot = await locationRef.limitToLast(1).once("value")
        const locationData = snapshot.val()

        if (locationData) {
          // Get the latest location entry
          const latestKey = Object.keys(locationData)[Object.keys(locationData).length - 1]
          const latestLocation = locationData[latestKey]

          realTimeLocation = {
            latitude: latestLocation.latitude,
            longitude: latestLocation.longitude,
            accuracy: latestLocation.accuracy,
            heading: latestLocation.heading,
            speed: latestLocation.speed,
            timestamp: latestLocation.timestamp,
            lastUpdated: new Date(latestLocation.timestamp).toISOString(),
          }
        }
      } catch (error) {
        console.log(`No real-time location available for car ${car.car_id}`)
      }

      trucksData.push({
        car: car,
        packages: packagesResult,
        realTimeLocation,
      })
    }

    return NextResponse.json({
      success: true,
      trucks: trucksData,
      totalTrucks: trucksData.length,
      activeTrucks: trucksData.filter(t => t.realTimeLocation).length,
    })
  } catch (error) {
    console.error("Error fetching trucks data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
