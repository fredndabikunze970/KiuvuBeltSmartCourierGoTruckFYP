import { db, sql } from "@/lib/database"
import { sendSMS } from "@/lib/sms"

/**
 * Automated arrival handler for packages reaching 100% progress
 * 
 * This function performs the following actions when a package reaches 100% progress:
 * 1. Updates the packages table: status = 'arrived', updated_at = NOW(), delivered_at = NOW()
 * 2. Updates the tracking table: status = 'arrived', progress_percentage = 100, adds arrival note
 * 3. Sends SMS notifications to sender and receiver
 * 
 * @param packageId - The package ID to mark as arrived
 * @param packageData - Optional package data if already fetched (to avoid redundant queries)
 * @returns Promise<boolean> - Returns true if successfully processed, false otherwise
 */
export async function handlePackageArrival(
  packageId: string,
  packageData?: any
): Promise<boolean> {
  try {
    // Fetch package data if not provided
    let pkg = packageData
    if (!pkg) {
      const result = await sql`
        SELECT * FROM packages WHERE package_id = ${packageId}
      `
      if (result.length === 0) {
        console.error(`Package ${packageId} not found`)
        return false
      }
      pkg = result[0]
    }

    // Skip if already marked as arrived
    if (pkg.status === 'arrived') {
      console.log(`Package ${packageId} already marked as arrived`)
      return true
    }

    console.log(`Processing arrival for package ${packageId}`)

    // Perform database updates in a single transaction to ensure consistency
    try {
      await db.query('BEGIN')

      // Lock the package row to avoid race conditions
      const packagesRes = await db.query('SELECT * FROM packages WHERE package_id = $1 FOR UPDATE', [packageId])
      if (packagesRes.length === 0) {
        await db.query('ROLLBACK')
        console.error(`Package ${packageId} not found during transaction`)
        return false
      }

      // If already arrived, rollback and skip
      if (packagesRes[0].status === 'arrived') {
        await db.query('ROLLBACK')
        console.log(`Package ${packageId} was already marked arrived inside transaction`)
        return true
      }

      // 1) Update packages
      await db.query('UPDATE packages SET status = $1, updated_at = NOW(), delivered_at = NOW() WHERE package_id = $2', ['arrived', packageId])

      // 2) Update existing tracking rows for this package to arrived where necessary
      await db.query(
        `UPDATE tracking
         SET progress_percentage = 100,
             status = $1,
             notes = CASE WHEN notes IS NULL OR notes = '' THEN $2 ELSE notes || ' | ' || $2 END,
             updated_by = COALESCE(updated_by, 'system')
         WHERE package_id = $3
           AND (progress_percentage IS NULL OR progress_percentage < 100 OR status IS DISTINCT FROM $1)`,
        ['arrived', 'Package successfully arrived at destination', packageId]
      )

      // 3) Insert a final tracking entry to record the arrival
      const insertRes = await db.query(
        `INSERT INTO tracking (package_id, status, location_name, progress_percentage, notes, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [packageId, 'arrived', pkg.receiver_address || 'Destination', 100, 'Package successfully arrived at destination - Delivery complete', 'system']
      )

      await db.query('COMMIT')
      console.log(`✓ Database updates committed for ${packageId}`)
    } catch (err) {
      try { await db.query('ROLLBACK') } catch (e) { /* ignore rollback errors */ }
      console.error(`Transaction failed for package ${packageId}:`, err)
      return false
    }

    // 4. Send SMS notifications to both parties (best-effort; failure doesn't rollback DB)
    const publicBase = process.env.NEXT_PUBLIC_TRACK && !process.env.NEXT_PUBLIC_TRACK.includes('localhost')
      ? process.env.NEXT_PUBLIC_API_TRACK
      : `https://kivubeltsmartcouriergotruck.onrender.com/track`

    const trackingUrl = `${publicBase}/api/track/${packageId}`

    // Send to receiver
    if (pkg.receiver_phone) {
      try {
        const receiverMsg = `KIVU Belt Express: Your package ${packageId} has arrived at its destination! Track: ${trackingUrl}`
        await sendSMS({ 
          to: formatPhoneNumber(pkg.receiver_phone), 
          message: receiverMsg 
        })
        console.log(`✓ Sent arrival SMS to receiver for ${packageId}`)
      } catch (err) {
        console.error(`Failed to send arrival SMS to receiver for ${packageId}:`, err)
      }
    }

    // Send to sender
    if (pkg.sender_phone) {
      try {
        const senderMsg = `KIVU Belt Express: Package ${packageId} has been successfully delivered! Track: ${trackingUrl}`
        await sendSMS({ 
          to: formatPhoneNumber(pkg.sender_phone), 
          message: senderMsg 
        })
        console.log(`✓ Sent arrival SMS to sender for ${packageId}`)
      } catch (err) {
        console.error(`Failed to send arrival SMS to sender for ${packageId}:`, err)
      }
    }

    console.log(`✅ Successfully processed arrival for package ${packageId}`)
    return true

  } catch (error) {
    console.error(`Error handling arrival for package ${packageId}:`, error)
    return false
  }
}

/**
 * Format phone number to E.164 format for SMS
 */
function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // If it starts with 0 and is a Rwandan number (10 digits after 0), replace 0 with +250
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '250' + cleaned.slice(1)
  }
  
  // If it doesn't start with country code, assume Rwanda (+250)
  if (!cleaned.startsWith('250') && cleaned.length === 9) {
    cleaned = '250' + cleaned
  }
  
  // Add + prefix if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  
  return cleaned
}

/**
 * Check if a package has reached 100% progress and trigger arrival automation
 * Call this function after updating tracking progress
 * 
 * @param packageId - The package ID to check
 * @param currentProgress - The current progress percentage (0-100)
 */
export async function checkAndHandleArrival(
  packageId: string,
  currentProgress: number
): Promise<void> {
  if (currentProgress === 100) {
    console.log(`Package ${packageId} reached 100% progress - triggering arrival automation`)
    await handlePackageArrival(packageId)
  }
}
