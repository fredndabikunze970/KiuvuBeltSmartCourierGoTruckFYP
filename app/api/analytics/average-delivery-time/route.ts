import { db } from "@/lib/database";
import { getAuthUser } from "@/lib/auth-middleware";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let queryText = `
      SELECT
        ROUND(CAST(AVG(
          EXTRACT(EPOCH FROM (delivered_at - created_at)) / 3600
        ) AS numeric), 2) as average_delivery_hours,
        COUNT(*) as total_deliveries
      FROM packages
      WHERE
        status = $1
        AND delivered_at IS NOT NULL
    `

    const values = ['delivered']

    // Add role-based filtering
    if (user.role === 'agent') {
      queryText += ` AND (origin_branch_id = $2 OR destination_branch_id = $2)`
      values.push(user.branch_id || '')
    }

    const result = await db.query({
      text: queryText,
      values: values
    }) as { average_delivery_hours: string; total_deliveries: string }[]

    const data = {
      averageDeliveryHours: parseFloat(result[0].average_delivery_hours) || 0,
      totalDeliveries: parseInt(result[0].total_deliveries)
    }

    return NextResponse.json({
      success: true,
      data
    }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error("Error fetching average delivery time:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch average delivery time" },
      { status: 500 }
    )
  }
}
