import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { requestAccess } from "@/lib/request-access"

// Global search by Order No. / Quotation No. (Database/86): for each matching order, the stages
// with a pending wave right now and the last completed stage, per order and per wave. One call to
// otp_order_trace, read live from the stage tables (no cache), with the caller's CRM / location
// access applied inside the query. Order Acceptable .. Client Confirmation only.
export async function GET(request: Request) {
  try {
    const access = await requestAccess(request)
    if (!access.userId) return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 })
    // The search box is admin-only; the API enforces it too, so hiding the box is not the only guard.
    if (!access.isAdmin) return NextResponse.json({ success: false, error: "Only an admin can use global search" }, { status: 403 })

    const q = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 60)
    // The function needs at least 3 letters/digits; shorter input is not a search yet.
    if (q.replace(/[^a-z0-9]/gi, "").length < 3) return NextResponse.json({ success: true, data: [] })

    const { data, error } = await getSupabaseAdmin().rpc("otp_order_trace", {
      p_query: q,
      p_restricted: access.restricted,
      p_crm_names: access.restricted ? access.crmNames : null,
      p_location: access.restricted ? access.location || null : null,
      p_limit: 10,
    })
    if (error) throw error
    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/global-search exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
