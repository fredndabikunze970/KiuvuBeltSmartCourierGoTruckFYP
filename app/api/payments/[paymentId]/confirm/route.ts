import { auth } from "@/lib/auth"
import { sql } from "@/lib/database"
import { sendTemplatedSMS } from "@/lib/sms"
import { formatPhoneNumber } from "@/lib/utils"
import { NextResponse, type NextRequest } from "next/server"

// Add the generatePaymentReference function here
function generatePaymentReference(): string {
  const prefix = "PAY"
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
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
    try {
      data = await request.json()
    } catch (e) {
      // No JSON body sent, keep data as empty object
    }

    // Validate required fields - ONLY payment_method is required now
    if (!data.payment_method) {
      return NextResponse.json(
        { error: "Missing required field: payment_method is required" },
        { status: 400 }
      )
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

    // Send confirmation SMS to both sender and receiver
    try {
      // Send to sender - use currentPayment.sender_phone which we selected earlier
      const formattedSenderPhone = formatPhoneNumber(currentPayment.sender_phone);
      await sendTemplatedSMS(
        formattedSenderPhone,
        "PAYMENT_RECEIVED",
        currentPayment.amount,
        currentPayment.package_id
      )

      // Log success
      console.log(`✅ Payment confirmation SMS sent to sender (${currentPayment.sender_phone})`)

      // Create notification record - FIXED: Use 'sms' as notification_type
      const notificationMessage = `Payment of ${currentPayment.amount} RWF confirmed for package ${currentPayment.package_id}. Reference: ${newPaymentReference}`
      
      await sql`
        INSERT INTO notifications (
          notification_id,
          package_id,
          recipient_phone,
          message,
          notification_type,
          status,
          sent_at,
          created_at
        ) VALUES (
          ${paymentId + '_notification'},
          ${currentPayment.package_id},
          ${currentPayment.sender_phone},
          ${notificationMessage},
          'sms', -- FIXED: Changed from 'payment_confirmation' to 'sms'
          'sent',
          NOW(), -- Set sent_at to current timestamp
          NOW()
        )
      `

      console.log(`✅ Notification created for payment confirmation`)

    } catch (error) {
      console.error("❌ Failed to send payment SMS to sender:", error)
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