import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"

// Utility: returns due packages (within +/- 60 seconds of current UTC time) and eligible statuses
async function findDuePackages() {
  const rows = await sql<{
    package_id: string
  }[]>`
    SELECT package_id
    FROM packages
    WHERE delivery_time IS NOT NULL
      AND status IN ('registered', 'picked_up')
      AND ABS(EXTRACT(EPOCH FROM (delivery_time - (now() AT TIME ZONE 'UTC')))) <= 60
  `
  return rows || []
}

export async function GET(_req: NextRequest) {
  try {
    const due = await findDuePackages()
    return NextResponse.json({ success: true, dueCount: due.length, duePackages: due })
  } catch (error) {
    console.error("auto-transition GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to check due packages" }, { status: 500 })
  }
}

export async function POST(_req: NextRequest) {
  try {
    // Update all due packages to in_transit and return changed ids
    const updated = await sql<{
      package_id: string
    }[]>`
      UPDATE packages
      SET status = 'in_transit', updated_at = now()
      WHERE delivery_time IS NOT NULL
        AND status IN ('registered', 'picked_up')
        AND ABS(EXTRACT(EPOCH FROM (delivery_time - (now() AT TIME ZONE 'UTC')))) <= 60
      RETURNING package_id
    `

    const updatedIds = (updated || []).map((r) => r.package_id)

    // Insert tracking entries for the updated packages
    if (updatedIds.length > 0) {
      // Insert one row per package_id (simple and reliable)
      for (const id of updatedIds) {
        try {
          await sql`
            // INSERT INTO tracking (
            //   package_id,
            //   status,
            //   location_name,
            //   progress_percentage,
            //   notes,
            //   updated_by
            // ) VALUES (
            //   ${id},
            //   'in_transit',
            //   'Auto transition',
            //   ${30},
            //   'Auto-updated to in_transit when delivery_time matched current time',
            //   'system'
            // )
          `
        } catch (e) {
          console.error("Failed to insert tracking row for", id, e)
        }
      }
    }

    return NextResponse.json({
      success: true,
      transitionedCount: updatedIds.length,
      transitionedPackages: updatedIds,
    })
  } catch (error) {
    console.error("auto-transition POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to update packages" }, { status: 500 })
  }
}
