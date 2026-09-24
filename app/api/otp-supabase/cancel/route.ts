import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Order Cancel — pulls an order out of whichever stage(s) it is
// CURRENTLY pending in. Reuses the "planned date IS NOT NULL + no
// matching child row = Pending" invariant every stage already runs on
// instead of a parallel per-table status. See
// Database/41_otp_order_cancel.sql for the full design note — no cascade
// logic is needed since the pipeline is strictly sequential PER WAVE, but
// a single order can have several independent waves (partial shipments)
// each sitting at a different stage at the same time — that's why more
// than one checkbox can legitimately show up together.
const STAGE_LABELS: Record<string, string> = {
  order_acceptable: "Order Acceptable",
  proforma_invoice: "Pro-Forma Invoice",
  debit_note: "Debit Note",
  check_inventory: "Check Inventory",
  material_received: "Material Received",
  pre_invoice: "Pre-Invoice",
  debit_note_for_invoice: "Debit Note (Inv.)",
  make_invoice: "Make Invoice",
  calibration: "Calibration Certificate",
  packaging_transport: "Packaging and Transport",
  bilty_upload: "Bilty Upload",
}

// Item shape is inconsistent across tables (item_name/name,
// qty/quantity/indented_qty) — normalize to {name, qty} for the cancel
// form's Item List button.
function normalizeItems(raw: any[]): { name: string; qty: number | string }[] {
  return (raw || []).map((it: any) => ({
    name: it.item_name || it.name || "",
    qty: it.qty ?? it.quantity ?? it.indented_qty ?? "",
  }))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNo = searchParams.get("orderNo")

    const supabase = getSupabaseAdmin()

    if (!orderNo) {
      // No order given — behave like the old route's plain log listing.
      const { data, error } = await supabase
        .from("otp_order_cancel")
        .select("*")
        .order("cancelled_at", { ascending: false })
      if (error) throw error
      return NextResponse.json({ success: true, data: data || [] })
    }

    const { data: order, error: orderError } = await supabase
      .from("otp_orders")
      .select("*")
      .eq("order_no", orderNo.trim())
      .maybeSingle()
    if (orderError) throw orderError
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    const orderItems = normalizeItems(order.items || [])
    const pendingStages: { key: string; label: string; items: { name: string; qty: number | string }[] }[] = []

    // 1. Order Acceptable
    if (order.order_acceptable_planned) {
      const { data: oaRow } = await supabase
        .from("otp_orders_acceptable")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle()
      if (!oaRow) pendingStages.push({ key: "order_acceptable", label: STAGE_LABELS.order_acceptable, items: orderItems })
    }

    // Order Acceptable's own child row — feeds proforma_invoice, debit_note, check_inventory.
    const { data: oaProcessedRow } = await supabase
      .from("otp_orders_acceptable")
      .select("proforma_invoice_planned, debit_note_planned, check_inventory_planned")
      .eq("order_id", order.id)
      .maybeSingle()

    if (oaProcessedRow) {
      // 2. Pro-Forma Invoice
      if (oaProcessedRow.proforma_invoice_planned) {
        const { data: row } = await supabase.from("otp_proforma_invoice").select("id").eq("order_id", order.id).maybeSingle()
        if (!row) pendingStages.push({ key: "proforma_invoice", label: STAGE_LABELS.proforma_invoice, items: orderItems })
      }
      // 3. Debit Note
      if (oaProcessedRow.debit_note_planned) {
        const { data: row } = await supabase.from("otp_debit_note").select("id").eq("order_id", order.id).maybeSingle()
        if (!row) pendingStages.push({ key: "debit_note", label: STAGE_LABELS.debit_note, items: orderItems })
      }
      // 4. Check Inventory
      if (oaProcessedRow.check_inventory_planned) {
        const { data: row } = await supabase.from("otp_check_inventory").select("id").eq("order_id", order.id).maybeSingle()
        if (!row) pendingStages.push({ key: "check_inventory", label: STAGE_LABELS.check_inventory, items: orderItems })
      }
    }

    // 5. Material Received — row-based, one per short item.
    const { data: shortageRows } = await supabase
      .from("otp_material_shortage")
      .select("item_name, indented_qty, received_qty, remaining_qty")
      .eq("order_id", order.id)
      .eq("status", "pending")
    if (shortageRows && shortageRows.length > 0) {
      pendingStages.push({
        key: "material_received",
        label: STAGE_LABELS.material_received,
        items: shortageRows.map((r: any) => ({ name: r.item_name, qty: `${r.remaining_qty ?? r.indented_qty - r.received_qty} pending` })),
      })
    }

    // 6. Pre-Invoice — row-based, one per wave.
    const { data: pendingWaves } = await supabase
      .from("otp_pre_invoice_queue")
      .select("id, items")
      .eq("order_id", order.id)
      .eq("status", "pending")
    if (pendingWaves && pendingWaves.length > 0) {
      pendingStages.push({
        key: "pre_invoice",
        label: STAGE_LABELS.pre_invoice,
        items: normalizeItems(pendingWaves.flatMap((w: any) => w.items || [])),
      })
    }

    // Invoiced waves feed debit_note_for_invoice / make_invoice.
    const { data: invoicedWaves } = await supabase
      .from("otp_pre_invoice_queue")
      .select("id, items, debit_note_planned, make_invoice_planned")
      .eq("order_id", order.id)
      .eq("status", "invoiced")

    if (invoicedWaves && invoicedWaves.length > 0) {
      const waveIds = invoicedWaves.map((w: any) => w.id)

      const { data: dniRows } = await supabase.from("otp_debit_note_for_invoice").select("pre_invoice_queue_id").in("pre_invoice_queue_id", waveIds)
      const dniDoneIds = (dniRows || []).map((r: any) => r.pre_invoice_queue_id)
      const dniPendingWaves = invoicedWaves.filter((w: any) => w.debit_note_planned && !dniDoneIds.includes(w.id))
      // 7. Debit Note (Inv.)
      if (dniPendingWaves.length > 0) {
        pendingStages.push({
          key: "debit_note_for_invoice",
          label: STAGE_LABELS.debit_note_for_invoice,
          items: normalizeItems(dniPendingWaves.flatMap((w: any) => w.items || [])),
        })
      }

      const { data: miRows } = await supabase.from("otp_make_invoice").select("id, pre_invoice_queue_id").in("pre_invoice_queue_id", waveIds)
      const miDoneWaveIds = (miRows || []).map((r: any) => r.pre_invoice_queue_id)
      const miPendingWaves = invoicedWaves.filter((w: any) => w.make_invoice_planned && !miDoneWaveIds.includes(w.id))
      // 8. Make Invoice
      if (miPendingWaves.length > 0) {
        pendingStages.push({
          key: "make_invoice",
          label: STAGE_LABELS.make_invoice,
          items: normalizeItems(miPendingWaves.flatMap((w: any) => w.items || [])),
        })
      }
    }

    // Make Invoice rows feed calibration / packaging_transport / bilty_upload.
    const { data: makeInvoiceRows } = await supabase
      .from("otp_make_invoice")
      .select("id, items, calibration_planned, packaging_transport_planned")
      .eq("order_id", order.id)

    if (makeInvoiceRows && makeInvoiceRows.length > 0) {
      const miIds = makeInvoiceRows.map((r: any) => r.id)
      const itemsByMiId = new Map(makeInvoiceRows.map((r: any) => [r.id, r.items || []]))

      const { data: calRows } = await supabase.from("otp_calibration_certificate").select("make_invoice_id").in("make_invoice_id", miIds)
      const calDoneIds = (calRows || []).map((r: any) => r.make_invoice_id)
      const calibrationPendingRows = makeInvoiceRows.filter((r: any) => r.calibration_planned && !calDoneIds.includes(r.id))
      // 9. Calibration Certificate
      if (calibrationPendingRows.length > 0) {
        pendingStages.push({
          key: "calibration",
          label: STAGE_LABELS.calibration,
          items: normalizeItems(calibrationPendingRows.flatMap((r: any) => r.items || [])),
        })
      }

      const { data: ptRows } = await supabase
        .from("otp_packaging_transport")
        .select("id, make_invoice_id, status, bilty_upload_planned")
        .in("make_invoice_id", miIds)
      const draftPt = (ptRows || []).filter((r: any) => r.status === "draft")
      const ptSubmittedIds = (ptRows || []).filter((r: any) => r.status === "submitted").map((r: any) => r.make_invoice_id)
      const packagingTransportPendingRows = makeInvoiceRows.filter(
        (r: any) => r.packaging_transport_planned && !ptSubmittedIds.includes(r.id)
      )
      // 10. Packaging and Transport
      if (draftPt.length > 0 || packagingTransportPendingRows.length > 0) {
        const draftMiIds = draftPt.map((r: any) => r.make_invoice_id)
        const relevantItems = [...packagingTransportPendingRows.map((r: any) => r.id), ...draftMiIds]
        pendingStages.push({
          key: "packaging_transport",
          label: STAGE_LABELS.packaging_transport,
          items: normalizeItems(relevantItems.flatMap((id: string) => itemsByMiId.get(id) || [])),
        })
      }

      // 11. Bilty Upload — off submitted packaging_transport rows.
      const submittedPt = (ptRows || []).filter((r: any) => r.status === "submitted")
      if (submittedPt.length > 0) {
        const ptIds = submittedPt.map((r: any) => r.id)
        const { data: biltyRows } = await supabase.from("otp_bilty_upload").select("packaging_transport_id").in("packaging_transport_id", ptIds)
        const biltyDoneIds = (biltyRows || []).map((r: any) => r.packaging_transport_id)
        const biltyPendingPt = submittedPt.filter((r: any) => r.bilty_upload_planned && !biltyDoneIds.includes(r.id))
        if (biltyPendingPt.length > 0) {
          pendingStages.push({
            key: "bilty_upload",
            label: STAGE_LABELS.bilty_upload,
            items: normalizeItems(biltyPendingPt.flatMap((r: any) => itemsByMiId.get(r.make_invoice_id) || [])),
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_no: order.order_no,
        company_name: order.company_name,
        quotation_number: order.quotation_number,
      },
      pendingStages,
    })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/cancel exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderNo, selectedStages, cancelReason, cancelledBy } = body as {
      orderNo: string
      selectedStages: string[]
      cancelReason: string
      cancelledBy?: string
    }

    if (!orderNo || !Array.isArray(selectedStages) || selectedStages.length === 0) {
      return NextResponse.json({ success: false, error: "orderNo and at least one selected stage are required" }, { status: 400 })
    }
    if (!cancelReason || !cancelReason.trim()) {
      return NextResponse.json({ success: false, error: "Cancel reason is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: order, error: orderError } = await supabase
      .from("otp_orders")
      .select("id, order_no")
      .eq("order_no", orderNo.trim())
      .maybeSingle()
    if (orderError) throw orderError
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    const cancelledRows: { key: string; label: string }[] = []

    for (const stageKey of selectedStages) {
      switch (stageKey) {
        case "order_acceptable": {
          await supabase.from("otp_orders").update({ order_acceptable_planned: null }).eq("id", order.id)
          break
        }
        case "proforma_invoice": {
          await supabase.from("otp_orders_acceptable").update({ proforma_invoice_planned: null }).eq("order_id", order.id)
          break
        }
        case "debit_note": {
          await supabase.from("otp_orders_acceptable").update({ debit_note_planned: null }).eq("order_id", order.id)
          break
        }
        case "check_inventory": {
          await supabase.from("otp_orders_acceptable").update({ check_inventory_planned: null }).eq("order_id", order.id)
          break
        }
        case "material_received": {
          await supabase.from("otp_material_shortage").update({ status: "cancelled" }).eq("order_id", order.id).eq("status", "pending")
          break
        }
        case "pre_invoice": {
          await supabase.from("otp_pre_invoice_queue").update({ status: "cancelled" }).eq("order_id", order.id).eq("status", "pending")
          break
        }
        case "debit_note_for_invoice": {
          await supabase.from("otp_pre_invoice_queue").update({ debit_note_planned: null }).eq("order_id", order.id).eq("status", "invoiced")
          break
        }
        case "make_invoice": {
          await supabase.from("otp_pre_invoice_queue").update({ make_invoice_planned: null }).eq("order_id", order.id).eq("status", "invoiced")
          break
        }
        case "calibration": {
          await supabase.from("otp_make_invoice").update({ calibration_planned: null }).eq("order_id", order.id)
          break
        }
        case "packaging_transport": {
          // A draft row (photos-only, not yet submitted) doesn't depend on
          // packaging_transport_planned to show up in Pending — it has to
          // be removed outright, see app/api/otp-supabase/packaging-transport/route.ts.
          await supabase.from("otp_packaging_transport").delete().eq("order_id", order.id).eq("status", "draft")
          await supabase.from("otp_make_invoice").update({ packaging_transport_planned: null }).eq("order_id", order.id)
          break
        }
        case "bilty_upload": {
          await supabase.from("otp_packaging_transport").update({ bilty_upload_planned: null }).eq("order_id", order.id).eq("status", "submitted")
          break
        }
        default:
          continue
      }

      const label = STAGE_LABELS[stageKey] || stageKey
      cancelledRows.push({ key: stageKey, label })
    }

    if (cancelledRows.length === 0) {
      return NextResponse.json({ success: false, error: "No valid stages were cancelled" }, { status: 400 })
    }

    const { data: logRows, error: logError } = await supabase
      .from("otp_order_cancel")
      .insert(
        cancelledRows.map((s) => ({
          order_id: order.id,
          order_no: order.order_no,
          stage_key: s.key,
          stage_label: s.label,
          cancel_reason: cancelReason.trim(),
          cancelled_by: cancelledBy || null,
        }))
      )
      .select()
    if (logError) throw logError

    return NextResponse.json({ success: true, data: logRows })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/cancel exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
