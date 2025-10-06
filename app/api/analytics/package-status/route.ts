import { db } from "@/lib/database";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const result = await db.query({
      text: `
        SELECT 
          status,
          COUNT(*) as count
        FROM packages 
        GROUP BY status
        ORDER BY count DESC
      `,
      values: []
    }) as { status: string; count: string }[]

    // Transform the data into a proper format
    const formattedData = result.map((row: { status: string; count: string }) => ({
      status: row.status,
      count: parseInt(row.count)
    }))

    return NextResponse.json({
      success: true,
      data: formattedData
    })
  } catch (error) {
    console.error("Error fetching package status analytics:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch package status analytics" },
      { status: 500 }
    )
  }
}
