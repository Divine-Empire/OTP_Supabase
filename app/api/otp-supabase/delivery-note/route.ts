import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { fetchAllRows } from "@/lib/fetch-all"
import { chunkParams, chunkJson } from "@/lib/history-chunk"
import { parseHistoryParams, applyHistoryFilters, pageJson , crmFacet } from "@/lib/history-filters"
import { requestAccess } from "@/lib/request-access"

// Stage — Delivery Note (only reached when otp_orders.payment_mode = 'na' —
// see order-acceptable/route.ts). Terminal: processing here just moves the
// order to History, nothing further gets scheduled.
//
// Pending: otp_orders_acceptable.debit_note_planned IS NOT NULL AND
//          no matching otp_debit_note row yet.
// History: a matching otp_debit_note row exists.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history" && searchParams.has("page")) {
      // Server-paged History (hooks/use-stage-list.ts): one page per request, search /
      // CRM filter / access rules applied in SQL on otp_v_delivery_note_history.
      const p = parseHistoryParams(searchParams, [], await requestAccess(request))
      const { data, error, count } = await applyHistoryFilters(
        supabase.from("otp_v_delivery_note_history").select("*", { count: "exact" }),
        p
      )
        .order("created_at", { ascending: false })
        .order("id")
        .range(p.offset, p.to)
      if (error) throw error
      return pageJson(data, count, p, await crmFacet(supabase, "otp_v_delivery_note_history", p))
    }

    if (status === "history") {
      const { offset, to } = chunkParams(searchParams)
      const { data, error, count } = await supabase
        .from("otp_debit_note")
        .select("*, order:otp_orders(*, acceptable:otp_orders_acceptable(debit_note_planned))", { count: "exact" })
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, to)
      if (error) throw error

      return chunkJson(data, count, offset)
    }

    // Anti-join view (Database/72, 73): no done-id list in the URL, and paged
    // past PostgREST's 1000-row cap.
    const data = await fetchAllRows((from, to) =>
      supabase
        .from("otp_v_delivery_note_pending")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to)
    )

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/delivery-note exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, dnNumber, dnAttachmentUrl, createdBy } = body as {
      orderId: string
      dnNumber?: string
      dnAttachmentUrl?: string
      createdBy?: string
    }

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("otp_debit_note")
      .insert({
        order_id: orderId,
        dn_number: dnNumber || null,
        dn_attachment_url: dnAttachmentUrl || null,
        created_by: createdBy || null,
      })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/delivery-note exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
