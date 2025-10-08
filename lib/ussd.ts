/**
 * USSD (Unstructured Supplementary Service Data) utilities for KIVU Belt Express
 * This module handles USSD-based package tracking functionality
 */

export interface USSDRequest {
  sessionId: string
  serviceCode: string
  phoneNumber: string
  text: string
}

export interface USSDResponse {
  response: string
  action: 'CONTINUE' | 'END'
}

/**
 * USSD Menu States
 */
export const USSD_STATES = {
  WELCOME: 'welcome',
  ENTER_TRACKING: 'enter_tracking',
  SHOW_TRACKING: 'show_tracking'
} as const

/**
 * Generate a simple progress bar for USSD display
 */
export function generateProgressBar(progress: number, length: number = 10): string {
  const filledBars = Math.round((progress / 100) * length)
  const emptyBars = length - filledBars

  const filled = '█'.repeat(filledBars)
  const empty = '░'.repeat(emptyBars)

  return `[${filled}${empty}]`
}

/**
 * Format package status for USSD display
 */
export function formatStatusForUSSD(status: string): string {
  switch (status?.toLowerCase()) {
    case 'registered':
      return '📦 Registered'
    case 'picked_up':
      return '🚚 Picked Up'
    case 'in_transit':
      return '🚛 In Transit'
    case 'out_for_delivery':
      return '🏍️ Out for Delivery'
    case 'delivered':
      return '✅ Delivered'
    case 'cancelled':
      return '❌ Cancelled'
    default:
      return status || 'Unknown Status'
  }
}

/**
 * Format location information for USSD display
 */
export function formatLocationForUSSD(location: any): string {
  if (!location) {
    return 'Location not available'
  }

  if (location.address) {
    // Truncate long addresses for USSD display
    const address = location.address.length > 50
      ? location.address.substring(0, 47) + '...'
      : location.address
    return `📍 ${address}`
  }

  if (location.latitude && location.longitude) {
    return `📍 Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}`
  }

  return 'Location not available'
}

/**
 * Format tracking information for USSD response
 */
export function formatTrackingResponse(trackingData: any): USSDResponse {
  try {
    const packageInfo = trackingData.package
    const currentLocation = trackingData.currentLocation
    const progress = trackingData.progress || 0

    const statusText = formatStatusForUSSD(packageInfo.status)
    const locationInfo = formatLocationForUSSD(currentLocation)
    const progressBar = generateProgressBar(progress)

    const responseText = `END Package Status: ${statusText}\n\nTracking: ${packageInfo.package_id}\nProgress: ${progress.toFixed(1)}%\n${progressBar}\n\nCurrent Location:\n${locationInfo}\n\nFrom: ${packageInfo.origin_branch_name || 'Origin'}\nTo: ${packageInfo.destination_branch_name || 'Destination'}\n\nSender: ${packageInfo.sender_name}\nReceiver: ${packageInfo.receiver_name}\n\nThank you for using KIVU Belt Express!`

    return {
      response: responseText,
      action: 'END'
    }
  } catch (error) {
    console.error('Error formatting tracking response:', error)
    return {
      response: 'END Sorry, we encountered an error formatting the tracking information.',
      action: 'END'
    }
  }
}

/**
 * Validate USSD input
 */
export function validateTrackingNumber(input: string): { isValid: boolean; trackingNumber?: string; error?: string } {
  const trackingNumber = input.trim().toUpperCase()

  if (!trackingNumber) {
    return { isValid: false, error: 'Tracking number is required' }
  }

  if (trackingNumber.length < 3) {
    return { isValid: false, error: 'Tracking number too short' }
  }

  // Basic validation - should start with letters and contain numbers
  const hasLetters = /[A-Z]/.test(trackingNumber)
  const hasNumbers = /\d/.test(trackingNumber)

  if (!hasLetters || !hasNumbers) {
    return { isValid: false, error: 'Invalid tracking number format' }
  }

  return { isValid: true, trackingNumber }
}

/**
 * USSD Integration Guide:
 *
 * To integrate with telecom providers (MTN, Airtel, etc. in Rwanda):
 *
 * 1. Register your USSD code with the telecom provider (e.g., *123#)
 * 2. Configure the provider to send POST requests to: /api/ussd
 * 3. Request format should include:
 *    - sessionId: string (unique session identifier)
 *    - serviceCode: string (the USSD code dialed)
 *    - phoneNumber: string (user's phone number)
 *    - text: string (user input)
 *
 * 4. Response format:
 *    - Plain text starting with "CON" (continue session) or "END" (end session)
 *    - Response text should be concise for mobile display
 *
 * Example integration URLs:
 * - MTN Rwanda: Configure their USSD gateway to point to your domain/api/ussd
 * - Airtel Rwanda: Similar configuration required
 *
 * Testing:
 * - Use the GET endpoint for testing: /api/ussd
 * - Use tools like Postman or curl to simulate USSD requests
 */
