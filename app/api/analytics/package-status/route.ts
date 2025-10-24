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
        status,
        COUNT(*) as count
      FROM packages
    `

    const values = []

    // Add role-based filtering
    if (user.role === 'agent') {
      queryText += ` WHERE origin_branch_id = $1 OR destination_branch_id = $1`
      values.push(user.branch_id || '')
    }

    queryText += `
      GROUP BY status
      ORDER BY count DESC
    `

    const result = await db.query({
      text: queryText,
      values: values
    }) as { status: string; count: string }[]

    // Transform the data into a proper format
    const formattedData = result.map((row: { status: string; count: string }) => ({
      status: row.status,
      count: parseInt(row.count)
    }))

    return NextResponse.json({
      success: true,
      data: formattedData
    }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error("Error fetching package status analytics:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch package status analytics" },
      { status: 500 }
    )
  }
}
