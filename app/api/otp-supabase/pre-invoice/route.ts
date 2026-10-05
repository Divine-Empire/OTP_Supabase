import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { getStageTatMinutes, addTatMinutes } from "@/lib/tat"

const nameKey = (name?: string | null) => (name || "").trim().toLowerCase()

// Sums {item_name, qty} rows by nameKey() — used to diff "what was queued"
// against "what's being submitted now" so a qty reduction (see POST) can be
// detected per item name, not per exploded row.
function sumQtyByName(rows: { item_name?: string; qty?: number }[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const r of rows || []) {
    const key = nameKey(r.item_name)
    if (!key) continue
    totals.set(key, (totals.get(key) || 0) + (Number(r.qty) || 0))
  }
  return totals
}

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
// The Process dialog's "Delivery Note (Inv.) Required" choice decides which
// of the two downstream planned dates gets set here (see
// Database/37_pre_invoice_debit_note_choice.sql):
//   YES -> debit_note_planned set, make_invoice_planned left null — wave
//          goes to Delivery Note (Inv.)'s Pending first; make_invoice_planned
//          only gets set once THAT stage is processed (unchanged, see
//          delivery-note-for-invoice/route.ts).
//   NO  -> make_invoice_planned set directly, debit_note_planned left
//          null — wave skips Delivery Note (Inv.) and goes straight to Make
//          Invoice's Pending.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") === "history" ? "invoiced" : "pending"
    const supabase = getSupabaseAdmin()

    let { data, error } = await supabase
      .from("otp_pre_invoice_queue")
      .select(
        "*, order:otp_orders(*, shortages:otp_check_inventory_shortage(shortage_qty, status)), released:otp_released_stock(item_name, qty_released, reason, released_by, created_at)"
      )
      .eq("status", status)
      .order("created_at", { ascending: false })

    // Database/55_otp_released_stock.sql not applied yet — PostgREST can't
    // resolve the embedded `released` relation and fails the WHOLE query.
    // Degrade to the same select without it rather than breaking this
    // entire stage's Pending/History while that migration is pending.
    if (error && (error.code === "PGRST205" || /schema cache|could not find/i.test(error.message || ""))) {
      console.warn("otp_released_stock table not found yet — fetching pre-invoice without it:", error.message)
      ;({ data, error } = await supabase
        .from("otp_pre_invoice_queue")
        .select("*, order:otp_orders(*, shortages:otp_check_inventory_shortage(shortage_qty, status))")
        .eq("status", status)
        .order("created_at", { ascending: false }))
    }

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
      DeliveryNoteForInvoiceRequired,
      reductionReasons,
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
      DeliveryNoteForInvoiceRequired?: "YES" | "NO" | ""
      reductionReasons?: Record<string, string> // nameKey -> reason, required for any item_name reduced below its queued qty
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Qty can be freely reduced below what Check Inventory originally queued
    // (e.g. ship less now, after a client call) — see
    // Database/55_otp_released_stock.sql. Diff against the row's own
    // pre-edit items (not the live order) so this only ever reacts to a
    // reduction made in THIS submit, and require a reason per reduced item
    // name so the freed qty is never silently lost before it's logged.
    if (items) {
      const { data: currentRow, error: currentRowError } = await supabase
        .from("otp_pre_invoice_queue")
        .select("items, order_id")
        .eq("id", id)
        .eq("status", "pending")
        .maybeSingle()
      if (currentRowError) throw currentRowError
      if (!currentRow) {
        return NextResponse.json(
          { success: false, error: "Queue row not found or already invoiced" },
          { status: 404 }
        )
      }

      const originalTotals = sumQtyByName((currentRow.items || []) as any[])
      const submittedTotals = sumQtyByName(items)
      const missingReasons: string[] = []
      const releaseRows: any[] = []

      for (const [key, originalQty] of originalTotals.entries()) {
        const delta = originalQty - (submittedTotals.get(key) || 0)
        if (delta <= 0) continue

        const reason = reductionReasons?.[key]
        if (!reason || !reason.trim()) {
          missingReasons.push(key)
          continue
        }

        const srcItem =
          ((currentRow.items || []) as any[]).find((it) => nameKey(it.item_name) === key) ||
          items.find((it) => nameKey(it.item_name) === key)
        releaseRows.push({
          item_name: srcItem?.item_name || key,
          item_code: srcItem?.item_code || null,
          qty_released: delta,
          qty_remaining: delta,
          source_order_id: currentRow.order_id,
          source_queue_id: id,
          reason: reason.trim(),
          released_by: createdBy || null,
        })
      }

      if (missingReasons.length > 0) {
        return NextResponse.json(
          { success: false, error: `Reason required for reduced qty on: ${missingReasons.join(", ")}` },
          { status: 400 }
        )
      }

      if (releaseRows.length > 0) {
        const { error: releaseError } = await supabase.from("otp_released_stock").insert(releaseRows)
        if (releaseError) throw releaseError
      }
    }

    // Delivery Note (Inv.) is now a user choice made right here in the Process
    // dialog — YES routes the wave through Delivery Note (Inv.) first (its
    // planned date set now, same timing as invoiced_at, unchanged from
    // before); NO skips it and unlocks Make Invoice directly instead.
    // Planned = this record's creation time (now) + that stage's TAT.
    const DeliveryNoteRequired = DeliveryNoteForInvoiceRequired === "YES"
    const DeliveryNotePlanned = DeliveryNoteRequired
      ? addTatMinutes(new Date(), await getStageTatMinutes("debit_note_for_invoice"))
      : null
    const makeInvoicePlanned = DeliveryNoteRequired
      ? null
      : addTatMinutes(new Date(), await getStageTatMinutes("make_invoice"))

    const { data, error } = await supabase
      .from("otp_pre_invoice_queue")
      .update({
        created_by: createdBy || null,
        status: "invoiced",
        invoiced_at: new Date().toISOString(),
        debit_note_for_invoice_required: DeliveryNoteRequired,
        debit_note_planned: DeliveryNotePlanned,
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
