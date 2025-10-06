import { NextRequest, NextResponse } from "next/server"
import { sendSMS } from "@/lib/sms"

const templates = {
  departure: (ctx: any) => `Your package ${ctx.package_id} has departed from ${ctx.origin}. Estimated delivery: ${ctx.eta}`,
  in_transit: (ctx: any) => `Package ${ctx.package_id} is now in transit. Current location: ${ctx.location}`,
  off_route: (ctx: any) => `ALERT: Vehicle carrying ${ctx.package_id} is off route. Investigating...` ,
  delayed: (ctx: any) => `Update: Package ${ctx.package_id} delivery delayed. New ETA: ${ctx.new_eta}`,
  delivered: (ctx: any) => `SUCCESS: Package ${ctx.package_id} delivered to ${ctx.receiver_name} at ${ctx.timestamp}`,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, template, context } = body || {}

    if (!to || !template) {
      return NextResponse.json({ success: false, error: "Missing 'to' or 'template'" }, { status: 400 })
    }

    const build = (templates as any)[template]
    if (!build) {
      return NextResponse.json({ success: false, error: "Unknown template" }, { status: 400 })
    }

    const message = build(context || {})
    const result = await sendSMS({ to, message })
    return NextResponse.json({ success: result.success, messageId: result.messageId, error: result.error })
  } catch (error) {
    console.error("/api/notifications/send error:", error)
    return NextResponse.json({ success: false, error: "Send failed" }, { status: 500 })
  }
}
