import { db } from "@/lib/database"
import { getAuthUser } from "@/lib/auth-middleware"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const interval = searchParams.get('interval') || 'day'
    const timeRange = searchParams.get('range') || '30' // Default to last 30 days

    if (!['day', 'week', 'month', 'year'].includes(interval)) {
      return NextResponse.json({
        success: false,
        error: "Invalid interval. Must be 'day', 'week', 'month', or 'year'"
      }, { status: 400 })
    }

    let queryText = `
      WITH daily_metrics AS (
        SELECT
          DATE_TRUNC($1, created_at) as date,
          COUNT(*) as total_packages,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_packages,
          COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit_packages,
          COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered_packages,
          ROUND(CAST(AVG(
            CASE
              WHEN status = 'delivered'
              THEN EXTRACT(EPOCH FROM (delivered_at - created_at)) / 3600
              ELSE NULL
            END
          ) AS numeric), 2) as avg_delivery_hours
        FROM packages
        WHERE created_at >= NOW() - ($2 || ' days')::INTERVAL
    `

    const values = [interval, timeRange]

    // Add role-based filtering
    if (user.role === 'agent') {
      queryText += ` AND (origin_branch_id = $3 OR destination_branch_id = $3)`
      values.push(user.branch_id || '')
    }

    queryText += `
        GROUP BY DATE_TRUNC($1, created_at)
        ORDER BY date DESC
      )
      SELECT
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        total_packages,
        delivered_packages,
        in_transit_packages,
        registered_packages,
        avg_delivery_hours
      FROM daily_metrics
    `

    const result = await db.query({
      text: queryText,
      values: values
    }) as {
      date: string;
      total_packages: string;
      delivered_packages: string;
      in_transit_packages: string;
      registered_packages: string;
      avg_delivery_hours: string;
    }[]

    const formattedData = result.map(row => ({
      date: row.date,
      totalPackages: parseInt(row.total_packages),
      deliveredPackages: parseInt(row.delivered_packages),
      inTransitPackages: parseInt(row.in_transit_packages),
      registeredPackages: parseInt(row.registered_packages),
      averageDeliveryHours: parseFloat(row.avg_delivery_hours) || 0
    }))

    return NextResponse.json({
      success: true,
      data: formattedData
    }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error("Error fetching packages over time:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch packages over time data" },
      { status: 500 }
    )
  }
}
