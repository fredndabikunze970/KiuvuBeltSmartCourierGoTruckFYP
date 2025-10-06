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
        WITH revenue_metrics AS (
          SELECT 
            DATE_TRUNC($1, created_at) as date,
            COUNT(*) as total_packages,
            COUNT(CASE WHEN status = $3 THEN 1 END) as delivered_packages,
            SUM(CASE WHEN status = $3 THEN delivery_fee ELSE 0 END) as total_revenue,
            AVG(CASE WHEN status = $3 THEN delivery_fee ELSE NULL END) as average_package_price,
            SUM(CASE WHEN status = $3 THEN delivery_fee ELSE 0 END) / 
              NULLIF(COUNT(CASE WHEN status = $3 THEN 1 END), 0) as revenue_per_delivery
          FROM packages
          WHERE created_at >= NOW() - ($2 || ' days')::INTERVAL
          GROUP BY DATE_TRUNC($1, created_at)
          ORDER BY date DESC
        )
        SELECT 
          TO_CHAR(date, 'YYYY-MM-DD') as date,
          total_packages,
          delivered_packages,
          ROUND(CAST(total_revenue AS numeric), 2) as total_revenue,
          ROUND(CAST(average_package_price AS numeric), 2) as average_package_price,
          ROUND(CAST(revenue_per_delivery AS numeric), 2) as revenue_per_delivery
        FROM revenue_metrics
      `,
      values: [interval, timeRange, 'delivered']
    }) as {
      date: string;
      total_packages: string;
      delivered_packages: string;
      total_revenue: string;
      average_package_price: string;
      revenue_per_delivery: string;
    }[]

    const formattedData = result.map(row => ({
      date: row.date,
      totalPackages: parseInt(row.total_packages),
      deliveredPackages: parseInt(row.delivered_packages),
      totalRevenue: parseFloat(row.total_revenue),
      averagePackagePrice: parseFloat(row.average_package_price) || 0,
      revenuePerDelivery: parseFloat(row.revenue_per_delivery) || 0
    }))

    return NextResponse.json({
      success: true,
      data: formattedData
    })
  } catch (error) {
    console.error("Error fetching revenue over time:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch revenue over time data" },
      { status: 500 }
    )
  }
}
