import { auth } from '@/lib/auth'
import { sql } from '@/lib/database'
import { generatePackageId, generatePaymentReference, generatePickupCode } from '@/lib/generators'
import { sendSMS } from '@/lib/sms'
import { formatPhoneNumber } from '@/lib/utils'
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
    const package_id = generatePackageId()
    const pickup_code = generatePickupCode()

    const result = await sql`
      INSERT INTO packages (
        package_id,
        pickup_code,
        sender_name,
        sender_phone,
        sender_address,
        origin_branch_id,
        receiver_name,
        receiver_phone,
        receiver_address,
        destination_branch_id,
        package_description,
        weight,
        dimensions,
        declared_value,
        delivery_fee,
        priority,
        assigned_car,
        assigned_driver,
        agent_id,
        status,
        delivery_time
      ) VALUES (
        ${package_id},
        ${pickup_code},
        ${data.senderName},
        ${data.senderPhone},
        ${data.senderAddress},
        ${data.originBranchId},
        ${data.receiverName},
        ${data.receiverPhone},
        ${data.receiverAddress},
        ${data.destinationBranchId},
        ${data.packageDescription},
        ${data.weight},
        ${data.dimensions},
        ${data.declaredValue},
        ${data.deliveryFee},
        ${data.priority || 'normal'},
        ${data.assignedCarId || null},
        ${data.assignedDriverId || null},
        ${user.user_id},
        'registered',
        ${data.deliveryTime || null}
      )
      RETURNING *
    `

    // Create initial tracking entry
    await sql`
      INSERT INTO tracking (
        package_id,
        status,
        location_name,
        progress_percentage,
        notes,
        updated_by
      ) VALUES (
        ${package_id},
        'registered',
        'Package registered',
        ${0},
        'Package has been registered in the system',
        ${user.user_id}
      )
    `

    // Create payment entry
    const payment_id = generatePaymentReference()
    const payment = await sql`
      INSERT INTO payments (
        payment_id,
        package_id,
        amount,
        payment_method,
        payment_status,
        payment_reference,
        confirmed_by
      ) VALUES (
        ${payment_id},
        ${package_id},
        ${data.deliveryFee},
        ${data.paymentMethod || 'cash'},
        'pending',
        ${data.transactionReference || null},
        ${user.user_id}
      )
      RETURNING *
    `

    // Check if we have valid results before accessing array indices
    if (!result?.length || !payment?.length) {
      throw new Error('Failed to create package or payment record')
    }

    // Send SMS notifications to sender and receiver
    const smsResults = {
      sender: { success: false, error: null as string | null },
      receiver: { success: false, error: null as string | null }
    };

    try {
      const packageData = result[0];
      const trackingUrl = `${process.env.NEXT_PUBLIC_API_URL}/track/${packageData.package_id}`;
      console.log('📱 Preparing to send SMS notifications...');

      // Format phone numbers (remove spaces, ensure +250 prefix)
      const senderPhone = formatPhoneNumber(packageData.sender_phone.trim());
      const receiverPhone = formatPhoneNumber(packageData.receiver_phone.trim());

      // Send SMS to sender
      console.log(`📱 Sending SMS to sender (${senderPhone})...`);
      const senderMessage = `KIVU Belt Express: Package ${packageData.package_id} registered. Code: ${packageData.pickup_code}. Track: ${trackingUrl}`;
      const senderSMSResult = await sendSMS({
        to: senderPhone,
        message: senderMessage
      });

      if (senderSMSResult.success) {
        console.log(`✅ SMS sent successfully to sender (${senderPhone})`);
        smsResults.sender = { success: true, error: null };
      } else {
        console.error(`❌ Failed to send SMS to sender:`, senderSMSResult.error);
        smsResults.sender = { success: false, error: senderSMSResult.error || 'Unknown error' };
      }

      // Send SMS to receiver
      console.log(`📱 Sending SMS to receiver (${receiverPhone})...`);
      const receiverMessage = `KIVU Belt Express: Package ${packageData.package_id} from ${packageData.sender_name}. Code: ${packageData.pickup_code}. Track: ${trackingUrl}`;
      const receiverSMSResult = await sendSMS({
        to: receiverPhone,
        message: receiverMessage
      });

      if (receiverSMSResult.success) {
        console.log(`✅ SMS sent successfully to receiver (${receiverPhone})`);
        smsResults.receiver = { success: true, error: null };
      } else {
        console.error(`❌ Failed to send SMS to receiver:`, receiverSMSResult.error);
        smsResults.receiver = { success: false, error: receiverSMSResult.error || 'Unknown error' };
      }

    } catch (smsError) {
      console.error('❌ Unexpected error sending SMS notifications:', smsError);
      // Store error details for both if we hit an unexpected error
      const errorMessage = smsError instanceof Error ? smsError.message : 'Unknown SMS error';
      smsResults.sender.error = smsResults.sender.error || errorMessage;
      smsResults.receiver.error = smsResults.receiver.error || errorMessage;
    }

    // Return response with SMS status
    return NextResponse.json({
      message: 'Package registered successfully',
      package: result[0],
      payment: payment[0],
      smsNotifications: {
        sender: {
          success: smsResults.sender.success,
          error: smsResults.sender.error,
          phone: result[0].sender_phone
        },
        receiver: {
          success: smsResults.receiver.success,
          error: smsResults.receiver.error,
          phone: result[0].receiver_phone
        }
      }
    })
  } catch (error) {
    console.error('Error registering package:', error)
    return NextResponse.json(
      { error: 'Failed to register package' },
      { status: 500 }
    )
  }
}