import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNo = searchParams.get("orderNo")

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from("otp_order_cancel")
      .select("*")
      .order("cancelled_at", { ascending: false })

    if (orderNo) {
      query = query.eq("order_no", orderNo)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching order cancels:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET cancel exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const targetOrderNo = body.order_no || body.orderNo
    const targetStage = body.cancel_stage || body.cancelStage || ""
    const targetReason = body.cancel_reason || body.cancelReason || body.reason || ""
    const targetQty = Number(body.qty || body.quantity || 0)
    const targetCreatedBy = body.created_by || body.createdBy || body.cancelled_by || "Admin"

    if (!targetOrderNo) {
      return NextResponse.json({ success: false, error: "Missing orderNo or order_no" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Find order_id if available
    const { data: ord } = await supabase
      .from("otp_orders")
      .select("id")
      .eq("order_no", targetOrderNo)
      .single()

    const { data, error } = await supabase
      .from("otp_order_cancel")
      .insert([{
        order_id: ord?.id || null,
        order_no: targetOrderNo,
        cancel_stage: targetStage,
        cancel_reason: targetReason,
        qty: targetQty,
        created_by: targetCreatedBy,
      }])
      .select()
      .single()

    if (error) {
      console.error("Error logging order cancel:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST cancel exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
