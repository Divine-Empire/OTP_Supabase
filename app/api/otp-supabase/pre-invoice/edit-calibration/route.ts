import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { requestAccess } from "@/lib/request-access"
import { addTatMinutes, getStageTatMinutes } from "@/lib/tat"

// Pre-Invoice History: change a processed wave's "Calib. Certificate Req." and its dependent
// fields (admin only). The rules and the writes live in otp_edit_calibration_request
// (Database/85) so they run in one transaction; this route validates the input, resolves the
// hardcopy address and computes the planned date.
export async function POST(request: Request) {
  try {
    const access = await requestAccess(request)
    if (!access.userId) return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 })
    if (!access.isAdmin) return NextResponse.json({ success: false, error: "Only an admin can edit this" }, { status: 403 })

    const body = (await request.json()) as {
      queueId?: string
      calibrationRequired?: "YES" | "NO" | ""
      calibrationType?: string
      certHardcopyRequired?: "YES" | "NO" | ""
      hardcopyDeliveryType?: "Billing Address" | "Shipping Address" | "Other" | ""
      hardcopyDeliveryAddress?: string
    }
    const { queueId } = body
    if (!queueId || (body.calibrationRequired !== "YES" && body.calibrationRequired !== "NO")) {
      return NextResponse.json({ success: false, error: "Missing queueId or Calib. Certificate Req." }, { status: 400 })
    }
    const required = body.calibrationRequired === "YES"
    const hardcopy = required ? (body.certHardcopyRequired === "YES" ? true : body.certHardcopyRequired === "NO" ? false : null) : null
    if (required && (!body.calibrationType?.trim() || hardcopy === null)) {
      return NextResponse.json({ success: false, error: "Calibration Type and Cert. Hardcopy Req. are required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: queue, error: queueError } = await supabase
      .from("otp_pre_invoice_queue")
      .select("order_id, status, hardcopy_delivery_type, hardcopy_delivery_address")
      .eq("id", queueId)
      .maybeSingle()
    if (queueError) throw queueError
    if (!queue || queue.status !== "invoiced") {
      return NextResponse.json({ success: false, error: "Pre-Invoice wave not found or not processed yet" }, { status: 404 })
    }

    // Billing / Shipping are snapshotted from the order, like at Pre-Invoice submit. An unchanged
    // choice keeps the address saved back then, so an edit elsewhere does not move it.
    let address = ""
    const type = body.hardcopyDeliveryType || ""
    if (hardcopy) {
      if (!type) return NextResponse.json({ success: false, error: "Hardcopy Delivery Add. is required" }, { status: 400 })
      if (type === "Other") {
        address = (body.hardcopyDeliveryAddress || "").trim()
      } else if (queue.hardcopy_delivery_type === type && queue.hardcopy_delivery_address) {
        address = queue.hardcopy_delivery_address
      } else {
        const { data: order, error: orderError } = await supabase.from("otp_orders").select("billing_address, shipping_address").eq("id", queue.order_id).maybeSingle()
        if (orderError) throw orderError
        address = ((type === "Billing Address" ? order?.billing_address : order?.shipping_address) || "").trim()
      }
      if (!address) return NextResponse.json({ success: false, error: "No address to deliver the hardcopy to" }, { status: 400 })
    }

    const planned = addTatMinutes(new Date(), await getStageTatMinutes("calibration"))
    const { data, error } = await supabase.rpc("otp_edit_calibration_request", {
      p_queue_id: queueId,
      p_required: required,
      p_type: required ? body.calibrationType!.trim() : null,
      p_hardcopy: hardcopy,
      p_hardcopy_type: hardcopy ? type : null,
      p_hardcopy_addr: hardcopy ? address : null,
      p_planned: planned,
      p_actor: access.actorName,
    })
    if (error) {
      // The function's own refusals (RAISE EXCEPTION) are user-facing messages.
      const userFacing = /already generated|not found|required/i.test(error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: userFacing ? 409 : 500 })
    }
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/pre-invoice/edit-calibration exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
