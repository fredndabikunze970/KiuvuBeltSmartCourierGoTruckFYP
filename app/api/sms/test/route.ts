import { type NextRequest, NextResponse } from "next/server"
import { sendSMS, sendPackageNotification, SMS_TEMPLATES, sendTemplatedSMS } from "@/lib/sms"
import { requireAdmin } from "@/lib/auth-middleware"

export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    const { type, phoneNumber, message, trackingNumber, status, template, templateArgs } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    let result

    switch (type) {
      case "custom":
        if (!message) {
          return NextResponse.json({ error: "Message is required for custom SMS" }, { status: 400 })
        }
        result = await sendSMS({ to: phoneNumber, message })
        break

      case "package_notification":
        if (!trackingNumber || !status) {
          return NextResponse.json({ error: "Tracking number and status are required" }, { status: 400 })
        }
        result = await sendPackageNotification(phoneNumber, trackingNumber, status)
        break

      case "template":
        if (!template) {
          return NextResponse.json({ error: "Template name is required" }, { status: 400 })
        }
        result = await sendTemplatedSMS(phoneNumber, template, ...(templateArgs || []))
        break

      default:
        return NextResponse.json({ error: "Invalid SMS type" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      result,
      message: "SMS sent successfully",
    })
  } catch (error) {
    console.error("SMS test error:", error)
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 })
  }
})

export const GET = requireAdmin(async (request: NextRequest) => {
  return NextResponse.json({
    success: true,
    templates: Object.keys(SMS_TEMPLATES),
    testModes: ["custom", "package_notification", "template"],
    sampleData: {
      phoneNumber: "+250788123456",
      trackingNumber: "KB202501001",
      status: "in_transit",
      message: "This is a test SMS from KIVU Belt Express",
      template: "WELCOME",
      templateArgs: ["John Doe"],
    },
  })
})
