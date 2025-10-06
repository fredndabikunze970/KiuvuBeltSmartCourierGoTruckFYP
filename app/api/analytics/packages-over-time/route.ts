import { db } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const interval = searchParams.get('interval') || 'day'
    const timeRange = searchParams.get('range') || '30' // Default to last 30 days

    if (!['day', 'week', 'month', 'year'].includes(interval)) {
      return NextResponse.json({
        success: false,
        error: "Invalid interval. Must be 'day', 'week', 'month', or 'year'"
      }, { status: 400 })
    }

    const result = await db.query({
      text: `
        WITH daily_metrics AS (
          SELECT 
            DATE_TRUNC($1, created_at) as date,
            COUNT(*) as total_packages,
            COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_packages,
            COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit_packages,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_packages,
            ROUND(CAST(AVG(
              CASE 
                WHEN status = 'delivered' 
                THEN EXTRACT(EPOCH FROM (delivery_time - created_at)) / 3600
                ELSE NULL 
              END
            ) AS numeric), 2) as avg_delivery_hours
          FROM packages
          WHERE created_at >= NOW() - ($2 || ' days')::INTERVAL
          GROUP BY DATE_TRUNC($1, created_at)
          ORDER BY date DESC
        )
        SELECT 
          TO_CHAR(date, 'YYYY-MM-DD') as date,
          total_packages,
          delivered_packages,
          in_transit_packages,
          pending_packages,
          avg_delivery_hours
        FROM daily_metrics
      `,
      values: [interval, timeRange]
    }) as {
      date: string;
      total_packages: string;
      delivered_packages: string;
      in_transit_packages: string;
      pending_packages: string;
      avg_delivery_hours: string;
    }[]

    const formattedData = result.map(row => ({
      date: row.date,
      totalPackages: parseInt(row.total_packages),
      deliveredPackages: parseInt(row.delivered_packages),
      inTransitPackages: parseInt(row.in_transit_packages),
      pendingPackages: parseInt(row.pending_packages),
      averageDeliveryHours: parseFloat(row.avg_delivery_hours) || 0
    }))

    return NextResponse.json({
      success: true,
      data: formattedData
    })
  } catch (error) {
    console.error("Error fetching packages over time:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch packages over time data" },
      { status: 500 }
    )
  }
}
