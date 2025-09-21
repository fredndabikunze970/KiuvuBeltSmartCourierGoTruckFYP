const AfricasTalking = require("africastalking")

const africastalking = AfricasTalking({
  apiKey: process.env.AFRICAS_TALKING_API_KEY,
  username: process.env.AFRICAS_TALKING_USERNAME,
})

const sms = africastalking.SMS

export interface SMSOptions {
  to: string
  message: string
  from?: string
}

export async function sendSMS({ to, message, from }: SMSOptions) {
  try {
    // In test mode, just log the SMS
    if (process.env.NODE_ENV !== "production" || !process.env.AFRICAS_TALKING_API_KEY) {
      console.log(`[SMS TEST MODE] To: ${to}, Message: ${message}`)
      return { success: true, messageId: "test-" + Date.now() }
    }

    const options = {
      to: [to],
      message,
      from: from || process.env.SMS_SENDER_ID || "KIVU_EXPRESS",
    }

    const response = await sms.send(options)
    return { success: true, response }
  } catch (error) {
    console.error("SMS Error:", error)
    return { success: false, error }
  }
}

export function getNotificationMessage(status: string, packageId: string, receiverName: string): string {
  const messages = {
    picked_up: `Hello ${receiverName}, your package ${packageId} has been picked up and is on its way. Track: ${process.env.FRONTEND_URL}/track/${packageId}`,
    in_transit_50: `Hello ${receiverName}, your package ${packageId} is 50% of the way to its destination. Track: ${process.env.FRONTEND_URL}/track/${packageId}`,
    in_transit_70: `Hello ${receiverName}, your package ${packageId} is 70% of the way to its destination. Track: ${process.env.FRONTEND_URL}/track/${packageId}`,
    in_transit_90: `Hello ${receiverName}, your package ${packageId} is 90% of the way to its destination and will arrive soon. Track: ${process.env.FRONTEND_URL}/track/${packageId}`,
    delivered: `Hello ${receiverName}, your package ${packageId} has been delivered successfully. Thank you for choosing KIVU Belt Express!`,
  }

  return messages[status as keyof typeof messages] || `Package ${packageId} status updated to ${status}`
}
