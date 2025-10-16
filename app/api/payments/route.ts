import { getAuthUser } from '@/lib/auth-middleware'
import { sql } from '@/lib/database'
import { generatePaymentReference } from '@/lib/generators'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
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
    const user = await getAuthUser(request)
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
  const dateRange = (searchParams.get('dateRange') || 'all').toLowerCase()
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

    // Add role-based filter
    if (user.role === 'agent') {
      query = sql`${query} AND pkg.origin_branch_id = ${user.branch_id}`
    }

    // Add filters if provided
    if (packageId) {
      query = sql`${query} AND p.package_id = ${packageId}`
    }

    if (status) {
      query = sql`${query} AND p.payment_status = ${status}`
    }

    // Date range filter (applies to payments.created_at)
    // Supported values: all, today, yesterday, this_week, this_month
    if (dateRange && dateRange !== 'all') {
      if (dateRange === 'today') {
        query = sql`${query} AND p.created_at >= (now() at time zone 'utc')::date AND p.created_at < ((now() at time zone 'utc')::date + INTERVAL '1 day')`
      } else if (dateRange === 'yesterday') {
        query = sql`${query} AND p.created_at >= ((now() at time zone 'utc')::date - INTERVAL '1 day') AND p.created_at < (now() at time zone 'utc')::date`
      } else if (dateRange === 'this_week') {
        // start of week (Monday) in UTC
        query = sql`${query} AND p.created_at >= (date_trunc('week', now() at time zone 'utc')) AND p.created_at < (date_trunc('week', now() at time zone 'utc') + INTERVAL '7 days')`
      } else if (dateRange === 'this_month') {
        query = sql`${query} AND p.created_at >= (date_trunc('month', now() at time zone 'utc')) AND p.created_at < (date_trunc('month', now() at time zone 'utc') + INTERVAL '1 month')`
      }
    }

    // Add pagination
    query = sql`
      ${query}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `

    const payments = await query

    // Get total count for pagination
    let totalQuery = sql`
      SELECT COUNT(*)
      FROM payments p
      LEFT JOIN packages pkg ON p.package_id = pkg.package_id
      WHERE 1=1
    `

    if (user.role === 'agent') {
      totalQuery = sql`${totalQuery} AND pkg.origin_branch_id = ${user.branch_id}`
    }

    if (packageId) {
      totalQuery = sql`${totalQuery} AND p.package_id = ${packageId}`
    }

    if (status) {
      totalQuery = sql`${totalQuery} AND p.payment_status = ${status}`
    }

    // Mirror dateRange filter for total count
    if (dateRange && dateRange !== 'all') {
      if (dateRange === 'today') {
        totalQuery = sql`${totalQuery} AND p.created_at >= (now() at time zone 'utc')::date AND p.created_at < ((now() at time zone 'utc')::date + INTERVAL '1 day')`
      } else if (dateRange === 'yesterday') {
        totalQuery = sql`${totalQuery} AND p.created_at >= ((now() at time zone 'utc')::date - INTERVAL '1 day') AND p.created_at < (now() at time zone 'utc')::date`
      } else if (dateRange === 'this_week') {
        totalQuery = sql`${totalQuery} AND p.created_at >= (date_trunc('week', now() at time zone 'utc')) AND p.created_at < (date_trunc('week', now() at time zone 'utc') + INTERVAL '7 days')`
      } else if (dateRange === 'this_month') {
        totalQuery = sql`${totalQuery} AND p.created_at >= (date_trunc('month', now() at time zone 'utc')) AND p.created_at < (date_trunc('month', now() at time zone 'utc') + INTERVAL '1 month')`
      }
    }

    const totalResult = await totalQuery

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