import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { getStageTatMinutes, addTatMinutes } from "@/lib/tat"
import {
  getSectionForMode,
  isReceivingSection,
  FIELD_DEFS,
  FIELD_DB_COLUMN,
  ALL_DYNAMIC_DB_COLUMNS,
  type FieldKey,
} from "@/lib/dispatch-mode"

// Stage — Packaging and Dispatch (otp_* identifiers kept as
// "packaging_transport" — only the UI label changed).
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
//   mode "final" — the rest of the form, branching on the 11-way (+2
//                  legacy) Transport Mode section (see lib/dispatch-mode.ts
//                  and Database/62_dispatch_mode_11way.sql). Downstream is
//                  still only ever 2-way: every section except
//                  "Customer Pickup / Self Pickup" (and the 2 legacy
//                  receiving modes) sets bilty_upload_planned exactly like
//                  before; only Customer Pickup/legacy-receiving skip Bilty
//                  Upload and set client_confirmation_planned directly.
//                  Either way flips status to 'submitted' (creating the
//                  row directly if no draft ever existed) — only now does
//                  it count as History.
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
        .select("*, order:otp_orders(*), makeInvoice:otp_make_invoice(invoice_number, invoice_date, invoice_upload_url, items, packaging_transport_planned, created_at)")
        .eq("status", "submitted")
        .order("created_at", { ascending: false })
        .limit(200)
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
        .select("*, order:otp_orders(*), makeInvoice:otp_make_invoice(invoice_number, invoice_date, invoice_upload_url, items, packaging_transport_planned, created_at)")
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
      transportMode,
      fieldValues,
      receivingCopyUrl,
      transporterRemarks,
      dispatchStatus,
      notOkReason,
      createdBy,
    } = body as {
      mode?: "draft" | "final"
      makeInvoiceId: string
      beforePhotoUrls?: string[]
      afterPhotoUrls?: string[]
      transportMode?: string
      fieldValues?: Partial<Record<FieldKey, string>>
      receivingCopyUrl?: string
      transporterRemarks?: string
      dispatchStatus?: string
      notOkReason?: string
      createdBy?: string
    }

    if (!makeInvoiceId) {
      return NextResponse.json({ success: false, error: "Missing makeInvoiceId" }, { status: 400 })
    }

    const isDraft = mode === "draft"
    // Never trust the client's section choice — re-derive it from the mode
    // string itself (same classification the page used to pick which
    // section to show).
    const section = getSectionForMode(transportMode)
    const isReceiving = isReceivingSection(section)
    const sectionDefs = FIELD_DEFS[section] || []

    if (isDraft && (!beforePhotoUrls || beforePhotoUrls.length === 0)) {
      return NextResponse.json({ success: false, error: "At least one Before Photo is required" }, { status: 400 })
    }
    if (!isDraft) {
      if (!transportMode || !transportMode.trim()) {
        return NextResponse.json({ success: false, error: "Transport Mode is required" }, { status: 400 })
      }
      for (const def of sectionDefs) {
        if (!def.required) continue
        const val = def.key === "receiving_copy_url" ? receivingCopyUrl : fieldValues?.[def.key]
        if (!val || !String(val).trim()) {
          return NextResponse.json({ success: false, error: `${def.label} is required` }, { status: 400 })
        }
      }
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

    // Final submit. Build the dynamic (per-section) columns generically
    // from FIELD_DEFS/FIELD_DB_COLUMN — every dynamic column this section
    // doesn't use is explicitly nulled so a later re-submit under a
    // different mode never leaves stale data from a prior section behind.
    const dynamicFields: Record<string, any> = {}
    for (const col of ALL_DYNAMIC_DB_COLUMNS) dynamicFields[col] = null
    for (const def of sectionDefs) {
      const dbCol = FIELD_DB_COLUMN[def.key]
      if (def.key === "receiving_copy_url") {
        dynamicFields[dbCol] = receivingCopyUrl ? receivingCopyUrl.trim() : null
      } else if (def.key === "expense_amount") {
        dynamicFields[dbCol] = toNumberOrNull(fieldValues?.[def.key])
      } else {
        const val = fieldValues?.[def.key]
        dynamicFields[dbCol] = val && String(val).trim() ? String(val).trim() : null
      }
    }

    // Receiving's Section (legacy "By Hand ..." modes and the new Customer
    // Pickup / Self Pickup) skips Bilty Upload entirely —
    // client_confirmation_planned is set directly here instead of
    // bilty_upload_planned, so Client Confirmation's own Pending picks it
    // up straight from this row (see
    // Database/59_packaging_dispatch_receiving_section.sql and
    // client-confirmation/route.ts). Every other section keeps the
    // original bilty_upload_planned flow, unchanged.
    const finalFields = {
      transport_mode: transportMode!.trim(),
      ...dynamicFields,
      transporter_remarks: transporterRemarks || null,
      dispatch_status: dispatchStatus === "notokay" ? "notokay" : "okay",
      not_ok_reason: dispatchStatus === "notokay" ? notOkReason || null : null,
      created_by: createdBy || null,
      status: "submitted",
      ...(isReceiving
        ? {
            bilty_upload_planned: null,
            client_confirmation_planned: addTatMinutes(new Date(), await getStageTatMinutes("client_confirmation")),
          }
        : {
            bilty_upload_planned: addTatMinutes(new Date(), await getStageTatMinutes("bilty_upload")),
            client_confirmation_planned: null,
          }),
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
