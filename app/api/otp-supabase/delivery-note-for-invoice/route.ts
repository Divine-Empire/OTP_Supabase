import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { fetchAllRows } from "@/lib/fetch-all"
import { chunkParams, chunkJson } from "@/lib/history-chunk"
import { parseHistoryParams, applyHistoryFilters, pageJson } from "@/lib/history-filters"
import { getStageTatMinutes, addTatMinutes } from "@/lib/tat"

// Stage — Delivery Note (Inv.), between Pre-Invoice and Make Invoice.
//
// Applies unconditionally to every otp_pre_invoice_queue row (unlike
// otp_debit_note, which is only for payment_mode = 'na' orders and is
// terminal). Processing here unlocks Make Invoice for this wave.
//
// Pending: otp_pre_invoice_queue.debit_note_planned IS NOT NULL AND no
//          matching otp_debit_note_for_invoice row yet.
// History: a matching otp_debit_note_for_invoice row exists.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history" && searchParams.has("page")) {
      // Server-paged History (hooks/use-stage-list.ts): one page per request, search /
      // CRM filter / access rules applied in SQL on otp_v_delivery_note_for_invoice_history.
      const p = parseHistoryParams(searchParams)
      const { data, error, count } = await applyHistoryFilters(
        supabase.from("otp_v_delivery_note_for_invoice_history").select("*", { count: "exact" }),
        p
      )
        .order("created_at", { ascending: false })
        .order("id")
        .range(p.offset, p.to)
      if (error) throw error
      return pageJson(data, count, p)
    }

    if (status === "history") {
      const { limit, offset, to } = chunkParams(searchParams)
      const { data, error, count } = await supabase
        .from("otp_debit_note_for_invoice")
        .select("*, order:otp_orders(*), queue:otp_pre_invoice_queue(quotation_number, source_stage, items)", { count: "exact" })
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
        .from("otp_v_delivery_note_for_invoice_pending")
        .select("*")
        .order("debit_note_planned", { ascending: false })
        .order("id")
        .range(from, to)
    )

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/delivery-note-for-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { queueId, amount, dnNumber, dnAttachmentUrl, createdBy } = body as {
      queueId: string
      amount?: number | string
      dnNumber?: string
      dnAttachmentUrl?: string
      createdBy?: string
    }

    if (!queueId) {
      return NextResponse.json({ success: false, error: "Missing queueId" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: queueRow, error: queueError } = await supabase
      .from("otp_pre_invoice_queue")
      .select("order_id")
      .eq("id", queueId)
      .not("debit_note_planned", "is", null)
      .maybeSingle()
    if (queueError) throw queueError
    if (!queueRow) {
      return NextResponse.json({ success: false, error: "Pre-Invoice wave not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("otp_debit_note_for_invoice")
      .insert({
        pre_invoice_queue_id: queueId,
        order_id: queueRow.order_id,
        amount: amount ? Number(amount) : null,
        dn_number: dnNumber || null,
        dn_attachment_url: dnAttachmentUrl || null,
        created_by: createdBy || null,
      })
      .select()
      .single()
    if (error) throw error

    // Only now does Make Invoice's planned date get set for this wave —
    // Delivery Note (Inv.) being processed is what unlocks it.
    // Planned = this record's creation time (now) + Make Invoice's TAT.
    const makeInvoicePlanned = addTatMinutes(new Date(), await getStageTatMinutes("make_invoice"))
    const { error: updateError } = await supabase
      .from("otp_pre_invoice_queue")
      .update({ make_invoice_planned: makeInvoicePlanned })
      .eq("id", queueId)
    if (updateError) throw updateError

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/delivery-note-for-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
