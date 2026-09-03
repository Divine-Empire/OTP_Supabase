"use client"

import { useState, useEffect, useCallback } from "react"

export function useDashboardData() {
  const [dashboardData, setDashboardData] = useState({
    // Order metrics
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0,

    // Dispatch metrics
    totalDispatches: 0,
    pendingDispatches: 0,
    completedDispatches: 0,
    dispatchRevenue: 0,

    // Stage metrics
    completedRevenue: 0,
    pendingRevenue: 0,
    inventoryPending: 0,
    materialReceived: 0,
    calibrationRequired: 0,
    approvalPending: 0,
    invoiceGenerated: 0,
    dispatchComplete: 0,

    // Analytics & lists
    monthlyData: [] as any[],
    topCustomers: [] as any[],
    recentOrders: [] as any[],
    paymentModeData: [] as any[],
    transportModeData: [] as any[],
    allDispatchOrders: [] as any[],
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const extractMonthFromDate = (dateValue: any) => {
    if (!dateValue) return null
    try {
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return monthNames[date.getMonth()]
      }
    } catch (e) {
      console.error("Error parsing date:", e)
    }
    return null
  }

  const convertToChartData = (dataMap: Record<string, number>) => {
    return Object.entries(dataMap).map(([key, value]) => ({
      name: key,
      value: value,
    }))
  }

  const convertMonthlyData = (monthlyOrdersMap: Record<string, number>) => {
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return monthOrder.map((month) => ({
      month,
      orders: monthlyOrdersMap[month] || 0,
    }))
  }

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [ordersRes, dispatchesRes] = await Promise.all([
        fetch("/api/otp-supabase/orders"),
        fetch("/api/otp-supabase/dispatches"),
      ])

      const ordersJson = await ordersRes.json()
      const dispatchesJson = await dispatchesRes.json()

      const ordersList: any[] = ordersJson.data || []
      const dispatchesList: any[] = dispatchesJson.data || []

      let totalOrderCount = ordersList.length
      let pendingOrderCount = 0
      let completedOrderCount = 0
      let cancelOrderCount = 0
      let deliveredCount = 0
      let totalOrderRevenue = 0
      let pendingRevenue = 0
      let completedRevenue = 0

      let inventoryPendingCount = 0
      let materialReceivedPendingCount = 0
      let approvalPendingCount = 0

      const monthlyOrdersMap: Record<string, number> = {}
      const paymentModeMap: Record<string, number> = {}
      const transportModeMap: Record<string, number> = {}
      const customerData: Record<string, { name: string; orders: number; revenue: number }> = {}

      // Map orders
      const formattedOrders = ordersList.map((o) => {
        const amount = Number(o.amount || 0)
        totalOrderRevenue += amount

        const isComplete = (Number(o.pending_delivery_qty || 0) <= 0 && Number(o.total_delivered_qty || 0) > 0)
        const isCancelled = (o.is_order_accept_cancel || Number(o.total_cancelled_qty || 0) >= Number(o.total_order_qty || 0))

        if (isCancelled) {
          cancelOrderCount++
        } else if (isComplete) {
          completedOrderCount++
          completedRevenue += amount
          deliveredCount++
        } else {
          pendingOrderCount++
          pendingRevenue += amount
        }

        // Stage queues
        if (o.ci_planned && !o.ci_actual) inventoryPendingCount++
        if (o.mr_planned && !o.mr_actual) materialReceivedPendingCount++
        if (o.sa_planned && !o.sa_actual) approvalPendingCount++

        const pMode = o.payment_mode || "Unknown"
        paymentModeMap[pMode] = (paymentModeMap[pMode] || 0) + 1

        const tMode = o.transport_mode || "Not Specified"
        transportModeMap[tMode] = (transportModeMap[tMode] || 0) + 1

        const month = extractMonthFromDate(o.timestamp)
        if (month) {
          monthlyOrdersMap[month] = (monthlyOrdersMap[month] || 0) + 1
        }

        const compName = o.company_name
        if (compName) {
          if (!customerData[compName]) {
            customerData[compName] = { name: compName, orders: 0, revenue: 0 }
          }
          customerData[compName].orders += 1
          customerData[compName].revenue += amount
        }

        // Map items
        const items = o.items || []
        const itemFields: any = {}
        for (let i = 1; i <= 10; i++) {
          const item = items.find((it: any) => it.item_no === i)
          itemFields[`itemName${i}`] = item?.item_name || ""
          itemFields[`quantity${i}`] = item?.quantity || ""
        }

        return {
          orderNo: o.order_no,
          quotationNo: o.quotation_no,
          company: o.company_name,
          contactPersonName: o.contact_person_name,
          contactNumber: o.contact_number,
          billingAddress: o.billing_address,
          shippingAddress: o.shipping_address,
          paymentMode: o.payment_mode,
          paymentTerms: o.payment_terms_days,
          referenceName: o.reference_name,
          email: o.email,
          transportMode: o.transport_mode,
          destination: o.destination,
          poNumber: o.po_number,
          quotationCopy: o.quotation_copy_url,
          acceptanceCopy: o.acceptance_copy_url,
          offerShow: o.offer_show,
          conveyedForRegistration: o.conveyed_for_registration,
          totalOrderQty: o.total_order_qty,
          amount: o.amount,
          totalDispatchQuantity: o.total_dispatched_qty,
          quantityDelivered: o.total_delivered_qty,
          orderCancel: o.total_cancelled_qty,
          pendingDeliveryQty: o.pending_delivery_qty,
          pendingDispatchQty: o.pending_dispatch_qty,
          deliveryStatus: o.delivery_status,
          status: o.delivery_status,
          dispatchStatus: o.dispatch_status,
          dispatchCompleteDate: o.dispatch_complete_date,
          deliveryCompleteDate: o.delivery_complete_date,
          isOrderAcceptable: o.is_order_acceptable,
          orderAcceptanceChecklist: o.acceptance_checklist,
          remark: o.oa_remark,
          availabilityStatus: o.availability_status,
          remarks: o.ci_remarks,
          customerWantsMaterial: o.customer_wants_material_as,
          createdBy: o.ci_created_by || o.oa_created_by,
          warehouseLocation: o.ci_warehouse_location,
          createIndent: o.create_indent_if_not_avail ? "Yes" : "No",
          lineItemNumber: o.ci_line_item_number,
          totalQty: o.ci_total_qty,
          materialReceivedLeadTime: o.material_received_lead_time,
          receivedDate: o.mr_received_date,
          approvalName: o.approval_name,
          revenue: o.revenue,
          date: o.timestamp ? new Date(o.timestamp).toLocaleDateString() : "",
          ...itemFields,
        }
      })

      // Map dispatches
      let invoiceGeneratedCount = 0
      let dispatchCompleteCount = 0
      let calibrationRequiredCount = 0
      let totalDispatchRevenue = 0
      let pendingDispatchesCount = 0
      let completedDispatchesCount = 0

      const formattedDispatches = dispatchesList.map((d) => {
        const billAmt = Number(d.total_bill_amount || 0)
        totalDispatchRevenue += billAmt

        if (d.dispatch_status === "Complete" || d.ud_actual) {
          completedDispatchesCount++
          dispatchCompleteCount++
        } else {
          pendingDispatchesCount++
        }

        if (d.invoice_number || d.mi_actual) invoiceGeneratedCount++
        if (d.calibration_required === "YES" && !d.cal_actual) calibrationRequiredCount++

        const items = d.dispatch_items || []
        const itemFields: any = {}
        for (let i = 1; i <= 15; i++) {
          const item = items.find((it: any) => it.item_no === i)
          itemFields[`itemName${i}`] = item?.item_name || ""
          itemFields[`quantity${i}`] = item?.quantity || ""
        }

        return {
          dispatchNo: d.dispatch_no,
          orderNo: d.order_no,
          quotationNo: d.quotation_no,
          company: d.company_name,
          contactPersonName: d.contact_person_name,
          contactNumber: d.contact_number,
          billingAddress: d.billing_address,
          shippingAddress: d.shipping_address,
          paymentMode: d.payment_mode,
          paymentTerms: d.payment_terms_days,
          transportMode: d.transport_mode,
          destination: d.destination,
          qty: d.total_dispatch_qty,
          amount: d.total_bill_amount,
          approvedName: d.approved_name,
          calibrationCertificateRequired: d.calibration_required,
          certificateCategory: d.certificate_category,
          installationRequired: d.installation_required,
          srnNumber: d.srn_number,
          srnNumberAttachment: d.srn_number_attachment_url,
          attachment: d.attachment_url,
          totalQty: d.total_dispatch_qty,
          remarks: d.remarks,
          invoiceNumber: d.invoice_number,
          invoiceUpload: d.invoice_upload_url,
          ewayBillUpload: d.eway_bill_upload_url,
          totalBillAmount: d.total_bill_amount,
          beforePhotoUpload: d.before_photo_url,
          afterPhotoUpload: d.after_photo_url,
          biltyUpload: d.bilty_upload_url,
          transporterName: d.transporter_name,
          transporterContact: d.transporter_contact,
          transporterBiltyNo: d.bilty_docket_no,
          totalCharges: d.freight_charge,
          warehouseRemarks: d.warehouse_remarks,
          materialReceivingStatus: d.material_receiving_status,
          labCalibrationCertificate: d.lab_cert_url,
          stCalibrationCertificate: d.st_cert_url,
          labCalibrationDate: d.lab_cert_date,
          stCalibrationDate: d.st_cert_date,
          uploadDN: d.upload_dn_url,
          status: d.dispatch_status,
          date: d.timestamp ? new Date(d.timestamp).toLocaleDateString() : "",
          ...itemFields,
        }
      })

      const topCusts = Object.values(customerData)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      setDashboardData({
        totalOrders: totalOrderCount,
        pendingOrders: pendingOrderCount,
        completedOrders: completedOrderCount,
        cancelOrders: cancelOrderCount,
        deliveredOrders: deliveredCount,
        totalRevenue: totalOrderRevenue,
        pendingRevenue,
        completedRevenue,

        totalDispatches: dispatchesList.length,
        pendingDispatches: pendingDispatchesCount,
        completedDispatches: completedDispatchesCount,
        dispatchRevenue: totalDispatchRevenue,

        inventoryPending: inventoryPendingCount,
        materialReceived: materialReceivedPendingCount,
        approvalPending: approvalPendingCount,
        invoiceGenerated: invoiceGeneratedCount,
        calibrationRequired: calibrationRequiredCount,
        dispatchComplete: dispatchCompleteCount,

        monthlyData: convertMonthlyData(monthlyOrdersMap),
        paymentModeData: convertToChartData(paymentModeMap),
        transportModeData: convertToChartData(transportModeMap),
        topCustomers: topCusts,
        recentOrders: formattedOrders,
        allDispatchOrders: formattedDispatches,
      })
    } catch (err: any) {
      console.error("Dashboard fetch error:", err)
      setError(err.message || "Failed to fetch dashboard data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  return {
    dashboardData,
    loading,
    error,
    fetchAllData,
  }
}