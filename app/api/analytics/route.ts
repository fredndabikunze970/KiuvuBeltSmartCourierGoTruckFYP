import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Index of available analytics endpoints for quick discovery
  const base = new URL(request.url).origin + '/api/analytics'

  const endpoints = [
    { path: '/revenue-over-time', description: 'Revenue metrics aggregated by time (query: ?interval=day|week|month|year&range=30)' },
    { path: '/packages-over-time', description: 'Package counts and delivery durations over time (query: ?interval=&range=)' },
    { path: '/packages-by-branch', description: 'Counts and delivery rates grouped by branch' },
    { path: '/package-status', description: 'Breakdown of package counts per status' },
    { path: '/driver-performance', description: 'Driver performance and completion rates' },
    { path: '/average-delivery-time', description: 'Average delivery time across delivered packages' },
    { path: '/db-test', description: 'Diagnostics: verifies DB connectivity and returns sample counts & rows' }
  ]

  return NextResponse.json({
    success: true,
    base,
    endpoints
  })
}
