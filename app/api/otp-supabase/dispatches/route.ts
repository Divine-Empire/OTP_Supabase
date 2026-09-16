import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get("stage")
    const status = searchParams.get("status") // "pending" | "history" | "all"
    const orderNo = searchParams.get("orderNo")
    const dispatchNo = searchParams.get("dispatchNo")
    const search = searchParams.get("search")

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from("otp_v_dispatch_full")
      .select("*")
      .order("timestamp", { ascending: false })

    if (orderNo) {
      query = query.eq("order_no", orderNo)
    }

    if (dispatchNo) {
      query = query.eq("dispatch_no", dispatchNo)
    }

    if (search) {
      query = query.or(
        `order_no.ilike.%${search}%,dispatch_no.ilike.%${search}%,company_name.ilike.%${search}%,quotation_no.ilike.%${search}%,invoice_number.ilike.%${search}%`
      )
    }

    // Filter by stage status
    if (stage === "make_invoice") {
      if (status === "pending") {
        query = query.not("mi_planned", "is", null).is("mi_actual", null)
      } else if (status === "history") {
        query = query.not("mi_planned", "is", null).not("mi_actual", "is", null)
      }
    } else if (stage === "warehouse") {
      if (status === "pending") {
        query = query.not("wh_planned", "is", null).is("wh_actual", null)
      } else if (status === "history") {
        query = query.not("wh_planned", "is", null).not("wh_actual", "is", null)
      }
    } else if (stage === "material_receiving") {
      if (status === "pending") {
        query = query.not("mrcv_planned", "is", null).is("mrcv_actual", null)
      } else if (status === "history") {
        query = query.not("mrcv_planned", "is", null).not("mrcv_actual", "is", null)
      }
    } else if (stage === "calibration") {
      if (status === "pending") {
        query = query.eq("calibration_required", "YES").not("cal_planned", "is", null).is("cal_actual", null)
      } else if (status === "history") {
        query = query.not("cal_actual", "is", null)
      }
    } else if (stage === "update_delivery") {
      if (status === "pending") {
        query = query.not("ud_planned", "is", null).is("ud_actual", null)
      } else if (status === "history") {
        query = query.not("ud_planned", "is", null).not("ud_actual", "is", null)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching dispatches:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET dispatches exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, orderId, order_id, orderNo, order_no, ...dispatchData } = body

    const supabase = getSupabaseAdmin()

    let targetOrderId = orderId || order_id
    let targetOrderNo = orderNo || order_no

    if (!targetOrderId && targetOrderNo) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetOrderNo)
      if (isUUID) {
        const { data: ord } = await supabase
          .from("otp_orders")
          .select("id, order_no")
          .eq("id", targetOrderNo)
          .single()
        targetOrderId = ord?.id
        targetOrderNo = ord?.order_no || targetOrderNo
      } else {
        const { data: ord } = await supabase
          .from("otp_orders")
          .select("id, order_no")
          .eq("order_no", targetOrderNo)
          .single()
        targetOrderId = ord?.id
        targetOrderNo = ord?.order_no || targetOrderNo
      }
    } else if (targetOrderId && !targetOrderNo) {
      const { data: ord } = await supabase
        .from("otp_orders")
        .select("id, order_no")
        .eq("id", targetOrderId)
        .single()
      targetOrderNo = ord?.order_no
    }

    if (!targetOrderId) {
      return NextResponse.json(
        { success: false, error: "Missing orderId or orderNo" },
        { status: 400 }
      )
    }

    const totalQty = dispatchData.total_dispatch_qty ?? items?.reduce((sum: number, it: any) => sum + Number(it.quantity || it.qty || 0), 0) ?? 0

    const cleanDispatchData = {
      order_id: targetOrderId,
      order_no: targetOrderNo,
      total_dispatch_qty: Number(totalQty),
      total_bill_amount: Number(dispatchData.total_bill_amount || dispatchData.amount || 0),
      calibration_required: dispatchData.calibration_required === true || dispatchData.calibration_required === "YES" || dispatchData.calibration_required === "Yes" ? "YES" : "NO",
      certificate_category: dispatchData.certificate_category || dispatchData.calibrationType || null,
      installation_required: dispatchData.installation_required === true || dispatchData.installation_required === "YES" || dispatchData.installation_required === "Yes" ? "YES" : "NO",
      transporter_id: dispatchData.transporter_id || null,
      vehicle_no: dispatchData.vehicle_no || dispatchData.vehicle_number || null,
      srn_number: dispatchData.srn_number || null,
      srn_number_attachment_url: dispatchData.srn_number_attachment_url || dispatchData.srn_number_attachment || null,
      attachment_url: dispatchData.attachment_url || dispatchData.attachment || null,
      gst_no: dispatchData.gst_no || dispatchData.gst_number || null,
      dispatch_status: "Pending",
      dispatch_location: dispatchData.dispatch_location || null,
      direct_dispatch: Boolean(dispatchData.direct_dispatch),
      calibration_responsible: dispatchData.calibration_responsible || null,
      remarks: dispatchData.remarks || null,
      created_by: dispatchData.created_by || "Admin",
    }

    // Insert dispatch record
    const { data: newDispatch, error: dispErr } = await supabase
      .from("otp_dispatches")
      .insert([cleanDispatchData])
      .select()
      .single()

    if (dispErr) {
      console.error("Error creating dispatch:", dispErr)
      return NextResponse.json({ success: false, error: dispErr.message }, { status: 500 })
    }

    // Insert dispatch items if present
    if (items && Array.isArray(items) && items.length > 0) {
      const dispatchItems = items.map((it: any, idx: number) => ({
        dispatch_id: newDispatch.id,
        item_no: it.item_no || idx + 1,
        item_name: it.item_name || it.name,
        quantity: Number(it.quantity || it.qty || 0),
      }))

      const { error: itemsErr } = await supabase.from("otp_dispatch_items").insert(dispatchItems)
      if (itemsErr) {
        console.error("Error inserting dispatch items:", itemsErr)
      }
    }

    return NextResponse.json({ success: true, data: newDispatch })
  } catch (err: any) {
    console.error("POST dispatches exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { dispatchId, dispatchNo, stage, stageData, dispatchUpdates } = body

    const supabase = getSupabaseAdmin()

    let targetDispatchId = dispatchId
    if (!targetDispatchId && dispatchNo) {
      const { data: disp } = await supabase
        .from("otp_dispatches")
        .select("id")
        .eq("dispatch_no", dispatchNo)
        .single()
      targetDispatchId = disp?.id
    }

    if (!targetDispatchId) {
      return NextResponse.json(
        { success: false, error: "Missing dispatchId or dispatchNo" },
        { status: 400 }
      )
    }

    // Update dispatch master fields if provided
    if (dispatchUpdates && Object.keys(dispatchUpdates).length > 0) {
      const { error: dispErr } = await supabase
        .from("otp_dispatches")
        .update(dispatchUpdates)
        .eq("id", targetDispatchId)

      if (dispErr) {
        console.error("Error updating dispatch:", dispErr)
        return NextResponse.json({ success: false, error: dispErr.message }, { status: 500 })
      }
    }

    // Update stage-specific tables
    if (stage && stageData) {
      let stageTable = ""
      let cleanStageData: Record<string, any> = {
        dispatch_id: targetDispatchId,
        actual_date: stageData.actual_date || new Date().toISOString(),
      }

      if (stage === "make_invoice") {
        stageTable = "otp_make_invoice"
        cleanStageData = {
          ...cleanStageData,
          invoice_number: stageData.invoice_number || stageData.invoiceNumber || null,
          invoice_upload_url: stageData.invoice_upload_url || stageData.invoice_upload || stageData.invoiceUrl || null,
          eway_bill_upload_url: stageData.eway_bill_upload_url || stageData.eway_bill_upload || stageData.ewayBillUrl || null,
          bill_date: stageData.bill_date || stageData.billDate || null,
          total_qty: Number(stageData.total_qty ?? stageData.invoice_qty ?? stageData.qty ?? 0) || null,
          total_bill_amount: Number(stageData.total_bill_amount ?? stageData.totalBillAmount ?? stageData.amount ?? 0) || null,
          created_by: stageData.created_by || "Admin",
        }
      } else if (stage === "warehouse") {
        stageTable = "otp_warehouse"
        cleanStageData = {
          ...cleanStageData,
          before_photo_url: stageData.before_photo_url || stageData.before_photo_upload || stageData.beforePhotoUrl || null,
          after_photo_url: stageData.after_photo_url || stageData.after_photo_upload || stageData.afterPhotoUrl || null,
          bilty_upload_url: stageData.bilty_upload_url || stageData.bilty_upload || stageData.biltyUrl || null,
          transporter_name: stageData.transporter_name || stageData.transporterName || null,
          transporter_contact: stageData.transporter_contact || stageData.transporterContact || null,
          bilty_docket_no: stageData.bilty_docket_no || stageData.bilty_number || stageData.biltyNumber || null,
          freight_charge: Number(stageData.freight_charge ?? stageData.total_charges ?? stageData.totalCharges ?? 0),
          warehouse_remarks: stageData.warehouse_remarks || stageData.warehouseRemarks || null,
          created_by: stageData.created_by || "Admin",
        }
      } else if (stage === "material_receiving") {
        stageTable = "otp_material_receiving"
        cleanStageData = {
          ...cleanStageData,
          material_receiving_status: stageData.material_receiving_status || stageData.status || null,
          site_person_name: stageData.site_person_name || stageData.sitePersonName || null,
          site_person_contact: stageData.site_person_contact || stageData.sitePersonContact || null,
          created_by: stageData.created_by || "Admin",
        }
      } else if (stage === "calibration") {
        stageTable = "otp_calibration"
        const isTS = stageData.calibration_type === "TOTAL STATION"
        cleanStageData = {
          ...cleanStageData,
          lab_cert_url: !isTS ? (stageData.certificate_upload || stageData.lab_cert_url || stageData.labCalibrationCertificate || null) : (stageData.lab_cert_url || null),
          st_cert_url: isTS ? (stageData.certificate_upload || stageData.st_cert_url || stageData.stCalibrationCertificate || null) : (stageData.st_cert_url || null),
          lab_cert_date: !isTS ? (stageData.calibration_date || stageData.lab_cert_date || stageData.labCalibrationDate || null) : (stageData.lab_cert_date || null),
          st_cert_date: isTS ? (stageData.calibration_date || stageData.st_cert_date || stageData.stCalibrationDate || null) : (stageData.st_cert_date || null),
          lab_cert_period: !isTS ? (stageData.calibration_period || stageData.lab_cert_period || stageData.labCalibrationPeriod || null) : (stageData.lab_cert_period || null),
          st_cert_period: isTS ? (stageData.calibration_period || stageData.st_cert_period || stageData.stCalibrationPeriod || null) : (stageData.st_cert_period || null),
          lab_due_date: !isTS ? (stageData.due_date || stageData.lab_due_date || stageData.labDueDate || null) : (stageData.lab_due_date || null),
          st_due_date: isTS ? (stageData.due_date || stageData.st_due_date || stageData.stDueDate || null) : (stageData.st_due_date || null),
          created_by: stageData.created_by || "Admin",
        }
      } else if (stage === "update_delivery") {
        stageTable = "otp_update_delivery"
        let deliveredQty = Number(stageData.total_delivered_qty ?? stageData.deliveredQty ?? 0)
        if (!deliveredQty && targetDispatchId) {
          const { data: dRec } = await supabase.from("otp_dispatches").select("total_dispatch_qty").eq("id", targetDispatchId).single()
          deliveredQty = Number(dRec?.total_dispatch_qty || 0)
        }
        cleanStageData = {
          ...cleanStageData,
          upload_dn_url: stageData.delivery_note || stageData.upload_dn_url || stageData.uploadDN || null,
          total_delivered_qty: deliveredQty,
          dispatch_status: "Delivered",
          created_by: stageData.created_by || "Admin",
        }
      }

      if (stageTable) {
        const { error: stageErr } = await supabase
          .from(stageTable)
          .upsert(cleanStageData, { onConflict: "dispatch_id" })

        if (stageErr) {
          console.error(`Error updating ${stageTable}:`, stageErr)
          return NextResponse.json({ success: false, error: stageErr.message }, { status: 500 })
        }

        // Note: parent order's total_delivered_qty / delivery_complete_date are kept in
        // sync automatically by the otp_trg_after_ud_update trigger (fires on the
        // otp_update_delivery upsert above), and delivery_status/dispatch_status are
        // GENERATED columns on otp_orders that recompute themselves — no app-side write needed.
      }
    }

    return NextResponse.json({ success: true, message: "Dispatch updated successfully" })
  } catch (err: any) {
    console.error("PATCH dispatches exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
