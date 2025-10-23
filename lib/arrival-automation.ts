import { sql } from "@/lib/database"
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

    // Perform updates using a single atomic SQL statement (safer for serverless DBs)
    // This updates packages, updates existing tracking rows and conditionally inserts
    // a final tracking record only if one with arrived & 100 doesn't already exist.
    const receiverLocation = pkg.receiver_address || 'Destination'

    const result = await sql`
      WITH upd_pkg AS (
        UPDATE packages
        SET status = 'arrived', updated_at = NOW(), delivered_at = NOW()
        WHERE package_id = ${packageId} AND (status IS DISTINCT FROM 'arrived')
        RETURNING package_id
      ),
      upd_tracking AS (
        UPDATE tracking
        SET progress_percentage = 100,
            status = 'arrived',
            notes = CASE WHEN notes IS NULL OR notes = '' THEN 'Package successfully arrived at destination' ELSE notes || ' | Package successfully arrived at destination' END
        WHERE package_id = ${packageId}
          AND (progress_percentage IS NULL OR progress_percentage < 100 OR status IS DISTINCT FROM 'arrived')
        RETURNING id
      ),
      ins AS (
        INSERT INTO tracking (package_id, status, location_name, progress_percentage, notes, updated_by)
        SELECT ${packageId}, 'arrived', ${receiverLocation}, 100, 'Package successfully arrived at destination - Delivery complete', 'system'
        WHERE NOT EXISTS (
          SELECT 1 FROM tracking WHERE package_id = ${packageId} AND status = 'arrived' AND progress_percentage = 100
        )
        RETURNING id, created_at
      )
      SELECT (SELECT count(*) FROM upd_pkg) AS pkg_updated,
             (SELECT count(*) FROM upd_tracking) AS tracking_updated,
             (SELECT id FROM ins) AS new_tracking_id;
    `

    const row = result && result[0] ? result[0] as any : { pkg_updated: 0, tracking_updated: 0, new_tracking_id: null }
    const pkgUpdated = Number(row.pkg_updated || 0)
    const trackingUpdated = Number(row.tracking_updated || 0)
    const newTrackingId = row.new_tracking_id || null

  // Debug: log raw result for troubleshooting
  console.debug('arrival automation SQL result row:', row)

    if (pkgUpdated === 0 && trackingUpdated === 0 && !newTrackingId) {
      console.log(`No database changes were necessary for package ${packageId}`)
      // Still proceed to return true: nothing to do
    } else {
      console.log(`✓ Database updated for ${packageId} (packages: ${pkgUpdated}, tracking rows updated: ${trackingUpdated}, new tracking id: ${newTrackingId})`)
    }

    // Exportable helper (for debugging/testing) - runs the same SQL and returns the raw result
    // Note: we don't call it here; it's exported below.

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

/**
 * Helper to run the arrival SQL block directly and return raw result.
 * Useful for debugging from a script or REPL.
 */
export async function runArrivalUpdate(packageId: string) {
  const receiverLocationRow = await sql`SELECT receiver_address FROM packages WHERE package_id = ${packageId}`
  const receiverLocation = receiverLocationRow && receiverLocationRow[0] ? receiverLocationRow[0].receiver_address || 'Destination' : 'Destination'

  const result = await sql`
    WITH upd_pkg AS (
      UPDATE packages
      SET status = 'arrived', updated_at = NOW(), delivered_at = NOW()
      WHERE package_id = ${packageId} AND (status IS DISTINCT FROM 'arrived')
      RETURNING package_id
    ),
    upd_tracking AS (
      UPDATE tracking
      SET progress_percentage = 100,
          status = 'arrived',
          notes = CASE WHEN notes IS NULL OR notes = '' THEN 'Package successfully arrived at destination' ELSE notes || ' | Package successfully arrived at destination' END,
          updated_by = COALESCE(updated_by, 'system')
      WHERE package_id = ${packageId}
        AND (progress_percentage IS NULL OR progress_percentage < 100 OR status IS DISTINCT FROM 'arrived')
      RETURNING id
    ),
    ins AS (
      INSERT INTO tracking (package_id, status, location_name, progress_percentage, notes, updated_by)
      SELECT ${packageId}, 'arrived', ${receiverLocation}, 100, 'Package successfully arrived at destination - Delivery complete', NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM tracking WHERE package_id = ${packageId} AND status = 'arrived' AND progress_percentage = 100
      )
      RETURNING id, created_at
    )
    SELECT (SELECT count(*) FROM upd_pkg) AS pkg_updated,
           (SELECT count(*) FROM upd_tracking) AS tracking_updated,
           (SELECT id FROM ins) AS new_tracking_id;
  `

  console.debug('runArrivalUpdate SQL result:', result && result[0])
  return result
}
