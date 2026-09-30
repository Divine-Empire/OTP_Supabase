import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { getStageTatMinutes, addTatMinutes } from "@/lib/tat"

// Stage — Payment Against PI, the confirmation step between Pro-Forma
// Invoice's initial submit and its History (see
// Database/51_proforma_invoice_payment_against_pi.sql).
//
// Sets otp_proforma_invoice.payment_against_pi ('Yes'/'No', with a remark
// required only when 'No') — moving the row from the "Payment Against PI"
// tab to History. This is also what unlocks Packing List (Check
// Inventory)'s planned date for the order, same TAT pattern as every
// other stage — Check Inventory now only becomes reachable once payment
// against the PI is confirmed, not merely once the PI itself is raised.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { proformaInvoiceId, paymentReceived, remark } = body as {
      proformaInvoiceId: string
      paymentReceived?: "Yes" | "No"
      remark?: string
    }

    if (!proformaInvoiceId || (paymentReceived !== "Yes" && paymentReceived !== "No")) {
      return NextResponse.json(
        { success: false, error: "Missing proformaInvoiceId or paymentReceived" },
        { status: 400 }
      )
    }
    if (paymentReceived === "No" && !remark?.trim()) {
      return NextResponse.json({ success: false, error: "Remark is required when payment is not received" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: piRow, error: piError } = await supabase
      .from("otp_proforma_invoice")
      .select("order_id")
      .eq("id", proformaInvoiceId)
      .maybeSingle()
    if (piError) throw piError
    if (!piRow) {
      return NextResponse.json({ success: false, error: "Pro-Forma Invoice record not found" }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from("otp_proforma_invoice")
      .update({
        payment_against_pi: paymentReceived,
        payment_against_pi_remark: paymentReceived === "No" ? remark!.trim() : null,
      })
      .eq("id", proformaInvoiceId)
    if (updateError) throw updateError

    const checkInventoryPlanned = addTatMinutes(new Date(), await getStageTatMinutes("check_inventory"))
    const { error: acceptableError } = await supabase
      .from("otp_orders_acceptable")
      .update({ check_inventory_planned: checkInventoryPlanned })
      .eq("order_id", piRow.order_id)
    if (acceptableError) throw acceptableError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/proforma-invoice/payment-against-pi exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
