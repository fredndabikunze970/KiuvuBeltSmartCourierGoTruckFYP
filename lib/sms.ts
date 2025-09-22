import AfricasTalking from "africastalking"
import { formatPhoneNumber } from "./utils"

const africastalking = AfricasTalking({
  apiKey: process.env.AFRICAS_TALKING_API_KEY!,
  username: process.env.AFRICAS_TALKING_USERNAME!,
})

const sms = africastalking.SMS

export interface SMSMessage {
  to: string
  message: string
  from?: string
}

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
  recipients?: any[]
}

export async function sendSMS({ to, message, from }: SMSMessage): Promise<SMSResult> {
  try {
    const formattedPhone = formatPhoneNumber(to)

    if (process.env.NODE_ENV !== "production" || !process.env.AFRICAS_TALKING_API_KEY) {
      console.log(`📱 [SMS TEST MODE]`)
      console.log(`   To: ${formattedPhone}`)
      console.log(`   From: ${from || process.env.SMS_SENDER_ID || "KIVUBELT"}`)
      console.log(`   Message: ${message}`)
      return {
        success: true,
        messageId: `test-${Date.now()}`,
        recipients: [{ number: formattedPhone, status: "Success", messageId: `test-${Date.now()}` }],
      }
    }

    const options = {
      to: [formattedPhone],
      message,
      from: from || process.env.SMS_SENDER_ID || "KIVUBELT",
    }

    const result = await sms.send(options)
    console.log("📱 SMS sent successfully:", result)

    return {
      success: true,
      messageId: result.SMSMessageData?.Recipients?.[0]?.messageId,
      recipients: result.SMSMessageData?.Recipients,
    }
  } catch (error) {
    console.error("❌ SMS sending failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown SMS error",
    }
  }
}

export async function sendPackageNotification(
  phoneNumber: string,
  trackingNumber: string,
  status: string,
  location?: string,
): Promise<SMSResult> {
  let message = ""

  switch (status) {
    case "registered":
      message = `KIVU Belt Express: Your package ${trackingNumber} has been registered successfully. Track: ${process.env.FRONTEND_URL}/track/${trackingNumber}`
      break
    case "picked_up":
      message = `KIVU Belt Express: Your package ${trackingNumber} has been picked up and is now in transit. Track: ${process.env.FRONTEND_URL}/track/${trackingNumber}`
      break
    case "in_transit":
      message = `KIVU Belt Express: Your package ${trackingNumber} is in transit${location ? ` at ${location}` : ""}. Track: ${process.env.FRONTEND_URL}/track/${trackingNumber}`
      break
    case "out_for_delivery":
      message = `KIVU Belt Express: Your package ${trackingNumber} is out for delivery. Please be available to receive it. Track: ${process.env.FRONTEND_URL}/track/${trackingNumber}`
      break
    case "delivered":
      message = `KIVU Belt Express: Your package ${trackingNumber} has been successfully delivered. Thank you for choosing us!`
      break
    case "cancelled":
      message = `KIVU Belt Express: Your package ${trackingNumber} has been cancelled. Contact us for more information.`
      break
    default:
      message = `KIVU Belt Express: Package ${trackingNumber} status updated to ${status}. Track: ${process.env.FRONTEND_URL}/track/${trackingNumber}`
  }

  return await sendSMS({
    to: phoneNumber,
    message,
  })
}

export async function sendBulkSMS(messages: SMSMessage[]): Promise<SMSResult[]> {
  const results: SMSResult[] = []

  for (const message of messages) {
    const result = await sendSMS(message)
    results.push(result)

    if (messages.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results
}

export const SMS_TEMPLATES = {
  WELCOME: (name: string) => `Welcome to KIVU Belt Express, ${name}! Your account has been created successfully.`,
  PACKAGE_REGISTERED: (trackingNumber: string) =>
    `Your package ${trackingNumber} has been registered with KIVU Belt Express.`,
  DELIVERY_REMINDER: (trackingNumber: string, receiverName: string) =>
    `Hi ${receiverName}, your package ${trackingNumber} will be delivered today. Please be available.`,
  PAYMENT_RECEIVED: (amount: number, trackingNumber: string) =>
    `Payment of ${amount} RWF received for package ${trackingNumber}. Thank you!`,
} as const

export async function sendTemplatedSMS(
  phoneNumber: string,
  template: keyof typeof SMS_TEMPLATES,
  ...args: any[]
): Promise<SMSResult> {
  const templateFn = SMS_TEMPLATES[template]
  const message = typeof templateFn === "function" ? templateFn(...args) : templateFn

  return await sendSMS({
    to: phoneNumber,
    message,
  })
}
