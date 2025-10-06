import { db } from "@/lib/database";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const result = await db.query({
      text: `
        SELECT 
          b.branch_id,
          b.branch_name,
          COUNT(p.id) as total_packages,
          COUNT(CASE WHEN p.status = $1 THEN 1 END) as delivered_packages,
          COUNT(CASE WHEN p.status = $2 THEN 1 END) as in_transit_packages,
          COUNT(CASE WHEN p.status = $3 THEN 1 END) as pending_packages,
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
          packages p ON b.branch_id = p.origin_branch_id
        GROUP BY 
          b.branch_id, b.branch_name
        ORDER BY 
          total_packages DESC
      `,
      values: ['delivered', 'in_transit', 'registered']
    }) as {
      branch_id: string;
      branch_name: string;
      total_packages: string;
      delivered_packages: string;
      in_transit_packages: string;
      pending_packages: string;
      delivery_rate: string;
      avg_delivery_hours: string;
    }[]

    const formattedData = result.map(row => ({
      id: row.branch_id,
      branchName: row.branch_name,
      totalPackages: parseInt(row.total_packages),
      deliveredPackages: parseInt(row.delivered_packages),
      inTransitPackages: parseInt(row.in_transit_packages),
      pendingPackages: parseInt(row.pending_packages),
      deliveryRate: parseFloat(row.delivery_rate),
      averageDeliveryHours: parseFloat(row.avg_delivery_hours) || 0
    }))

    return NextResponse.json({
      success: true,
      data: formattedData
    })
  } catch (error) {
    console.error("Error fetching packages by branch:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch packages by branch data" },
      { status: 500 }
    )
  }
}
