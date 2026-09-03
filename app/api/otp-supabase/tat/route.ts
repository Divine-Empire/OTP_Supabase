import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

const STAGE_ORDER: Record<string, number> = {
  order_acceptable: 1,
  check_inventory: 2,
  material_received: 3,
  senior_approval: 4,
  make_invoice: 5,
  warehouse: 6,
  material_receiving: 7,
  calibration: 8,
  update_delivery: 9,
}

const DEFAULT_STAGES = [
  { stage_key: "order_acceptable", stage_label: "Order Acceptable", tat_minutes: 7200, description: "5 working days from order creation" },
  { stage_key: "check_inventory", stage_label: "Check Inventory", tat_minutes: 4320, description: "3 working days from Stage 1 actual" },
  { stage_key: "material_received", stage_label: "Indent / Material Received", tat_minutes: 1440, description: "1 working day from Stage 2 actual" },
  { stage_key: "senior_approval", stage_label: "Senior Approval", tat_minutes: 0, description: "Same day as Stage 2/3 actual" },
  { stage_key: "make_invoice", stage_label: "Make Invoice", tat_minutes: 7200, description: "5 working days from dispatch creation" },
  { stage_key: "warehouse", stage_label: "Warehouse / Material RCVD", tat_minutes: 7200, description: "5 working days from Stage 5 actual" },
  { stage_key: "material_receiving", stage_label: "Driver / Material Receiving", tat_minutes: 7200, description: "5 working days from Stage 6 actual" },
  { stage_key: "calibration", stage_label: "Calibration Certificate", tat_minutes: 7200, description: "5 working days from dispatch creation" },
  { stage_key: "update_delivery", stage_label: "Update Delivery Note", tat_minutes: 7200, description: "5 working days from dispatch creation" },
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
