import { getAuthUser } from "@/lib/auth-middleware"
import { db } from "@/lib/database"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const connOk = await db.testConnection()

    if (!connOk) {
      return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 })
    }

    // Fetch simple diagnostics: counts and a few sample rows from key tables
    const [packagesCountRows, paymentsCountRows, trackingCountRows] = await Promise.all([
      db.query({ text: `SELECT COUNT(*)::int as count FROM packages`, values: [] }),
      db.query({ text: `SELECT COUNT(*)::int as count FROM payments`, values: [] }),
      db.query({ text: `SELECT COUNT(*)::int as count FROM tracking`, values: [] })
    ])

    const packagesSample = await db.query({ text: `SELECT package_id, status, created_at, delivered_at FROM packages ORDER BY created_at DESC LIMIT 5`, values: [] })
    const paymentsSample = await db.query({ text: `SELECT payment_id, package_id, amount, payment_method, payment_status, confirmed_at FROM payments ORDER BY created_at DESC LIMIT 5`, values: [] })
    const trackingSample = await db.query({ text: `SELECT package_id, latitude, longitude, progress_percentage, created_at FROM tracking ORDER BY created_at DESC LIMIT 5`, values: [] })

    const response = {
      success: true,
      diagnostics: {
        packagesCount: packagesCountRows && packagesCountRows[0] ? Number(packagesCountRows[0].count || 0) : 0,
        paymentsCount: paymentsCountRows && paymentsCountRows[0] ? Number(paymentsCountRows[0].count || 0) : 0,
        trackingCount: trackingCountRows && trackingCountRows[0] ? Number(trackingCountRows[0].count || 0) : 0
      },
      samples: {
        packages: packagesSample || [],
        payments: paymentsSample || [],
        tracking: trackingSample || []
      }
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error in analytics db-test:', error)
    return NextResponse.json({ success: false, error: 'Failed to run DB diagnostics' }, { status: 500 })
  }
}
