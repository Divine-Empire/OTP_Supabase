import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { fetchAllRows } from "@/lib/fetch-all"
import { chunkParams, chunkJson } from "@/lib/history-chunk"
import { parseHistoryParams, applyHistoryFilters, pageJson } from "@/lib/history-filters"

// Stage — Calibration Certificate.
//
// Pending: otp_make_invoice.calibration_planned IS NOT NULL (only set when
//          that wave's otp_pre_invoice_queue.calibration_required was true
//          — see make-invoice/route.ts) AND no matching
//          otp_calibration_certificate row yet.
// History: a matching otp_calibration_certificate row exists. A wave with
//          calibration_required = false never gets a planned date, so it
//          never appears here — it just stays done in Make Invoice's own
//          History, as intended.
//
// Packaging and Transport branches directly off Make Invoice in parallel
// with this stage (see make-invoice/route.ts) — not chained after it —
// so this route does not touch packaging_transport_planned.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history" && searchParams.has("page")) {
      // Server-paged History (hooks/use-stage-list.ts): one page per request,
      // search / CRM / calibration-type filters and access rules applied in SQL.
      const p = parseHistoryParams(searchParams, ["calibrationType"])
      const query = applyHistoryFilters(
        supabase.from("otp_v_calibration_history").select("*", { count: "exact" }),
        p,
        { extraEq: { calibrationType: "calibration_type" } }
      )
      const { data, error, count } = await query.order("created_at", { ascending: false }).order("id").range(p.offset, p.to)
      if (error) throw error

      // Filter dropdown options must cover the whole History, not just this page.
      const types = await fetchAllRows((from, to) =>
        supabase.from("otp_pre_invoice_queue").select("calibration_type").not("calibration_type", "is", null).order("id").range(from, to)
      )
      const calibrationType = Array.from(new Set(types.map((r: any) => r.calibration_type).filter(Boolean))).sort()
      return pageJson(data, count, p, { facets: { calibrationType } })
    }

    if (status === "history") {
      const { limit, offset, to } = chunkParams(searchParams)
      const { data, error, count } = await supabase
        .from("otp_calibration_certificate")
        .select("*, order:otp_orders(*), makeInvoice:otp_make_invoice(invoice_number, invoice_date, invoice_upload_url, items, queue:otp_pre_invoice_queue(calibration_type))", { count: "exact" })
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, to)
      if (error) throw error

      return chunkJson(data, count, offset)
    }

    // Anti-join view (Database/72): no done-id list in the URL, paged past
    // PostgREST's 1000-row cap. No fallback to the old NOT IN query -- if the
    // view is missing this should fail loudly, not silently regress.
    const data = await fetchAllRows((from, to) =>
      supabase
        .from("otp_v_calibration_pending")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to)
    )

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/calibration exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { makeInvoiceId, certificateNumber, certificateType, certificateUploadUrl, remarks, createdBy } = body as {
      makeInvoiceId: string
      certificateNumber?: string
      certificateType?: string
      certificateUploadUrl?: string
      remarks?: string
      createdBy?: string
    }

    if (!makeInvoiceId) {
      return NextResponse.json({ success: false, error: "Missing makeInvoiceId" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: makeInvoiceRow, error: miError } = await supabase
      .from("otp_make_invoice")
      .select("order_id")
      .eq("id", makeInvoiceId)
      .maybeSingle()
    if (miError) throw miError
    if (!makeInvoiceRow) {
      return NextResponse.json({ success: false, error: "Make Invoice record not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("otp_calibration_certificate")
      .insert({
        make_invoice_id: makeInvoiceId,
        order_id: makeInvoiceRow.order_id,
        certificate_number: certificateNumber || null,
        certificate_type: certificateType || null,
        certificate_upload_url: certificateUploadUrl || null,
        remarks: remarks || null,
        created_by: createdBy || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/calibration exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
