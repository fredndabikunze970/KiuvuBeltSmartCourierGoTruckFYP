import { sql } from "@/lib/database"
import { NextRequest, NextResponse } from "next/server"

/*
Usage notes:
- To enable the background auto-transition worker set the env var
  ENABLE_PACKAGE_AUTO_TRANSITION=true in your running environment.
- You can control the interval with PACKAGE_AUTO_TRANSITION_INTERVAL_MS (milliseconds).
- This route also exposes a GET (status) and POST (manual run) endpoint:
  GET  /api/packages/auto-transition  -> { enabled, running, dueCount }
  POST /api/packages/auto-transition  -> runs transition once and returns transitioned package ids

Important deployment note:
 - This job runs in-process. For production use make sure your Next.js deployment
   runs a persistent server process (not serverless stateless function invocations),
   or run this logic in a separate worker/service. Running in serverless or ephemeral
   instances may not reliably execute the interval.
*/

// Config: run interval by default unless ENABLE_PACKAGE_AUTO_TRANSITION is explicitly set to 'false'
const ENABLE_AUTO = (process.env.ENABLE_PACKAGE_AUTO_TRANSITION || "true").toLowerCase() !== "false"
const INTERVAL_MS = Number(process.env.PACKAGE_AUTO_TRANSITION_INTERVAL_MS) || 10000 // default 10s

// Prevent multiple intervals when module is imported multiple times in the same process
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __kb_auto_transition_handle: any
}

// Core worker: find & transition due packages (delivery_time <= now +/- window)
async function runTransitionOnce() {
  try {
    // Atomic update: change eligible packages to in_transit and return their ids
    const updated = await sql`
      UPDATE packages
      SET status = 'in_transit', updated_at = now()
      WHERE delivery_time IS NOT NULL
        AND status IN ('registered')
        AND (delivery_time AT TIME ZONE 'UTC') <= (now() AT TIME ZONE 'UTC')
      RETURNING package_id
    `

    const updatedIds = (updated || []).map((r: any) => r.package_id)

    if (updatedIds.length) {
      console.log(`auto-transition: moved ${updatedIds.length} package(s) to in_transit`, { packages: updatedIds })
    } else {
      // Quiet log for no-op runs can be commented out if too chatty
      // console.debug('auto-transition: no packages to transition')
    }

    return { success: true, transitionedCount: updatedIds.length, transitionedPackages: updatedIds }
  } catch (error) {
    console.error('auto-transition run error:', error)
    return { success: false, error: (error as Error).message || String(error) }
  }
}

// Start interval in background if enabled and not already running
// Helper to lazily start the interval (safe to call multiple times)
function lazyStartInterval() {
  if (typeof global === 'undefined') return false
  if (global.__kb_auto_transition_handle) return true

  try {
    console.log(`auto-transition: starting interval (every ${INTERVAL_MS}ms)`) 
    global.__kb_auto_transition_handle = setInterval(() => {
      void runTransitionOnce()
    }, INTERVAL_MS)
    return true
  } catch (err) {
    console.error('auto-transition: failed to start interval', err)
    return false
  }
}

// Start now if enabled by default
if (ENABLE_AUTO) {
  lazyStartInterval()
}

// Expose a lightweight status endpoint (GET) and a manual trigger (POST)
export async function GET(_req: NextRequest) {
  try {
    // Ensure interval is running (lazy-start when first called)
    const started = ENABLE_AUTO ? lazyStartInterval() : false
    const running = !!(global && (global as any).__kb_auto_transition_handle) || started
    const rows = await sql`
      SELECT count(*) as cnt FROM packages
      WHERE delivery_time IS NOT NULL
        AND status IN ('registered')
        AND (delivery_time AT TIME ZONE 'UTC') <= (now() AT TIME ZONE 'UTC')
    `
    const dueCount = Number(rows?.[0]?.cnt ?? 0)
    return NextResponse.json({ success: true, enabled: ENABLE_AUTO, running, dueCount })
  } catch (error) {
    console.error('auto-transition GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to check due packages' }, { status: 500 })
  }
}

export async function POST(_req: NextRequest) {
  try {
    // Ensure interval is running (lazy-start when first called)
    if (ENABLE_AUTO) lazyStartInterval()
    const result = await runTransitionOnce()
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, transitionedCount: result.transitionedCount, transitionedPackages: result.transitionedPackages })
  } catch (error) {
    console.error('auto-transition POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update packages' }, { status: 500 })
  }
}
