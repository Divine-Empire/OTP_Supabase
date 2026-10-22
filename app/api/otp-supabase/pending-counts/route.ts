import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { requestAccess, scopeLocation } from "@/lib/request-access"

// Sidebar-only pending counts, keyed by the sidebar's own kebab-case `step`
// values so the component can look counts up with zero translation. Runs on
// page loads (Sidebar remounts on navigation; it caches client-side, see
// components/layout/sidebar.tsx).
//
// All the counting is one SQL function, otp_pending_counts() (Database/72):
// the same "planned IS NOT NULL AND no matching child row" rule each stage's
// own Pending view uses, counted in the DB. The old version pulled 14 whole
// tables into Node, which silently stopped at PostgREST's 1000-row cap and
// made every count wrong past that. There is deliberately no fallback to
// that code: if the function is missing this must fail loudly.
//
// Counts are scoped to orders at the caller's location (plus orders with no
// location yet), matching lib/access.ts's canSeeLocation. The location comes
// from the session, not the query: a restricted user cannot ask for another
// one; an admin may narrow with ?location=<label>.
export async function GET(request: Request) {
  try {
    const location = scopeLocation(await requestAccess(request), new URL(request.url).searchParams.get("location"))
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase.rpc("otp_pending_counts", { p_location: location || null })
    if (error) throw error
    if (!data || typeof data !== "object") throw new Error("otp_pending_counts returned no data")

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/pending-counts exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
