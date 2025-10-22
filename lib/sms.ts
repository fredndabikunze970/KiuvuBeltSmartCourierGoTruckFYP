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
  // Use a real domain - NEVER use localhost in production
  const trackingUrl = process.env.NEXT_PUBLIC_API_TRACK?.includes('localhost') 
    ? `https://kivubeltsmartcouriergotruck.onrender.com/track/${trackingNumber}` // Replace with your real domain
    : `${process.env.NEXT_PUBLIC_API_TRACK}/track/${trackingNumber}`;

  let message = ""

  switch (status) {
    case "registered":
      message = `KIVU: Your package ${trackingNumber} is registered. Track: ${trackingUrl} Reply HELP for support.`
      break
    case "picked_up":
      message = `KIVU: Package ${trackingNumber} picked up and in transit. Track: ${trackingUrl}`
      break
    case "in_transit":
      message = `KIVU: Package ${trackingNumber} in transit${location ? ` at ${location}` : ""}. Track: ${trackingUrl}`
      break
    case "out_for_delivery":
      message = `KIVU: Package ${trackingNumber} out for delivery today. Please be available. Track: ${trackingUrl}`
      break
    case "delivered":
      message = `KIVU: Package ${trackingNumber} delivered successfully. Thank you for choosing KIVU!`
      break
    case "cancelled":
      message = `KIVU: Package ${trackingNumber} cancelled. Contact us for assistance.`
      break
    default:
      message = `KIVU: Package ${trackingNumber} status update: ${status}. Track: ${trackingUrl}`
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
  WELCOME: (name: string) => `Welcome to KIVU Belt Express${name ? `, ${name}` : ''}! We're happy to serve you. Reply HELP for support.`,
  PACKAGE_REGISTERED: (trackingNumber: string) =>
    `KIVU: Your package ${trackingNumber} is registered. We'll notify you of updates. Reply STOP to unsubscribe.`,
  DELIVERY_REMINDER: (trackingNumber: string, receiverName: string) =>
    `Hi ${receiverName}, your KIVU package ${trackingNumber} arrives today. Please be available. Reply HELP for support.`,
  PAYMENT_RECEIVED: (amount: number, trackingNumber: string) =>
    `KIVU: Payment of ${amount} RWF received for package ${trackingNumber}. Thank you!`,
  // New carrier-friendly templates
  STATUS_UPDATE: (trackingNumber: string, status: string) =>
    `KIVU: Package ${trackingNumber} status - ${status}. Track at kivubelt.com. Reply STOP to unsubscribe.`,
  SECURITY_CODE: (code: string) =>
    `KIVU: Your security code is ${code}. Valid for 10 minutes.`,
  DRIVER_ARRIVING: (trackingNumber: string, minutes: number) =>
    `KIVU: Driver arriving in ${minutes} minutes with package ${trackingNumber}. Please be ready.`
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

// New function for testing message delivery
export async function testSMSDelivery(phoneNumber: string): Promise<SMSResult> {
  const testMessage = "KIVU: Test message. Please reply if received."
  
  return await sendSMS({
    to: phoneNumber,
    message: testMessage,
  })
}

// Improved message validator
export function validateMessageContent(message: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for problematic content
  if (message.includes('localhost')) {
    issues.push('Contains localhost URL - use real domain');
  }
  if (message.toUpperCase() === message && message.length > 10) {
    issues.push('Too many uppercase letters - use normal case');
  }
  if (message.includes('!!!') || message.includes('???')) {
    issues.push('Excessive punctuation - use normal punctuation');
  }
  if (message.length > 320) {
    issues.push('Message too long - keep under 320 characters');
  }
  
  // Check for spam triggers
  const spamTriggers = ['FREE', 'WIN', 'PRIZE', 'URGENT', 'ACT NOW'];
  spamTriggers.forEach(trigger => {
    if (message.toUpperCase().includes(trigger)) {
      issues.push(`Potential spam trigger: ${trigger}`);
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}