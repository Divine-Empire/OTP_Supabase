import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get("stage")
    const status = searchParams.get("status") // "pending" | "history" | "all"
    const orderNo = searchParams.get("orderNo")
    const search = searchParams.get("search")

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from("otp_v_order_full")
      .select("*")
      .order("timestamp", { ascending: false })

    if (orderNo) {
      query = query.eq("order_no", orderNo)
    }

    if (search) {
      query = query.or(
        `order_no.ilike.%${search}%,company_name.ilike.%${search}%,quotation_no.ilike.%${search}%,contact_person_name.ilike.%${search}%`
      )
    }

    // Filter by stage status if specified
    if (stage === "order_acceptable") {
      if (status === "pending") {
        query = query.not("oa_planned", "is", null).is("oa_actual", null)
      } else if (status === "history") {
        query = query.not("oa_planned", "is", null).not("oa_actual", "is", null)
      }
    } else if (stage === "check_inventory") {
      if (status === "pending") {
        query = query.not("ci_planned", "is", null).is("ci_actual", null)
      } else if (status === "history") {
        query = query.not("ci_planned", "is", null).not("ci_actual", "is", null)
      }
    } else if (stage === "material_received") {
      if (status === "pending") {
        query = query.not("mr_planned", "is", null).is("mr_actual", null)
      } else if (status === "history") {
        query = query.not("mr_planned", "is", null).not("mr_actual", "is", null)
      }
    } else if (stage === "senior_approval") {
      if (status === "pending") {
        query = query.not("sa_planned", "is", null).is("sa_actual", null)
      } else if (status === "history") {
        query = query.not("sa_planned", "is", null).not("sa_actual", "is", null)
      }
    } else if (stage === "disp_form") {
      if (status === "pending") {
        query = query.not("sa_actual", "is", null).gt("pending_dispatch_qty", 0)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching orders:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET orders exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, ...orderData } = body

    const supabase = getSupabaseAdmin()

    const cleanOrderData = {
      order_no: orderData.order_no || orderData.orderNo || undefined,
      quotation_no: orderData.quotation_no || orderData.quotationNo || null,
      company_name: orderData.company_name || orderData.companyName || "",
      contact_person_name: orderData.contact_person_name || orderData.contactPersonName || null,
      contact_number: orderData.contact_number || orderData.contactNumber || null,
      billing_address: orderData.billing_address || orderData.billingAddress || null,
      shipping_address: orderData.shipping_address || orderData.shippingAddress || null,
      payment_mode: orderData.payment_mode || orderData.paymentMode || null,
      payment_terms_days: Number(orderData.payment_terms_days ?? orderData.paymentTerms ?? 0),
      reference_name: orderData.reference_name || orderData.referenceName || null,
      email: orderData.email || null,
      transport_mode: orderData.transport_mode || orderData.transportMode || null,
      destination: orderData.destination || null,
      item_qty_summary: orderData.item_qty_summary || orderData.itemQtySummary || null,
      po_number: orderData.po_number || orderData.poNumber || null,
      quotation_copy_url: orderData.quotation_copy_url || orderData.quotationCopy || null,
      acceptance_copy_url: orderData.acceptance_copy_url || orderData.acceptanceCopy || null,
      offer_show: orderData.offer_show || orderData.offerShow || null,
      conveyed_for_registration: orderData.conveyed_for_registration || orderData.conveyedForRegistration || null,
      total_order_qty: Number(orderData.total_order_qty ?? orderData.totalOrderQty ?? items?.reduce((s: number, it: any) => s + Number(it.quantity || it.qty || 0), 0) ?? 0),
      amount: Number(orderData.amount ?? 0),
      gst_no: orderData.gst_no || orderData.gstNo || null,
      cre_name: orderData.cre_name || orderData.creName || null,
      sc_name: orderData.sc_name || orderData.scName || null,
    }

    // Insert order master
    const { data: newOrder, error: orderErr } = await supabase
      .from("otp_orders")
      .insert([cleanOrderData])
      .select()
      .single()

    if (orderErr) {
      console.error("Error creating order:", orderErr)
      return NextResponse.json({ success: false, error: orderErr.message }, { status: 500 })
    }

    // Insert line items if present
    if (items && Array.isArray(items) && items.length > 0) {
      const orderItems = items.map((it: any, idx: number) => ({
        order_id: newOrder.id,
        item_no: it.item_no || idx + 1,
        item_name: it.item_name || it.name,
        quantity: Number(it.quantity || it.qty || 0),
      }))

      const { error: itemsErr } = await supabase.from("otp_order_items").insert(orderItems)
      if (itemsErr) {
        console.error("Error inserting order items:", itemsErr)
      }
    }

    return NextResponse.json({ success: true, data: newOrder })
  } catch (err: any) {
    console.error("POST orders exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { orderId, orderNo, stage, stageData, orderUpdates } = body

    const supabase = getSupabaseAdmin()

    let targetOrderId = orderId
    if (!targetOrderId && orderNo) {
      const { data: ord } = await supabase
        .from("otp_orders")
        .select("id")
        .eq("order_no", orderNo)
        .single()
      targetOrderId = ord?.id
    }

    if (!targetOrderId) {
      return NextResponse.json(
        { success: false, error: "Missing orderId or orderNo" },
        { status: 400 }
      )
    }

    // Update master order fields if provided
    if (orderUpdates && Object.keys(orderUpdates).length > 0) {
      const { error: ordErr } = await supabase
        .from("otp_orders")
        .update(orderUpdates)
        .eq("id", targetOrderId)

      if (ordErr) {
        console.error("Error updating order master:", ordErr)
        return NextResponse.json({ success: false, error: ordErr.message }, { status: 500 })
      }
    }

    // Update stage-specific tables
    if (stage && stageData) {
      let stageTable = ""
      let cleanStageData: Record<string, any> = {
        order_id: targetOrderId,
        actual_date: stageData.actual_date || new Date().toISOString(),
      }

      if (stage === "order_acceptable") {
        stageTable = "otp_order_acceptable"
        cleanStageData = {
          ...cleanStageData,
          is_order_acceptable: stageData.is_order_acceptable || stageData.isOrderAcceptable || null,
          acceptance_checklist: stageData.acceptance_checklist || stageData.orderAcceptanceChecklist || stageData.checklist || null,
          remark: stageData.remark || stageData.remarks || null,
          created_by: stageData.created_by || stageData.createdBy || "Admin",
        }
      } else if (stage === "check_inventory") {
        stageTable = "otp_check_inventory"
        cleanStageData = {
          ...cleanStageData,
          availability_status: stageData.availability_status || stageData.availabilityStatus || null,
          remarks: stageData.remarks || stageData.remark || null,
          customer_wants_material_as: stageData.customer_wants_material_as || stageData.customerDecision || null,
          warehouse_location: stageData.warehouse_location || stageData.warehouseLocation || null,
          create_indent_if_not_avail: Boolean(stageData.create_indent_if_not_avail || stageData.createIndent),
          line_item_number: stageData.line_item_number || stageData.lineItemNumber || null,
          total_qty: stageData.total_qty ? Number(stageData.total_qty) : (stageData.totalQty ? Number(stageData.totalQty) : null),
          material_received_lead_time: stageData.material_received_lead_time ? Number(stageData.material_received_lead_time) : (stageData.leadTime ? Number(stageData.leadTime) : null),
          created_by: stageData.created_by || stageData.createdBy || "Admin",
        }
      } else if (stage === "material_received") {
        stageTable = "otp_material_received"
        cleanStageData = {
          ...cleanStageData,
          received_date: stageData.received_date || stageData.receivedDate || null,
          created_by: stageData.created_by || stageData.createdBy || "Admin",
        }
      } else if (stage === "senior_approval") {
        stageTable = "otp_senior_approval"
        cleanStageData = {
          ...cleanStageData,
          approval_name: stageData.approval_name || stageData.approvalName || stageData.approvedBy || null,
          revenue: stageData.revenue ? Number(stageData.revenue) : null,
          created_by: stageData.created_by || stageData.createdBy || "Admin",
        }
      }

      if (stageTable) {
        const { error: stageErr } = await supabase
          .from(stageTable)
          .upsert(cleanStageData, { onConflict: "order_id" })

        if (stageErr) {
          console.error(`Error updating ${stageTable}:`, stageErr)
          return NextResponse.json({ success: false, error: stageErr.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true, message: "Order updated successfully" })
  } catch (err: any) {
    console.error("PATCH orders exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
