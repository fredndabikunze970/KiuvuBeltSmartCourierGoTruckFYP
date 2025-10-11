import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import {
  type USSDRequest,
  type USSDResponse,
  USSD_STATES,
  validateTrackingNumber,
  formatTrackingResponse,
  formatStatusForUSSD,
  generateProgressBar
} from "@/lib/ussd"

export async function POST(request: NextRequest) {
  try {
    let sessionId: string
    let serviceCode: string
    let phoneNumber: string
    let text: string

    // Handle both JSON (for testing) and form data (Africa's Talking)
    const contentType = request.headers.get('content-type')

    if (contentType?.includes('application/json')) {
      // JSON format (for testing/Postman)
      const body: USSDRequest = await request.json()
      sessionId = body.sessionId
      serviceCode = body.serviceCode
      phoneNumber = body.phoneNumber
      text = body.text
    } else {
      // Form data format (Africa's Talking)
      const formData = await request.formData()
      sessionId = formData.get('sessionId') as string
      serviceCode = formData.get('serviceCode') as string
      phoneNumber = formData.get('phoneNumber') as string
      text = formData.get('text') as string
    }

    console.log('USSD Request:', { sessionId, serviceCode, phoneNumber, text })

    // Parse the user input
    const input = text.trim()
    const steps = input.split('*').filter(step => step.length > 0)

    let response: USSDResponse

    // Handle different menu states based on input length
    if (steps.length === 0) {
      // Welcome screen
      response = {
        response: `CON Welcome to KIVU Belt Express Tracking\n\nEnter your tracking number to check package status:\n\nExample: PKG001234`,
        action: 'CONTINUE'
      }
    } else {
      // User has entered a tracking number
      const trackingInput = steps[0]
      const validation = validateTrackingNumber(trackingInput)

      if (!validation.isValid) {
        response = {
          response: `CON ${validation.error}\n\nPlease enter a valid tracking number:\n\nExample: PKG001234`,
          action: 'CONTINUE'
        }
      } else {
        const trackingNumber = validation.trackingNumber!

        // Fetch package tracking information directly from database for USSD
        try {
          console.log('USSD: Searching for package:', trackingNumber)

          // Query package details with branch information
          const packageResult = await sql`
            SELECT
              p.*,
              ob.branch_name as origin_branch_name,
              db.branch_name as destination_branch_name
            FROM packages p
            LEFT JOIN branches ob ON p.origin_branch_id = ob.branch_id
            LEFT JOIN branches db ON p.destination_branch_id = db.branch_id
            WHERE p.package_id = ${trackingNumber}
          `

          console.log('USSD: Package query result count:', packageResult?.length)
          console.log('USSD: Package data:', packageResult[0] ? {
            id: packageResult[0].package_id,
            status: packageResult[0].status,
            sender: packageResult[0].sender_name,
            receiver: packageResult[0].receiver_name,
            origin: packageResult[0].origin_branch_name,
            destination: packageResult[0].destination_branch_name
          } : 'No package found')

          if (packageResult.length === 0) {
            // Let's also try a broader search to see what packages exist
            const allPackages = await sql`
              SELECT package_id FROM packages LIMIT 5
            `
            console.log('USSD: Sample packages in database:', allPackages.map(p => p.package_id))

            response = {
              response: `END Package not found or tracking not available.\n\nError: Package not found\n\nPlease check your tracking number and try again.`,
              action: 'END'
            }
          } else {
            const packageData = packageResult[0]

            // Get real progress from the main tracking API
            let realProgress = 0
            try {
              console.log('USSD: Fetching real progress from tracking API for:', trackingNumber)
              // Use relative URL for internal API calls (works in both dev and production)
              const trackingApiUrl = `/api/tracking/${trackingNumber}`
              console.log('USSD: Calling tracking API URL:', trackingApiUrl)

              const trackingResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${trackingApiUrl}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json'
                }
              })

              console.log('USSD: Tracking API response status:', trackingResponse.status)

              if (trackingResponse.ok) {
                const trackingData = await trackingResponse.json()
                console.log('USSD: Full tracking API response:', JSON.stringify(trackingData, null, 2))

                // Try different possible field names for progress
                if (trackingData.progress !== undefined) {
                  realProgress = trackingData.progress
                  console.log('USSD: Real progress from API (progress field):', realProgress)
                } else if (trackingData.percentage !== undefined) {
                  realProgress = trackingData.percentage
                  console.log('USSD: Real progress from API (percentage field):', realProgress)
                } else if (trackingData.progress_percentage !== undefined) {
                  realProgress = trackingData.progress_percentage
                  console.log('USSD: Real progress from API (progress_percentage field):', realProgress)
                } else {
                  console.log('USSD: No progress data found in tracking API response. Available fields:', Object.keys(trackingData))
                }
              } else {
                console.log('USSD: Tracking API call failed:', trackingResponse.status)
                const errorText = await trackingResponse.text()
                console.log('USSD: Tracking API error response:', errorText)
              }
            } catch (error) {
              console.log('USSD: Error fetching real progress:', error)
            }

            // Fallback to database progress if API fails
            if (realProgress === 0) {
              const latestTracking = await sql`
                SELECT status, progress_percentage FROM tracking WHERE package_id = ${trackingNumber} ORDER BY created_at DESC LIMIT 1
              `
              realProgress = latestTracking.length > 0 ? latestTracking[0].progress_percentage : 0
              console.log('USSD: Using fallback progress from database:', realProgress)
            }

            // Fetch real-time location from Firebase
            let currentLocationText = ''
            let vehicleId = packageData.assigned_car

            // If no vehicle assigned, try to get from latest tracking entry
            if (!vehicleId) {
              const vehicleCheck = await sql`
                SELECT assigned_vehicle_id, vehicle_id FROM tracking
                WHERE package_id = ${trackingNumber}
                AND (assigned_vehicle_id IS NOT NULL OR vehicle_id IS NOT NULL)
                ORDER BY created_at DESC
                LIMIT 1
              `
              vehicleId = vehicleCheck[0]?.assigned_vehicle_id || vehicleCheck[0]?.vehicle_id || 'CAR001'
            }

            console.log('USSD: Fetching location for vehicle:', vehicleId)

            try {
              const { database } = await import("@/lib/firebase")
              const locationRef = database.ref(`location_history/${vehicleId}`)

              // Get last 4 location entries to ensure we get the most recent
              const snapshot = await locationRef.limitToLast(4).once("value")
              const locationData = snapshot.val()

              console.log('USSD: Firebase location data for', vehicleId, ':', locationData ? 'Found' : 'Not found')

              if (locationData) {
                // Convert to array and sort by timestamp to get the absolute latest
                const keys = Object.keys(locationData)
                const allLocations = keys.map(key => ({
                  ...locationData[key],
                  key: key
                })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

                // Get the most recent location
                const latestLocation = allLocations[0]

                console.log('USSD: Most recent location data:', {
                  lat: latestLocation.latitude,
                  lng: latestLocation.longitude,
                  timestamp: latestLocation.timestamp,
                  totalEntries: allLocations.length
                })

                // Geocode the location
                const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY
                if (apiKey && latestLocation.latitude && latestLocation.longitude) {
                  try {
                    const geocodeUrl = `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${latestLocation.latitude}&lon=${latestLocation.longitude}&format=json`
                    const geocodeResponse = await fetch(geocodeUrl)

                    if (geocodeResponse.ok) {
                      const geocodeData = await geocodeResponse.json()
                      const address = geocodeData.display_name || `${latestLocation.latitude.toFixed(4)}, ${latestLocation.longitude.toFixed(4)}`
                      currentLocationText = `\n📍 Current Location:\n${address}`
                      console.log('USSD: Geocoded location:', address)
                    } else {
                      console.error('USSD: Geocoding failed:', geocodeResponse.status)
                    }
                  } catch (error) {
                    console.error('USSD: Geocoding error:', error)
                  }
                } else {
                  console.log('USSD: Missing API key or coordinates')
                }
              } else {
                console.log('USSD: No location data found in Firebase for vehicle:', vehicleId)
              }
            } catch (error) {
              console.log('USSD: Firebase location fetch error:', error)
            }

            // Format response manually for USSD
            const statusText = packageData.status ? formatStatusForUSSD(packageData.status) : 'Unknown Status'
            const progress = realProgress
            const progressBar = generateProgressBar(progress)

            // Compose USSD response text
            const responseText = `END Package Status: ${statusText}\n\nTracking: ${packageData.package_id}\nProgress: ${progress.toFixed(1)}%\n${progressBar}\n\nFrom: ${packageData.origin_branch_name || 'Origin'}\nTo: ${packageData.destination_branch_name || 'Destination'}${currentLocationText}\n\nSender: ${packageData.sender_name}\nReceiver: ${packageData.receiver_name}\n\nThank you for using KIVU Belt Express!`

            response = {
              response: responseText,
              action: 'END'
            }
          }
        } catch (error) {
          console.error('USSD tracking fetch error:', error)
          response = {
            response: `END Sorry, we encountered an error while fetching tracking information. Please try again later.`,
            action: 'END'
          }
        }
      }
    }

    console.log('USSD Response:', response)

    // Return the response in the format expected by USSD gateways
    return new NextResponse(response.response, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    })

  } catch (error) {
    console.error('USSD API Error:', error)
    return new NextResponse('END Sorry, we encountered an error. Please try again later.', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    })
  }
}



// GET method for testing purposes
export async function GET() {
  return NextResponse.json({
    message: "USSD API is running",
    usage: "POST requests only for USSD gateway integration",
    example: {
      sessionId: "1234567890",
      serviceCode: "*123#",
      phoneNumber: "+250123456789",
      text: "PKG001234"
    }
  })
}
