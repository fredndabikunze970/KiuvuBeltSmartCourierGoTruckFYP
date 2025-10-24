import { auth } from "@/lib/auth"
import { sql } from "@/lib/database"
// SMS sending removed from confirmation flow
import { NextResponse, type NextRequest } from "next/server"

// Add the generatePaymentReference function here
function generatePaymentReference(): string {
  const prefix = "PAY"
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

async function handleConfirmPayment(
  request: NextRequest,
  params: { paymentId: string }
) {
  try {
    const user = await auth(request)
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Please login first" },
        { status: 401 }
      )
    }

    if (!["admin", "agent"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { paymentId } = params
    let data: { payment_method?: string } = {}
    const ct = request.headers.get('content-type') || ''

    // Read the body as text first to avoid stream consumption issues
    let bodyText = ''
    try {
      bodyText = await request.text()
    } catch (e) {
      console.warn('Failed to read request body as text', { paymentId, contentType: ct })
        // As a last resort, try to read raw bytes and decode - some clients send unusual encodings
        try {
          const buf = await request.arrayBuffer()
          if (buf && buf.byteLength > 0) {
            const txt = new TextDecoder().decode(buf)
            try {
              data = JSON.parse(txt)
            } catch (parseErr) {
              console.warn('Failed to parse JSON from raw bytes after fallback', { paymentId, contentType: ct, length: buf.byteLength })
            }
          } else {
            console.warn('Empty request body for JSON content-type after arrayBuffer fallback', { paymentId, contentType: ct })
          }
        } catch (abErr) {
          console.warn('Failed to read request body as text or arrayBuffer', { paymentId, contentType: ct })
        }
    }

    if (ct.includes('application/json') && bodyText.trim()) {
      try {
        data = JSON.parse(bodyText)
      } catch (parseErr) {
        console.warn('Failed to parse JSON body', { paymentId, contentType: ct, bodyLength: bodyText.length })
      }
    } else if (ct.includes('application/x-www-form-urlencoded') && bodyText.trim()) {
      const params = new URLSearchParams(bodyText)
      data.payment_method = params.get('payment_method') || undefined
    } else if (ct.includes('multipart/form-data') && bodyText.trim()) {
      // For multipart, we need to parse differently, but for simplicity, try to extract payment_method
      const formMatch = bodyText.match(/name="payment_method"[\s\S]*?\r?\n\r?\n([^\r\n]+)/)
      if (formMatch) {
        data.payment_method = formMatch[1]
      }
    } else if (!ct && bodyText.trim()) {
      // No content-type: try JSON first, then treat as raw payment_method
      try {
        data = JSON.parse(bodyText)
      } catch {
        // If not JSON, assume the body is the payment_method value
        data.payment_method = bodyText.trim()
      }
    }

    // Fallbacks: allow payment_method via query param or custom header for integration compatibility
    if (!data.payment_method) {
      const url = new URL(request.url)
      const pm = url.searchParams.get('payment_method') || url.searchParams.get('paymentMethod') || url.searchParams.get('method') || request.headers.get('x-payment-method') || request.headers.get('x-paymentmethod') || request.headers.get('x-method') || undefined
      if (pm) data.payment_method = pm as string
    }

    // Also accept alternative field names from parsed body
    if (!data.payment_method && typeof data === 'object' && data !== null) {
      const alt = (data as any).paymentMethod || (data as any).method || (data as any).payment_type || (data as any).method_type || (data as any).pm
      if (alt && typeof alt === 'string') data.payment_method = alt
      // If body contains nested envelope like { data: { payment_method: 'cash' } }
      if (!data.payment_method && (data as any).data && typeof (data as any).data === 'object') {
        const nested = (data as any).data
        const nestedAlt = nested.payment_method || nested.paymentMethod || nested.method
        if (nestedAlt && typeof nestedAlt === 'string') data.payment_method = nestedAlt
      }
    }

    // Default to 'cash' if payment_method is not provided
    if (!data.payment_method) {
      data.payment_method = 'cash'
    }

    // First check if payment exists and is in pending state
    const paymentCheck = await sql`
      SELECT p.*, pkg.sender_name, pkg.sender_phone, pkg.receiver_name, pkg.receiver_phone, pkg.package_id
      FROM payments p
      JOIN packages pkg ON p.package_id = pkg.package_id
      WHERE p.payment_id = ${paymentId}
    `

    if (!paymentCheck.length) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    const currentPayment = paymentCheck[0]

    if (currentPayment.payment_status !== 'pending') {
      return NextResponse.json(
        { error: "Payment is already " + currentPayment.payment_status },
        { status: 409 }
      )
    }

    // Generate new payment reference
    const newPaymentReference = generatePaymentReference()
    console.log(`🔄 Generated new payment reference: ${newPaymentReference}`)

    // Update payment status - set new transaction_reference
    const result = await sql`
      UPDATE payments
      SET 
        payment_status = 'confirmed',
        payment_method = ${data.payment_method},
        payment_reference = ${newPaymentReference},
        confirmed_by = ${user.user_id},
        confirmed_at = NOW()
      WHERE payment_id = ${paymentId}
      RETURNING *
    `

    if (!result?.length) {
      return NextResponse.json(
        { error: "Failed to update payment" },
        { status: 500 }
      )
    }

    const updatedPayment = result[0]

    // Create a notification record for downstream processing (but do not send SMS).
    // The notification is created with status 'pending' so a background worker or
    // admin UI can process/dispatch it later.
    try {
      const notificationMessage = `Payment of ${currentPayment.amount} RWF confirmed for package ${currentPayment.package_id}. Reference: ${newPaymentReference}`

      await sql`
        INSERT INTO notifications (
          notification_id,
          package_id,
          recipient_phone,
          message,
          notification_type,
          status,
          created_at
        ) VALUES (
          ${generatePaymentReference()},
          ${currentPayment.package_id},
          ${currentPayment.sender_phone},
          ${notificationMessage},
          'system',
          'pending',
          NOW()
        )
      `

      console.log(`ℹ️ Notification record created (pending) for payment ${paymentId}`)
    } catch (notifyError) {
      // Non-fatal: log and continue. We don't want notification failures to block confirmation.
      console.error(`⚠️ Failed to create notification record for payment ${paymentId}:`, notifyError)
    }

    // Get confirming user details
    const confirmedByUser = await sql`
      SELECT full_name, email FROM users WHERE user_id = ${user.user_id}
    `

    return NextResponse.json({
      message: "Payment confirmed successfully",
      payment: {
        ...updatedPayment,
        sender_name: currentPayment.sender_name,
        sender_phone: currentPayment.sender_phone,
        receiver_name: currentPayment.receiver_name,
        receiver_phone: currentPayment.receiver_phone,
        confirmed_by_name: confirmedByUser[0]?.full_name || user.email,
        confirmed_by_role: user.role,
        // Include the new transaction reference in response
        transaction_reference: newPaymentReference
      }
    })
  } catch (error) {
    console.error("Error confirming payment:", error)
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: { paymentId: string } }) {
  return handleConfirmPayment(request, params)
}

export async function PUT(request: NextRequest, { params }: { params: { paymentId: string } }) {
  return handleConfirmPayment(request, params)
}