import { db } from "@/lib/database";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const result = await db.query({
      text: `
        SELECT 
          d.driver_id,
          d.full_name as driver_name,
          COUNT(p.id) as total_assignments,
          COUNT(CASE WHEN p.status = $1 THEN 1 END) as deliveries_completed,
          COUNT(CASE WHEN p.status = $2 THEN 1 END) as deliveries_in_progress,
          ROUND(CAST(
            CAST(COUNT(CASE WHEN p.status = $1 THEN 1 END) AS FLOAT) / 
            NULLIF(COUNT(p.id), 0) * 100
            AS numeric), 2) as completion_rate,
          ROUND(CAST(AVG(
            CASE 
              WHEN p.status = $1 
              THEN EXTRACT(EPOCH FROM (p.delivered_at - p.created_at)) / 3600
              ELSE NULL 
            END
          ) AS numeric), 2) as avg_delivery_hours
        FROM 
          drivers d
        LEFT JOIN 
          packages p ON d.driver_id = p.assigned_driver
        GROUP BY 
          d.driver_id, d.full_name
        ORDER BY 
          deliveries_completed DESC
      `,
      values: ['delivered', 'in_transit']
    }) as {
      driver_id: string;
      driver_name: string;
      total_assignments: string;
      deliveries_completed: string;
      deliveries_in_progress: string;
      completion_rate: string;
      avg_delivery_hours: string;
    }[]

    const formattedData = result.map(row => ({
      id: row.driver_id,
      driverName: row.driver_name,
      totalAssignments: parseInt(row.total_assignments),
      deliveriesCompleted: parseInt(row.deliveries_completed),
      deliveriesInProgress: parseInt(row.deliveries_in_progress),
      completionRate: parseFloat(row.completion_rate),
      averageDeliveryHours: parseFloat(row.avg_delivery_hours) || 0
    }))

    return NextResponse.json({
      success: true,
      data: formattedData
    })
  } catch (error) {
    console.error("Error fetching driver performance:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch driver performance data" },
      { status: 500 }
    )
  }
}
