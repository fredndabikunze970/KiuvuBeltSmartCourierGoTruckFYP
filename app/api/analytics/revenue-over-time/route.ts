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
      WITH revenue_metrics AS (
        SELECT
          DATE_TRUNC($1, pay.created_at) as date,
          COUNT(DISTINCT p.id) as total_packages,
          COUNT(DISTINCT CASE WHEN p.status = $3 THEN p.id END) as delivered_packages,
          COALESCE(SUM(CASE WHEN pay.payment_status = $4 THEN pay.amount ELSE 0 END), 0) as total_revenue,
          ROUND(CAST(AVG(CASE WHEN pay.payment_status = $4 THEN pay.amount ELSE NULL END) AS numeric), 2) as average_payment_amount,
          ROUND(CAST(COALESCE(SUM(CASE WHEN pay.payment_status = $4 THEN pay.amount ELSE 0 END), 0) /
            NULLIF(COUNT(DISTINCT CASE WHEN p.status = $3 THEN p.id END), 0) AS numeric), 2) as revenue_per_delivery
        FROM payments pay
        INNER JOIN packages p ON pay.package_id = p.package_id
        WHERE pay.created_at >= NOW() - ($2 || ' days')::INTERVAL
    `

    // Parameter mapping:
    // $1 = interval (day|week|month|year)
    // $2 = timeRange (number of days as string)
    // $3 = delivered status (e.g. 'delivered')
    // $4 = confirmed payment_status (e.g. 'confirmed')
    const values = [interval, timeRange, 'delivered', 'confirmed']

    // Add role-based filtering
    if (user.role === 'agent') {
      // when agent filter is applied this becomes $5
      queryText += ` AND (p.origin_branch_id = $5 OR p.destination_branch_id = $5)`
      values.push(user.branch_id || '')
    }

    queryText += `
        GROUP BY DATE_TRUNC($1, pay.created_at)
        ORDER BY date DESC
      )
      SELECT
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        total_packages,
        delivered_packages,
        ROUND(CAST(total_revenue AS numeric), 2) as total_revenue,
        average_payment_amount,
        revenue_per_delivery
      FROM revenue_metrics
    `

    const result = await db.query({
      text: queryText,
      values: values
    }) as {
      date: string;
      total_packages: string;
      delivered_packages: string;
      total_revenue: string;
      average_payment_amount: string;
      revenue_per_delivery: string;
    }[]

    const formattedData = result.map(row => ({
      date: row.date,
      totalPackages: parseInt(row.total_packages),
      deliveredPackages: parseInt(row.delivered_packages),
      totalRevenue: parseFloat(row.total_revenue),
      averagePaymentAmount: parseFloat(row.average_payment_amount) || 0,
      revenuePerDelivery: parseFloat(row.revenue_per_delivery) || 0
    }))

    return NextResponse.json({
      success: true,
      data: formattedData
    }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error("Error fetching revenue over time:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch revenue over time data" },
      { status: 500 }
    )
  }
}
