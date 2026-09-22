import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { getStageTatMinutes, addTatMinutes } from "@/lib/tat"

// Stage — Pro-Forma Invoice (only reached when otp_orders.payment_mode =
// 'pi against advance' — see order-acceptable/route.ts).
//
// Pending: otp_orders_acceptable.proforma_invoice_planned IS NOT NULL AND
//          no matching otp_proforma_invoice row yet.
// History: a matching otp_proforma_invoice row exists.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history") {
      const { data, error } = await supabase
        .from("otp_proforma_invoice")
        .select("*, order:otp_orders(*)")
        .order("created_at", { ascending: false })
      if (error) throw error

      return NextResponse.json({ success: true, data: data || [] })
    }

    const { data: doneRows, error: doneError } = await supabase.from("otp_proforma_invoice").select("order_id")
    if (doneError) throw doneError
    const doneIds = (doneRows || []).map((r: any) => r.order_id).filter(Boolean)

    let query = supabase
      .from("otp_orders_acceptable")
      .select("*, order:otp_orders(*)")
      .not("proforma_invoice_planned", "is", null)
      .order("created_at", { ascending: false })

    if (doneIds.length > 0) {
      query = query.not("order_id", "in", `(${doneIds.join(",")})`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/proforma-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, piNumber, piAmount, piUploadUrl, remark, createdBy } = body as {
      orderId: string
      piNumber?: string
      piAmount?: number | string
      piUploadUrl?: string
      remark?: string
      createdBy?: string
    }

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("otp_proforma_invoice")
      .insert({
        order_id: orderId,
        pi_number: piNumber || null,
        pi_amount: piAmount ? Number(piAmount) : null,
        pi_upload_url: piUploadUrl || null,
        remark: remark || null,
        created_by: createdBy || null,
      })
      .select()
      .single()
    if (error) throw error

    // Only now does Check Inventory's planned date get set for this
    // order — Pro-Forma Invoice being processed is what unlocks it.
    // Planned = this record's creation time (now) + Check Inventory's TAT.
    const checkInventoryPlanned = addTatMinutes(new Date(), await getStageTatMinutes("check_inventory"))
    const { error: updateError } = await supabase
      .from("otp_orders_acceptable")
      .update({ check_inventory_planned: checkInventoryPlanned })
      .eq("order_id", orderId)
    if (updateError) throw updateError

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/proforma-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
