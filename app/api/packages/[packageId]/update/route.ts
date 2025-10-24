import { AuthUser, requireAuth } from "@/lib/auth-middleware"
import { db, sql } from "@/lib/database"
import { NextRequest, NextResponse } from "next/server"

export const PUT = requireAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    // Extract packageId from the request URL because requireAuth wrapper does not forward params
    const url = new URL(request.url)
    const parts = url.pathname.split('/').filter(Boolean)
    // Expecting path like /api/packages/:packageId/update
    const pkgIndex = parts.findIndex((p) => p === 'packages')
    const packageId = pkgIndex >= 0 && parts.length > pkgIndex + 1 ? parts[pkgIndex + 1] : null

    if (!packageId) {
      return NextResponse.json({ error: 'packageId not found in path' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))

    // Normalize incoming keys to DB column names
    const {
      status,
      notes,
      sender_name,
      sender_phone,
      sender_address,
      receiver_name,
      receiver_phone,
      receiver_address,
      weight_kg,
      weight,
      dimensions,
    description,
    package_description,
      origin_branch,
      origin_branch_id,
      destination_branch,
      destination_branch_id,
      assigned_car,
      assigned_driver,
    } = body

    // Fetch existing package
    const existingRows = await sql`SELECT * FROM packages WHERE package_id = ${packageId}`
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }
    const existing = existingRows[0]

    // Permission: admin can update any; agents only packages from their branch
    if (user.role === 'agent' && existing.origin_branch_id !== user.branch_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build update
    const setParts: string[] = []
    const values: any[] = []
    const push = (col: string, val: any) => {
      const idx = values.length + 1
      setParts.push(`${col} = $${idx}`)
      values.push(val)
    }

    if (status !== undefined) push('status', status)
    if (sender_name !== undefined) push('sender_name', sender_name)
    if (sender_phone !== undefined) push('sender_phone', sender_phone)
    if (sender_address !== undefined) push('sender_address', sender_address)
    if (receiver_name !== undefined) push('receiver_name', receiver_name)
    if (receiver_phone !== undefined) push('receiver_phone', receiver_phone)
    if (receiver_address !== undefined) push('receiver_address', receiver_address)
    // weight: accept weight_kg or weight
    if (weight_kg !== undefined) push('weight', weight_kg)
    else if (weight !== undefined) push('weight', weight)
    // description may map to package_description
    if (description !== undefined) push('package_description', description)
    else if (package_description !== undefined) push('package_description', package_description)
  if (dimensions !== undefined) push('dimensions', dimensions)
    if (origin_branch_id !== undefined) push('origin_branch_id', origin_branch_id)
    else if (origin_branch !== undefined) push('origin_branch_id', origin_branch)
    if (destination_branch_id !== undefined) push('destination_branch_id', destination_branch_id)
    else if (destination_branch !== undefined) push('destination_branch_id', destination_branch)
    if (assigned_car !== undefined) push('assigned_car', assigned_car === 'none' ? null : assigned_car)
    if (assigned_driver !== undefined) push('assigned_driver', assigned_driver === 'none' ? null : assigned_driver)

    if (setParts.length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    // always update updated_at
    setParts.push('updated_at = now()')

    const queryText = `UPDATE packages SET ${setParts.join(', ')} WHERE package_id = $${values.length + 1} RETURNING *`
    const queryValues = [...values, packageId]
    const updatedRows = await db.query({ text: queryText, values: queryValues })
    const updatedPkg = updatedRows[0]

    // Insert tracking entry if status or notes provided
    if (status !== undefined || notes !== undefined) {
      const noteText = notes !== undefined ? notes : `Status changed to ${status}`
      await sql`
        INSERT INTO tracking (package_id, status, notes, updated_by, created_at)
        VALUES (${packageId}, ${status || existing.status}, ${noteText}, ${user.user_id}, now())
      `
    }

    return NextResponse.json({ success: true, package: updatedPkg })
  } catch (error) {
    console.error('Error in package update route:', error)
    return NextResponse.json({ error: 'Failed to update package' }, { status: 500 })
  }
})
