import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getAuthUser } from "@/lib/auth-middleware"

const PROGRESS: Record<string, number> = {
  registered: 0,
  picked_up: 10,
  in_transit: 30,
  out_for_delivery: 80,
  delivered: 100,
  cancelled: 0,
}

const ALLOWED = new Set(Object.keys(PROGRESS))

export async function PUT(req: NextRequest, { params }: { params: { packageId: string } }) {
  try {
    const user = getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin and agents can update package status
    if (user.role !== "admin" && user.role !== "agent") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const packageId = params.packageId
    const body = await req.json().catch(() => ({}))
    const {
      status,
      notes,
      latitude,
      longitude,
      locationName,
    }: {
      status: string
      notes?: string
      latitude?: number
      longitude?: number
      locationName?: string
    } = body

    if (!packageId) {
      return NextResponse.json({ error: "packageId is required" }, { status: 400 })
    }
    if (!status || !ALLOWED.has(status)) {
      return NextResponse.json({ error: `Invalid status. Allowed: ${Array.from(ALLOWED).join(', ')}` }, { status: 400 })
    }

    // Ensure package exists
    const pkgRows = await sql<{
      package_id: string
      status: string
    }[]>`SELECT package_id, status FROM packages WHERE package_id = ${packageId}`

    if (!pkgRows?.length) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 })
    }

    // Update package status
    await sql`UPDATE packages SET status = ${status}, updated_at = now() WHERE package_id = ${packageId}`

    // Insert tracking row reflecting the new status
    const progress = PROGRESS[status] ?? 0
    const safeLat = typeof latitude === 'number' ? latitude : null
    const safeLng = typeof longitude === 'number' ? longitude : null

    await sql`
      INSERT INTO tracking (
        package_id,
        status,
        location_name,
        progress_percentage,
        notes,
        updated_by,
        latitude,
        longitude
      ) VALUES (
        ${packageId},
        ${status},
        ${locationName || 'Status update'},
        ${progress},
        ${notes || null},
        'system',
        ${safeLat},
        ${safeLng}
      )
    `

    return NextResponse.json({
      message: `Status updated to ${status}`,
      status,
      progressPercentage: progress,
    })
  } catch (error) {
    console.error("/api/packages/[packageId]/status error:", error)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
