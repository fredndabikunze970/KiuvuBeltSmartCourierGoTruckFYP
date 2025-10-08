import { Twilio } from "twilio";
import { formatPhoneNumber } from "./utils";

// Initialize Twilio client with proper error handling
let twilioClient: Twilio | null = null;

try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('✅ Twilio client initialized successfully');
  } else {
    console.warn('⚠️ Missing Twilio credentials');
  }
} catch (error) {
  console.error('❌ Failed to initialize Twilio client:', error);
}

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

    // Check if we have Twilio credentials and client
    if (!twilioClient || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return {
        success: false,
        error: "Twilio is not properly configured",
      }
    }

    const result = await twilioClient.messages.create({
      to: formattedPhone,
      from: from || process.env.TWILIO_PHONE_NUMBER,
      body: message,
    })

    // Only log real Twilio response information
    console.log("📱 Twilio Message Status:", {
      sid: result.sid,
      status: result.status,
      to: result.to,
      direction: result.direction,
      dateCreated: result.dateCreated,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage
    })

    return {
      success: true,
      messageId: result.sid,
      recipients: [{ number: formattedPhone, status: result.status, messageId: result.sid }],
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
      message = `KIVU Belt Express: Package ${trackingNumber} registered. Track: ${process.env.NEXT_PUBLIC_API_URL}/track/${trackingNumber}`
      break
    case "picked_up":
      message = `KIVU Belt Express: Package ${trackingNumber} picked up, in transit. Track: ${process.env.NEXT_PUBLIC_API_URL}/track/${trackingNumber}`
      break
    case "in_transit":
      message = `KIVU Belt Express: Package ${trackingNumber} in transit${location ? ` at ${location}` : ""}. Track: ${process.env.NEXT_PUBLIC_API_URL}/track/${trackingNumber}`
      break
    case "out_for_delivery":
      message = `KIVU Belt Express: Package ${trackingNumber} out for delivery. Track: ${process.env.NEXT_PUBLIC_API_URL}/track/${trackingNumber}`
      break
    case "delivered":
      message = `KIVU Belt Express: Package ${trackingNumber} delivered successfully. Thank you!`
      break
    case "cancelled":
      message = `KIVU Belt Express: Package ${trackingNumber} cancelled. Contact us for info.`
      break
    default:
      message = `KIVU Belt Express: Package ${trackingNumber} status: ${status}. Track: ${process.env.NEXT_PUBLIC_API_URL}/track/${trackingNumber}`
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
  const message = typeof templateFn === "function" ? (templateFn as any)(...args) : templateFn

  return await sendSMS({
    to: phoneNumber,
    message,
  })
}
