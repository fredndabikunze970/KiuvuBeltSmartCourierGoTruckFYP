import { db } from "@/lib/database";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const result = await db.query({
      text: `
        SELECT 
          ROUND(CAST(AVG(
            EXTRACT(EPOCH FROM (delivery_time - created_at)) / 3600
          ) AS numeric), 2) as average_delivery_hours,
          COUNT(*) as total_deliveries
        FROM packages 
        WHERE 
          status = $1 
          AND delivery_time IS NOT NULL
      `,
      values: ['delivered']
    }) as { average_delivery_hours: string; total_deliveries: string }[]

    const data = {
      averageDeliveryHours: parseFloat(result[0].average_delivery_hours) || 0,
      totalDeliveries: parseInt(result[0].total_deliveries)
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error("Error fetching average delivery time:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch average delivery time" },
      { status: 500 }
    )
  }
}
