import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const originLat = searchParams.get("originLat")
    const originLng = searchParams.get("originLng")
    const destLat = searchParams.get("destLat")
    const destLng = searchParams.get("destLng")

    if (!originLat || !originLng || !destLat || !destLng) {
      return NextResponse.json({ success: false, error: "Missing coordinates" }, { status: 400 })
    }

    const key = process.env.LOCATIONIQ_API_KEY
    if (!key) {
      return NextResponse.json({ success: false, error: "Missing LOCATIONIQ_API_KEY" }, { status: 500 })
    }

    const url = `https://us1.locationiq.com/v1/directions/driving/${originLng},${originLat};${destLng},${destLat}?key=${key}&steps=true&overview=full&annotations=true`;
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ success: false, error: `LocationIQ error: ${res.status} ${text}` }, { status: res.status })
    }

    const data = await res.json()

    // Extract distance (m) and duration (s) if present
    const route = data?.routes?.[0]
    const distanceMeters = route?.distance ?? null
    const durationSeconds = route?.duration ?? null

    return NextResponse.json({ success: true, route: data, distanceMeters, durationSeconds })
  } catch (error) {
    console.error("/api/routing error:", error)
    return NextResponse.json({ success: false, error: "Routing failed" }, { status: 500 })
  }
}
