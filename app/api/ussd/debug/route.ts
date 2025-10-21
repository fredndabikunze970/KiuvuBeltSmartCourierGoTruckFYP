import { sql } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const tracking = url.searchParams.get('tracking')

    if (!tracking) {
      return NextResponse.json({ error: 'missing tracking query param, use ?tracking=PKG001' }, { status: 400 })
    }

    const rows = await sql`
      SELECT * FROM packages WHERE package_id = ${tracking}
    `

    if (!rows || rows.length === 0) {
      return NextResponse.json({ found: false, tracking }, { status: 200 })
    }

    const p = rows[0]
    return NextResponse.json({ found: true, tracking: p.package_id, status: p.status, raw: p }, { status: 200 })
  } catch (err) {
    console.error('USSD debug endpoint error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
