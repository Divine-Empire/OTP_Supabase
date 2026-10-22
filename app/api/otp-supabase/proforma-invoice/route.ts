import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { parseHistoryParams, applyHistoryFilters, pageJson , crmFacet } from "@/lib/history-filters"
import { requestAccess } from "@/lib/request-access"
import { fetchAllRows } from "@/lib/fetch-all"
import { chunkParams, chunkJson } from "@/lib/history-chunk"

// Stage — Pro-Forma Invoice (only reached when otp_orders.payment_mode =
// 'pi against advance' — see order-acceptable/route.ts).
//
// Pending: otp_orders_acceptable.proforma_invoice_planned IS NOT NULL AND
//          no matching otp_proforma_invoice row yet.
// Payment Against PI: a matching otp_proforma_invoice row exists AND
//                      payment_against_pi IS NULL — see
//                      Database/51_proforma_invoice_payment_against_pi.sql
//                      and payment-against-pi/route.ts.
// History: a matching otp_proforma_invoice row exists AND
//          payment_against_pi IS NOT NULL.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history" && searchParams.has("page")) {
      // Server-paged History (hooks/use-server-history.ts): one page per request, search /
      // CRM filter / access rules applied in SQL on otp_v_proforma_invoice_history.
      const p = parseHistoryParams(searchParams, [], await requestAccess(request))
      const { data, error, count } = await applyHistoryFilters(
        supabase.from("otp_v_proforma_invoice_history").select("*", { count: "exact" }),
        p
      )
        .order("updated_at", { ascending: false })
        .order("id")
        .range(p.offset, p.to)
      if (error) throw error
      return pageJson(data, count, p, await crmFacet(supabase, "otp_v_proforma_invoice_history", p))
    }

    if (status === "history") {
      const { offset, to } = chunkParams(searchParams)
      const { data, error, count } = await supabase
        .from("otp_proforma_invoice")
        .select("*, order:otp_orders(*, acceptable:otp_orders_acceptable(proforma_invoice_planned))", { count: "exact" })
        .not("payment_against_pi", "is", null)
        .order("updated_at", { ascending: false })
        .order("id")
        .range(offset, to)
      if (error) throw error

      return chunkJson(data, count, offset)
    }

    if (status === "payment-against-pi") {
      const { data, error } = await supabase
        .from("otp_proforma_invoice")
        .select("*, order:otp_orders(*, acceptable:otp_orders_acceptable(proforma_invoice_planned))")
        .is("payment_against_pi", null)
        .order("created_at", { ascending: false })
      if (error) throw error

      return NextResponse.json({ success: true, data: data || [] })
    }

    // Anti-join view (Database/72, 73): no done-id list in the URL, and paged
    // past PostgREST's 1000-row cap.
    const data = await fetchAllRows((from, to) =>
      supabase
        .from("otp_v_proforma_invoice_pending")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to)
    )

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/proforma-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, piNumber, piAmount, piUploadUrl, remark, createdBy } = body as {
      orderId: string
      piNumber?: string
      piAmount?: number | string
      piUploadUrl?: string
      remark?: string
      createdBy?: string
    }

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // payment_against_pi is left null here by design — the row now lands
    // in the "Payment Against PI" tab (see GET above), not History, and
    // Check Inventory's planned date isn't set until that step is
    // processed (see payment-against-pi/route.ts).
    const { data, error } = await supabase
      .from("otp_proforma_invoice")
      .insert({
        order_id: orderId,
        pi_number: piNumber || null,
        pi_amount: piAmount ? Number(piAmount) : null,
        pi_upload_url: piUploadUrl || null,
        remark: remark || null,
        created_by: createdBy || null,
      })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/proforma-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
