import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNo = searchParams.get("orderNo")

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from("otp_credit_note")
      .select("*")
      .order("created_at", { ascending: false })

    if (orderNo) {
      query = query.eq("order_no", orderNo)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching credit notes:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET credit-note exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const targetOrderNo = body.order_no || body.orderNo
    const targetInvoiceNo = body.invoice_no || body.invoiceNo || body.invoiceNumber || ""
    const targetQuantity = Number(body.quantity || body.qty || 0)
    const targetValue = Number(body.value || body.amount || 0)
    const targetSeniorApproval = body.senior_approval || body.seniorApproval || ""
    const targetReasons = body.reasons || body.reason || ""
    const targetRemarks = body.remarks || body.remark || ""
    const targetCreatedBy = body.created_by || body.createdBy || "Admin"

    if (!targetOrderNo) {
      return NextResponse.json({ success: false, error: "Missing orderNo or order_no" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: ord } = await supabase
      .from("otp_orders")
      .select("id")
      .eq("order_no", targetOrderNo)
      .single()

    const { data, error } = await supabase
      .from("otp_credit_note")
      .insert([{
        order_id: ord?.id || null,
        order_no: targetOrderNo,
        invoice_no: targetInvoiceNo,
        quantity: targetQuantity,
        value: targetValue,
        senior_approval: targetSeniorApproval,
        reasons: targetReasons,
        remarks: targetRemarks,
        created_by: targetCreatedBy,
      }])
      .select()
      .single()

    if (error) {
      console.error("Error logging credit note:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST credit-note exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
