import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { requestAccess, scopeLocation } from "@/lib/request-access"

// Dashboard numbers, all computed in SQL by otp_dashboard_summary()
// (Database/79). The old version read ten whole tables into Node and
// aggregated in JS on every page load; the function returns the same
// `data` shape (see hooks/use-dashboard-data.ts) from one query.
// Per-stage "pending" uses the same rule as otp_pending_counts and each
// stage's own Pending view.
//
// Scoped to the caller's location (plus orders with no location yet), taken
// from the session — a restricted user cannot request another location; an
// admin may narrow with ?location=<label>. No JS fallback: if the function is
// missing this must fail loudly rather than show stale/wrong numbers.
export async function GET(request: Request) {
  try {
    const location = scopeLocation(await requestAccess(request), new URL(request.url).searchParams.get("location"))
    const { data, error } = await getSupabaseAdmin().rpc("otp_dashboard_summary", { p_location: location })
    if (error) throw error
    if (!data || typeof data !== "object") throw new Error("otp_dashboard_summary returned no data")
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/dashboard exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
