import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.OTP_WEBHOOK_SECRET
    if (webhookSecret) {
      const headerSecret = request.headers.get("x-webhook-secret")
      if (headerSecret !== webhookSecret) {
        return NextResponse.json({ success: false, error: "Unauthorized: Invalid webhook secret" }, { status: 401 })
      }
    }

    const body = await request.json()
    // Supabase database webhook payloads wrap data in 'record'
    const payload = body.record || body.new || body

    // Extract fields matching Lead-to-Order schema
    const ltoOrderId = payload.id || payload.order_id || payload.lto_order_id || payload.enquiry_id || null
    const quotationNo = payload.quotation_no || payload.quotationNo || payload.quote_no || ""
    const companyName = payload.company_name || payload.companyName || payload.party_name || ""
    const contactPerson = payload.contact_person_name || payload.contact_person || payload.contactPersonName || ""
    const contactNumber = payload.contact_number || payload.contactNumber || payload.phone || ""
    const billingAddress = payload.billing_address || payload.billingAddress || ""
    const shippingAddress = payload.shipping_address || payload.shippingAddress || ""
    const paymentMode = payload.payment_mode || payload.paymentMode || ""
    const paymentTerms = Number(payload.payment_terms_days || payload.payment_terms || payload.paymentTerms || 0)
    const referenceName = payload.reference_name || payload.referenceName || ""
    const email = payload.email || ""
    const transportMode = payload.transport_mode || payload.transportMode || ""
    const destination = payload.destination || ""
    const poNumber = payload.po_number || payload.poNumber || ""
    const quotationCopy = payload.quotation_copy_url || payload.quotation_copy || payload.quotationCopy || ""
    const acceptanceCopy = payload.acceptance_copy_url || payload.acceptance_copy || payload.acceptanceCopy || ""
    const totalOrderQty = Number(payload.total_order_qty || payload.total_qty || payload.totalOrderQty || payload.qty || 0)
    const amount = Number(payload.amount || payload.total_amount || payload.totalAmount || 0)

    // Parse line items if array or wide fields (Item Name 1 / Quantity 1, etc.)
    let items: any[] = []
    if (Array.isArray(payload.items)) {
      items = payload.items
    } else if (Array.isArray(payload.item_details)) {
      items = payload.item_details
    } else {
      // Check wide item 1..10 format
      for (let i = 1; i <= 10; i++) {
        const itemName = payload[`item_name_${i}`] || payload[`itemName${i}`] || payload[`item_${i}`] || payload[`Item Name ${i}`]
        const itemQty = payload[`quantity_${i}`] || payload[`quantity${i}`] || payload[`qty_${i}`] || payload[`Quantity ${i}`]
        if (itemName && String(itemName).trim() !== "") {
          items.push({
            item_no: i,
            item_name: String(itemName).trim(),
            quantity: Number(itemQty || 0),
          })
        }
      }
    }

    const supabase = getSupabaseAdmin()

    // Call stored procedure
    const { data, error } = await supabase.rpc("otp_ingest_order", {
      p_lto_order_id: ltoOrderId ? String(ltoOrderId) : null,
      p_quotation_no: quotationNo,
      p_company_name: companyName,
      p_contact_person: contactPerson,
      p_contact_number: contactNumber,
      p_billing_address: billingAddress,
      p_shipping_addr: shippingAddress,
      p_payment_mode: paymentMode,
      p_payment_terms: paymentTerms,
      p_reference_name: referenceName,
      p_email: email,
      p_transport_mode: transportMode,
      p_destination: destination,
      p_po_number: poNumber,
      p_quotation_copy: quotationCopy,
      p_acceptance_copy: acceptanceCopy,
      p_total_order_qty: totalOrderQty,
      p_amount: amount,
      p_items: JSON.stringify(items),
    })

    if (error) {
      console.error("RPC otp_ingest_order error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Order successfully ingested into Supabase OTP system",
      result: data,
    })
  } catch (err: any) {
    console.error("Order ingest exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
