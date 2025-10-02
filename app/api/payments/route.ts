import { auth } from '@/lib/auth'
import { sql } from '@/lib/database'
import { generatePaymentReference } from '@/lib/generators'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      )
    }

    if (!['admin', 'agent'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const data = await request.json()

    // Validate required fields
    if (!data.packageId || !data.amount || !data.paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: packageId, amount, paymentMethod' },
        { status: 400 }
      )
    }

    // Verify that payment method is valid
    const validPaymentMethods = ['cash', 'mobile_money', 'bank_transfer']
    if (!validPaymentMethods.includes(data.paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Must be one of: cash, mobile_money, bank_transfer' },
        { status: 400 }
      )
    }

    // Verify package exists and payment amount matches
    const packageCheck = await sql`
      SELECT package_id, delivery_fee, status 
      FROM packages 
      WHERE package_id = ${data.packageId}
    `

    if (packageCheck.length === 0) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    const packageData = packageCheck[0]

    // Check if package is in a valid status for payment
    const validStatuses = ['registered', 'picked_up', 'in_transit', 'out_for_delivery']
    if (!validStatuses.includes(packageData.status)) {
      return NextResponse.json(
        { error: 'Package is not in a valid status for payment' },
        { status: 400 }
      )
    }

    // Verify payment amount matches delivery fee
    if (parseFloat(data.amount) !== parseFloat(packageData.delivery_fee)) {
      return NextResponse.json(
        { error: 'Payment amount does not match delivery fee' },
        { status: 400 }
      )
    }

    // Check for existing payments
    const existingPayment = await sql`
      SELECT payment_id, payment_status
      FROM payments
      WHERE package_id = ${data.packageId}
      AND payment_status IN ('confirmed', 'pending')
    `

    if (existingPayment.length > 0) {
      const status = existingPayment[0].payment_status
      if (status === 'confirmed') {
        return NextResponse.json(
          { error: 'Package has already been paid for' },
          { status: 400 }
        )
      } else if (status === 'pending') {
        return NextResponse.json(
          { error: 'Package has a pending payment' },
          { status: 400 }
        )
      }
    }

    // Generate payment ID and create payment record
    const payment_id = generatePaymentReference()
    
    const result = await sql`
      INSERT INTO payments (
        payment_id,
        package_id,
        amount,
        payment_method,
        payment_status,
        transaction_reference,
        confirmed_by,
        created_at
      ) VALUES (
        ${payment_id},
        ${data.packageId},
        ${data.amount},
        ${data.paymentMethod},
        'pending',
        ${data.transactionReference || null},
        ${user.user_id},
        NOW()
      )
      RETURNING *
    `

    // If payment method is cash, automatically confirm the payment
    if (data.paymentMethod === 'cash') {
      await sql`
        UPDATE payments 
        SET 
          payment_status = 'confirmed',
          confirmed_at = NOW()
        WHERE payment_id = ${payment_id}
      `

      // Also update the payment record in our result
      result[0].payment_status = 'confirmed'
      result[0].confirmed_at = new Date().toISOString()
    }

    // Create a notification for payment
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
        ${generatePaymentReference()}, -- using same generator for notification ID
        ${data.packageId},
        ${packageCheck[0].sender_phone},
        ${`Payment of ${data.amount} received for package ${data.packageId} via ${data.paymentMethod}`},
        'system',
        'pending',
        NOW()
      )
    `

    return NextResponse.json({
      message: data.paymentMethod === 'cash' 
        ? 'Payment processed and confirmed successfully'
        : 'Payment recorded successfully and awaiting confirmation',
      payment: result[0]
    })

  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const packageId = searchParams.get('packageId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    let query = sql`
      SELECT
        p.*,
        pkg.sender_name,
        pkg.sender_phone,
        pkg.receiver_name,
        pkg.receiver_phone,
        pkg.delivery_fee,
        u.full_name as confirmed_by_name
      FROM payments p
      LEFT JOIN packages pkg ON p.package_id = pkg.package_id
      LEFT JOIN users u ON p.confirmed_by = u.user_id
      WHERE 1=1
    `

    // Add filters if provided
    if (packageId) {
      query = sql`${query} AND p.package_id = ${packageId}`
    }

    if (status) {
      query = sql`${query} AND p.payment_status = ${status}`
    }

    // Add pagination
    query = sql`
      ${query}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `

    const payments = await query

    // Get total count for pagination
    const totalResult = await sql`
      SELECT COUNT(*) 
      FROM payments
      WHERE 1=1
      ${packageId ? sql`AND package_id = ${packageId}` : sql``}
      ${status ? sql`AND payment_status = ${status}` : sql``}
    `

    const total = parseInt(totalResult[0].count)

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}