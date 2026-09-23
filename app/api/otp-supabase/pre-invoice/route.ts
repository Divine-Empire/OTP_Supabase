import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { getStageTatMinutes, addTatMinutes } from "@/lib/tat"

// Stage — Pre-Invoice.
//
// Pending: otp_pre_invoice_queue.status = 'pending' (a queue row per wave —
//          Check Inventory's available-qty submission creates one; a future
//          Material Received partial-receipt submission will create more
//          for the same order).
// History: otp_pre_invoice_queue.status = 'invoiced', set on Submit here —
//          this stage doesn't capture the Invoice Number itself; that's
//          Make Invoice's job, one stage later, on its own otp_make_invoice
//          table (see Database/25_otp_make_invoice.sql). status is the sole
//          pending/history signal here, same as every other stage.
//
// The Process dialog's "Debit Note (Inv.) Required" choice decides which
// of the two downstream planned dates gets set here (see
// Database/37_pre_invoice_debit_note_choice.sql):
//   YES -> debit_note_planned set, make_invoice_planned left null — wave
//          goes to Debit Note (Inv.)'s Pending first; make_invoice_planned
//          only gets set once THAT stage is processed (unchanged, see
//          debit-note-for-invoice/route.ts).
//   NO  -> make_invoice_planned set directly, debit_note_planned left
//          null — wave skips Debit Note (Inv.) and goes straight to Make
//          Invoice's Pending.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") === "history" ? "invoiced" : "pending"
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("otp_pre_invoice_queue")
      .select("*, order:otp_orders(*)")
      .eq("status", status)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/pre-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      id,
      createdBy,
      items,
      calibrationRequired,
      calibrationType,
      transportId,
      gstNumber,
      vehicleNumber,
      dispatchLocation,
      directDispatchDetails,
      paymentAttachmentUrl,
      srnAttachmentUrl,
      remarks,
      paymentMode,
      debitNoteForInvoiceRequired,
    } = body as {
      id: string
      createdBy?: string
      items?: { item_code: string; item_name: string; qty: number; serial_no?: string }[]
      calibrationRequired?: "YES" | "NO" | ""
      calibrationType?: string
      transportId?: string
      gstNumber?: string
      vehicleNumber?: string
      dispatchLocation?: string
      directDispatchDetails?: string
      paymentAttachmentUrl?: string
      srnAttachmentUrl?: string
      remarks?: string
      paymentMode?: string
      debitNoteForInvoiceRequired?: "YES" | "NO" | ""
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Debit Note (Inv.) is now a user choice made right here in the Process
    // dialog — YES routes the wave through Debit Note (Inv.) first (its
    // planned date set now, same timing as invoiced_at, unchanged from
    // before); NO skips it and unlocks Make Invoice directly instead.
    // Planned = this record's creation time (now) + that stage's TAT.
    const debitNoteRequired = debitNoteForInvoiceRequired === "YES"
    const debitNotePlanned = debitNoteRequired
      ? addTatMinutes(new Date(), await getStageTatMinutes("debit_note_for_invoice"))
      : null
    const makeInvoicePlanned = debitNoteRequired
      ? null
      : addTatMinutes(new Date(), await getStageTatMinutes("make_invoice"))

    const { data, error } = await supabase
      .from("otp_pre_invoice_queue")
      .update({
        created_by: createdBy || null,
        status: "invoiced",
        invoiced_at: new Date().toISOString(),
        debit_note_for_invoice_required: debitNoteRequired,
        debit_note_planned: debitNotePlanned,
        make_invoice_planned: makeInvoicePlanned,
        // Items get saved back finalized (per-serial rows the warehouse
        // person confirmed/adjusted in the Pre-Invoice dialog), replacing
        // the lump-qty breakdown Check Inventory originally queued.
        ...(items ? { items } : {}),
        calibration_required: calibrationRequired === "YES" ? true : calibrationRequired === "NO" ? false : null,
        calibration_type: calibrationType || null,
        transport_id: transportId || null,
        gst_number: gstNumber || null,
        vehicle_number: vehicleNumber || null,
        dispatch_location: dispatchLocation || null,
        direct_dispatch_details: directDispatchDetails || null,
        payment_attachment_url: paymentAttachmentUrl || null,
        srn_attachment_url: srnAttachmentUrl || null,
        remarks: remarks || null,
        payment_mode: paymentMode || null,
      })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Queue row not found or already invoiced" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/pre-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
