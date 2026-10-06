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

// Qty can be reduced below what Packing List queued (e.g. ship less now,
// after a client call) — see Database/55_otp_released_stock.sql. Diffs the
// row's own pre-edit items (not the live order) per item name; every
// reduced name needs a reason, and becomes an otp_released_stock row so the
// freed qty is never silently lost. Shared by POST (Process) and PATCH
// (Edit Items) so both enforce the same rule.
function computeReleases(
  originalItems: { item_name?: string; item_code?: string; qty?: number }[],
  submittedItems: { item_name?: string; qty?: number }[],
  reductionReasons: Record<string, string> | undefined,
  ctx: { orderId: string; queueId: string; createdBy?: string }
): { missingReasons: string[]; releaseRows: any[] } {
  const originalTotals = sumQtyByName(originalItems)
  const submittedTotals = sumQtyByName(submittedItems)
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
    const src = originalItems.find((it) => nameKey(it.item_name) === key)
    releaseRows.push({
      item_name: src?.item_name || key,
      item_code: src?.item_code || null,
      qty_released: delta,
      qty_remaining: delta,
      source_order_id: ctx.orderId,
      source_queue_id: ctx.queueId,
      reason: reason.trim(),
      released_by: ctx.createdBy || null,
    })
  }
  return { missingReasons, releaseRows }
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
        "*, order:otp_orders(*, shortages:otp_check_inventory_shortage(shortage_qty, status), indents:otp_indent_creation(items, material_received)), released:otp_released_stock(item_name, qty_released, reason, released_by, created_at)"
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
        .select("*, order:otp_orders(*, shortages:otp_check_inventory_shortage(shortage_qty, status), indents:otp_indent_creation(items, material_received))")
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
      mergeIds?: string[] // other pending waves of the same order, billed together with `id` (see otp_merge_queue_waves)
    }
    const mergeIds = (body.mergeIds || []).filter((m: string) => m && m !== id)

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Validate everything before merging — the merge itself can't be undone.
    const { data: waveRows, error: waveError } = await supabase
      .from("otp_pre_invoice_queue")
      .select("id, items, order_id, status")
      .in("id", [id, ...mergeIds])
    if (waveError) throw waveError
    const primaryRow = (waveRows || []).find((r: any) => r.id === id)
    if (!primaryRow || primaryRow.status !== "pending") {
      return NextResponse.json({ success: false, error: "Queue row not found or already invoiced" }, { status: 404 })
    }
    if (
      (waveRows || []).length !== mergeIds.length + 1 ||
      (waveRows || []).some((r: any) => r.status !== "pending" || r.order_id !== primaryRow.order_id)
    ) {
      return NextResponse.json(
        { success: false, error: "Selected waves must all be pending and belong to the same order" },
        { status: 400 }
      )
    }

    let releaseRows: any[] = []
    if (items) {
      const originalItems = (waveRows || []).flatMap((r: any) => r.items || [])
      const result = computeReleases(originalItems, items, reductionReasons, {
        orderId: primaryRow.order_id,
        queueId: id,
        createdBy,
      })
      if (result.missingReasons.length > 0) {
        return NextResponse.json(
          { success: false, error: `Reason required for reduced qty on: ${result.missingReasons.join(", ")}` },
          { status: 400 }
        )
      }
      releaseRows = result.releaseRows
    }

    if (mergeIds.length > 0) {
      const { error: mergeError } = await supabase.rpc("otp_merge_queue_waves", {
        p_primary: id,
        p_others: mergeIds,
        p_stage: "pre_invoice",
      })
      if (mergeError) throw mergeError
    }

    if (releaseRows.length > 0) {
      const { error: releaseError } = await supabase.from("otp_released_stock").insert(releaseRows)
      if (releaseError) throw releaseError
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

// Edit Items on a still-pending wave (e.g. by CRM), without processing it.
// Reduce-only: can't bill more than Packing List actually found. Same
// reason + released-stock rule as Process (computeReleases). Once the wave
// is processed it leaves Pending, so this naturally stops applying.
export async function PATCH(request: Request) {
  try {
    const { id, items, reductionReasons, editedBy } = (await request.json()) as {
      id: string
      items: { item_name: string; qty: number }[]
      reductionReasons?: Record<string, string>
      editedBy?: string
    }
    if (!id || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Missing id or items" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: row, error: rowError } = await supabase
      .from("otp_pre_invoice_queue")
      .select("items, order_id")
      .eq("id", id)
      .eq("status", "pending")
      .maybeSingle()
    if (rowError) throw rowError
    if (!row) return NextResponse.json({ success: false, error: "Queue row not found or already processed" }, { status: 404 })

    const original = (row.items || []) as any[]
    const originalTotals = sumQtyByName(original)
    const submittedTotals = sumQtyByName(items)
    for (const [key, qty] of submittedTotals) {
      if (!Number.isInteger(qty) || qty < 0) {
        return NextResponse.json({ success: false, error: `${key}: qty must be a whole number, 0 or more` }, { status: 400 })
      }
      if (qty > (originalTotals.get(key) ?? 0)) {
        return NextResponse.json(
          { success: false, error: `${key}: can't increase above what Packing List queued (${originalTotals.get(key) ?? 0})` },
          { status: 400 }
        )
      }
    }

    const { missingReasons, releaseRows } = computeReleases(original, items, reductionReasons, {
      orderId: row.order_id,
      queueId: id,
      createdBy: editedBy,
    })
    if (missingReasons.length > 0) {
      return NextResponse.json(
        { success: false, error: `Reason required for reduced qty on: ${missingReasons.join(", ")}` },
        { status: 400 }
      )
    }
    if (releaseRows.length === 0) return NextResponse.json({ success: true, changed: false })

    // Spread each name's new total back over its original entries in order
    // (a pending wave normally has one entry per name), trimming serials.
    const remaining = new Map(originalTotals)
    for (const [key] of originalTotals) remaining.set(key, submittedTotals.get(key) ?? (originalTotals.get(key) || 0))
    const newItems = original
      .map((it) => {
        const key = nameKey(it.item_name)
        const qty = Math.min(Number(it.qty) || 0, remaining.get(key) || 0)
        remaining.set(key, (remaining.get(key) || 0) - qty)
        return { ...it, qty, serials: (it.serials || []).slice(0, qty) }
      })
      .filter((it) => it.qty > 0)

    const { error: releaseError } = await supabase.from("otp_released_stock").insert(releaseRows)
    if (releaseError) throw releaseError

    // Emptied wave -> 'cancelled' with no items rather than deleted: the
    // released-stock rows just inserted point at it (ON DELETE CASCADE).
    const { error: updateError } = await supabase
      .from("otp_pre_invoice_queue")
      .update(newItems.length === 0 ? { items: [], status: "cancelled" } : { items: newItems })
      .eq("id", id)
      .eq("status", "pending")
    if (updateError) throw updateError

    return NextResponse.json({ success: true, changed: true })
  } catch (err: any) {
    console.error("PATCH /api/otp-supabase/pre-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
