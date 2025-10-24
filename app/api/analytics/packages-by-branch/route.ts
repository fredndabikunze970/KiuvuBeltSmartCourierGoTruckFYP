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
        b.branch_id,
        b.branch_name,
        COUNT(p.id) as total_packages,
        COUNT(CASE WHEN p.status = $1 THEN 1 END) as delivered_packages,
        COUNT(CASE WHEN p.status = $2 THEN 1 END) as in_transit_packages,
        COUNT(CASE WHEN p.status = $3 THEN 1 END) as registered_packages,
        ROUND(CAST(
          CAST(COUNT(CASE WHEN p.status = $1 THEN 1 END) AS FLOAT) /
          NULLIF(COUNT(p.id), 0) * 100
          AS numeric), 2) as delivery_rate,
        ROUND(CAST(AVG(
          CASE
            WHEN p.status = $1
            THEN EXTRACT(EPOCH FROM (p.delivered_at - p.created_at)) / 3600
            ELSE NULL
          END
        ) AS numeric), 2) as avg_delivery_hours
      FROM
        branches b
      LEFT JOIN
        packages p ON b.branch_id = p.origin_branch_id OR b.branch_id = p.destination_branch_id
    `

    const values = ['delivered', 'in_transit', 'registered']

    // Add role-based filtering
    if (user.role === 'agent') {
      queryText += ` WHERE b.branch_id = $4`
      values.push(user.branch_id || '')
    }

    queryText += `
      GROUP BY
        b.branch_id, b.branch_name
      ORDER BY
        total_packages DESC
    `

    const result = await db.query({
      text: queryText,
      values: values
    }) as {
      branch_id: string;
      branch_name: string;
      total_packages: string;
      delivered_packages: string;
      in_transit_packages: string;
      registered_packages: string;
      delivery_rate: string;
      avg_delivery_hours: string;
    }[]

    const formattedData = result.map(row => ({
      id: row.branch_id,
      branchName: row.branch_name,
      totalPackages: parseInt(row.total_packages),
      deliveredPackages: parseInt(row.delivered_packages),
      inTransitPackages: parseInt(row.in_transit_packages),
      registeredPackages: parseInt(row.registered_packages),
      deliveryRate: parseFloat(row.delivery_rate),
      averageDeliveryHours: parseFloat(row.avg_delivery_hours) || 0
    }))

    return NextResponse.json({
      success: true,
      data: formattedData
    }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error("Error fetching packages by branch:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch packages by branch data" },
      { status: 500 }
    )
  }
}
