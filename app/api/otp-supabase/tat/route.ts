import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Kept in sync with app/settings/tat-helpers.ts's TAT_STAGE_OPTIONS — these
// are the real current pipeline stages (see Database/33_otp_stage_tat.sql).
const STAGE_ORDER: Record<string, number> = {
  order_acceptable: 1,
  proforma_invoice: 2,
  debit_note: 3,
  check_inventory: 4,
  material_received: 5,
  pre_invoice: 6,
  debit_note_for_invoice: 7,
  make_invoice: 8,
  calibration: 9,
  packaging_transport: 10,
  bilty_upload: 11,
}

const DEFAULT_STAGES = [
  { stage_key: "order_acceptable", stage_label: "Order Acceptable", tat_minutes: 7200, description: "otp_orders.order_acceptable_planned — 5 days from order conversion" },
  { stage_key: "proforma_invoice", stage_label: "Pro-Forma Invoice", tat_minutes: 4320, description: "otp_orders_acceptable.proforma_invoice_planned — 3 days from Order Acceptable (payment_mode = pi against advance only)" },
  { stage_key: "debit_note", stage_label: "Debit Note", tat_minutes: 4320, description: "otp_orders_acceptable.debit_note_planned — 3 days from Order Acceptable (payment_mode = na only)" },
  { stage_key: "check_inventory", stage_label: "Check Inventory", tat_minutes: 4320, description: "otp_orders_acceptable.check_inventory_planned — 3 days from Order Acceptable or Pro-Forma Invoice" },
  { stage_key: "material_received", stage_label: "Material Received", tat_minutes: 1440, description: "otp_material_shortage — created on Check Inventory shortage, no fixed planned offset yet" },
  { stage_key: "pre_invoice", stage_label: "Pre-Invoice", tat_minutes: 1440, description: "otp_pre_invoice_queue (status=pending) — created by Check Inventory/Material Received, no fixed planned offset yet" },
  { stage_key: "debit_note_for_invoice", stage_label: "Debit Note (Inv.)", tat_minutes: 4320, description: "otp_pre_invoice_queue.debit_note_planned — 3 days from Pre-Invoice submit" },
  { stage_key: "make_invoice", stage_label: "Make Invoice", tat_minutes: 4320, description: "otp_pre_invoice_queue.make_invoice_planned — 3 days from Debit Note (Inv.)" },
  { stage_key: "calibration", stage_label: "Calibration Certificate", tat_minutes: 7200, description: "otp_make_invoice.calibration_planned — 5 days from Make Invoice (calibration_required only)" },
  { stage_key: "packaging_transport", stage_label: "Packaging and Transport", tat_minutes: 4320, description: "otp_make_invoice.packaging_transport_planned — 3 days from Make Invoice" },
  { stage_key: "bilty_upload", stage_label: "Bilty Upload", tat_minutes: 1440, description: "otp_packaging_transport.bilty_upload_planned — 1 day from Packaging and Transport" },
]

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("otp_stage_tat")
      .select("*")

    if (error) {
      console.error("GET TAT error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // If table is empty, auto-seed defaults
    if (!data || data.length === 0) {
      const { data: seeded, error: seedErr } = await supabase
        .from("otp_stage_tat")
        .upsert(DEFAULT_STAGES, { onConflict: "stage_key" })
        .select()

      if (seedErr) {
        console.error("Auto-seed TAT error:", seedErr)
        return NextResponse.json({ success: true, data: DEFAULT_STAGES })
      }
      
      const sortedSeeded = (seeded || DEFAULT_STAGES).sort(
        (a: any, b: any) => (STAGE_ORDER[a.stage_key] || 99) - (STAGE_ORDER[b.stage_key] || 99)
      )
      return NextResponse.json({ success: true, data: sortedSeeded })
    }

    // Sort stages by logical pipeline sequence (Stage 1 to 9)
    const sortedData = [...data].sort(
      (a: any, b: any) => (STAGE_ORDER[a.stage_key] || 99) - (STAGE_ORDER[b.stage_key] || 99)
    )

    return NextResponse.json({ success: true, data: sortedData })
  } catch (err: any) {
    console.error("GET TAT exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, stage_key, stage_label, tat_minutes, description } = body

    if (!stage_key && !id) {
      return NextResponse.json(
        { success: false, error: "Stage key or ID is required" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }

    if (tat_minutes !== undefined) updatePayload.tat_minutes = Math.max(0, Number(tat_minutes) || 0)
    if (stage_label !== undefined) updatePayload.stage_label = stage_label
    if (description !== undefined) updatePayload.description = description

    let query = supabase.from("otp_stage_tat").update(updatePayload)
    if (id) {
      query = query.eq("id", id)
    } else {
      query = query.eq("stage_key", stage_key)
    }

    const { data, error } = await query.select().single()

    if (error) {
      console.error("PUT TAT error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("PUT TAT exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { stage_key, stage_label, tat_minutes, description } = body

    if (!stage_key || !stage_label) {
      return NextResponse.json(
        { success: false, error: "stage_key and stage_label are required" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("otp_stage_tat")
      .upsert(
        [
          {
            stage_key,
            stage_label,
            tat_minutes: Math.max(0, Number(tat_minutes) || 0),
            description: description || "",
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "stage_key" }
      )
      .select()
      .single()

    if (error) {
      console.error("POST TAT error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST TAT exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
