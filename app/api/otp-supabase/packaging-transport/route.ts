import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { getStageTatMinutes, addTatMinutes } from "@/lib/tat"

// Stage — Packaging and Transport.
//
// Branches directly off Make Invoice, in PARALLEL with Calibration
// Certificate (not chained after it) — see make-invoice/route.ts, which
// sets packaging_transport_planned unconditionally, for every wave,
// independently of calibration_required. See
// Database/36_packaging_transport_off_make_invoice.sql.
//
// Two-step save (see Database/39_packaging_transport_draft_save.sql):
//   mode "draft" — only Before/After Photo. Creates/updates the SAME
//                  otp_packaging_transport row (keyed by make_invoice_id,
//                  unique) with status='draft'. Still counts as Pending.
//   mode "final" — the rest of the form. Flips that row's status to
//                  'submitted' (creating it directly if no draft ever
//                  existed) and sets bilty_upload_planned — only now does
//                  it count as History / unlock Bilty Upload.
//
// Pending: otp_make_invoice.packaging_transport_planned IS NOT NULL AND
//          either no otp_packaging_transport row yet, OR one exists with
//          status='draft'.
// History: a matching otp_packaging_transport row exists with
//          status='submitted'.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history") {
      const { data, error } = await supabase
        .from("otp_packaging_transport")
        .select("*, order:otp_orders(*), makeInvoice:otp_make_invoice(*)")
        .eq("status", "submitted")
        .order("created_at", { ascending: false })
      if (error) throw error

      return NextResponse.json({ success: true, data: data || [] })
    }

    const { data: ptRows, error: ptError } = await supabase
      .from("otp_packaging_transport")
      .select("make_invoice_id, status")
    if (ptError) throw ptError

    const submittedIds = (ptRows || []).filter((r: any) => r.status === "submitted").map((r: any) => r.make_invoice_id)
    const draftIds = (ptRows || []).filter((r: any) => r.status === "draft").map((r: any) => r.make_invoice_id)
    const excludeIds = [...submittedIds, ...draftIds]

    let freshQuery = supabase
      .from("otp_make_invoice")
      .select("*, order:otp_orders(*)")
      .not("packaging_transport_planned", "is", null)
      .order("created_at", { ascending: false })

    if (excludeIds.length > 0) {
      freshQuery = freshQuery.not("id", "in", `(${excludeIds.join(",")})`)
    }

    const { data: freshRows, error: freshError } = await freshQuery
    if (freshError) throw freshError

    let draftRows: any[] = []
    if (draftIds.length > 0) {
      const { data, error: draftError } = await supabase
        .from("otp_packaging_transport")
        .select("*, order:otp_orders(*), makeInvoice:otp_make_invoice(*)")
        .eq("status", "draft")
        .order("created_at", { ascending: false })
      if (draftError) throw draftError
      draftRows = data || []
    }

    return NextResponse.json({ success: true, data: [...draftRows, ...(freshRows || [])] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/packaging-transport exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      mode,
      makeInvoiceId,
      beforePhotoUrls,
      afterPhotoUrls,
      transporterName,
      transporterContact,
      transporterRemarks,
      expenseAmount,
      dispatchStatus,
      notOkReason,
      createdBy,
    } = body as {
      mode?: "draft" | "final"
      makeInvoiceId: string
      beforePhotoUrls?: string[]
      afterPhotoUrls?: string[]
      transporterName?: string
      transporterContact?: string
      transporterRemarks?: string
      expenseAmount?: string | number
      dispatchStatus?: string
      notOkReason?: string
      createdBy?: string
    }

    if (!makeInvoiceId) {
      return NextResponse.json({ success: false, error: "Missing makeInvoiceId" }, { status: 400 })
    }

    const isDraft = mode === "draft"

    if (isDraft && (!beforePhotoUrls || beforePhotoUrls.length === 0)) {
      return NextResponse.json({ success: false, error: "At least one Before Photo is required" }, { status: 400 })
    }
    if (!isDraft && (!transporterName || !transporterName.trim())) {
      return NextResponse.json({ success: false, error: "Transporter name is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: existingRow, error: existingError } = await supabase
      .from("otp_packaging_transport")
      .select("id, order_id, status")
      .eq("make_invoice_id", makeInvoiceId)
      .maybeSingle()
    if (existingError) throw existingError

    const toNumberOrNull = (val: unknown) => {
      if (val === undefined || val === null || val === "") return null
      const n = Number(val)
      return Number.isFinite(n) ? n : null
    }

    if (isDraft) {
      if (existingRow) {
        // Already has a row (draft or, in theory, re-saving photos on an
        // already-submitted one) — just update the photos in place.
        const { data, error } = await supabase
          .from("otp_packaging_transport")
          .update({
            before_photo_urls: beforePhotoUrls || [],
            after_photo_urls: afterPhotoUrls || [],
          })
          .eq("id", existingRow.id)
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ success: true, data })
      }

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
        .from("otp_packaging_transport")
        .insert({
          make_invoice_id: makeInvoiceId,
          order_id: makeInvoiceRow.order_id,
          before_photo_urls: beforePhotoUrls || [],
          after_photo_urls: afterPhotoUrls || [],
          status: "draft",
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    // Final submit — Bilty Upload planned date set only now, unlocking
    // that stage's Pending queue (see Database/38_otp_bilty_upload.sql).
    const biltyUploadPlanned = addTatMinutes(new Date(), await getStageTatMinutes("bilty_upload"))

    const finalFields = {
      transporter_name: transporterName!.trim(),
      transporter_contact: transporterContact || null,
      transporter_remarks: transporterRemarks || null,
      expense_amount: toNumberOrNull(expenseAmount),
      dispatch_status: dispatchStatus === "notokay" ? "notokay" : "okay",
      not_ok_reason: dispatchStatus === "notokay" ? notOkReason || null : null,
      created_by: createdBy || null,
      status: "submitted",
      bilty_upload_planned: biltyUploadPlanned,
      ...(beforePhotoUrls ? { before_photo_urls: beforePhotoUrls } : {}),
      ...(afterPhotoUrls ? { after_photo_urls: afterPhotoUrls } : {}),
    }

    if (existingRow) {
      const { data, error } = await supabase
        .from("otp_packaging_transport")
        .update(finalFields)
        .eq("id", existingRow.id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    if (!beforePhotoUrls || beforePhotoUrls.length === 0) {
      return NextResponse.json({ success: false, error: "At least one Before Photo is required" }, { status: 400 })
    }

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
      .from("otp_packaging_transport")
      .insert({
        make_invoice_id: makeInvoiceId,
        order_id: makeInvoiceRow.order_id,
        ...finalFields,
      })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/packaging-transport exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
