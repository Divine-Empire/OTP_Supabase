import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

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
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("otp_pre_invoice_queue")
      .update({
        created_by: createdBy || null,
        status: "invoiced",
        invoiced_at: new Date().toISOString(),
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
