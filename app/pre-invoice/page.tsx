"use client"

import { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { RefreshCw, Search, Settings, Eye, Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { mapPreInvoiceRowToUI } from "@/lib/otp-utils"
import { filterByCrmAccess, crmNameOptionsFrom } from "@/lib/crm-access"
import { MobileRecordCard } from "@/components/mobile-record-card"

// Column definitions for Pending tab
const pendingColumns = [
  { key: "actions", label: "Actions", searchable: false },
  { key: "timestamp", label: "Timestamp", searchable: true },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "quotationNo", label: "Quotation No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "crmName", label: "CRM Name", searchable: true },
  { key: "contactPersonName", label: "Contact Person Name", searchable: true },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "sourceStage", label: "Source Stage", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
  { key: "accessories", label: "Accessories", searchable: true },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "paymentMode", label: "Payment Mode", searchable: true },
  { key: "calibrationRequired", label: "Calibration Required", searchable: true },
  { key: "calibrationType", label: "Calibration Type", searchable: true },
  { key: "debitNoteForInvoiceRequired", label: "Debit Note (Inv.) Required", searchable: true },
  { key: "transportId", label: "Transport Id/Name", searchable: true },
  { key: "gstNumber", label: "GST Number", searchable: true },
  { key: "vehicleNumber", label: "Vehicle Number", searchable: true },
  { key: "dispatchLocation", label: "Dispatch Location", searchable: true },
  { key: "directDispatchDetails", label: "Direct Dispatch Details", searchable: true },
  { key: "paymentAttachment", label: "Payment Attachment", searchable: false },
  { key: "srnAttachment", label: "SRN Attachment", searchable: false },
  { key: "remarks", label: "Remarks", searchable: true },
  { key: "createdBy", label: "Created By", searchable: true },
  { key: "invoicedAt", label: "Invoiced At", searchable: true },
]

// One row per physical unit for serialized items (see check-inventory's
// isNumberedSerial) — Qty is always 1 for those. Bulk items keep one row
// with the full qty and an empty serial. `isPrefilled` rows came straight
// from Check Inventory's own scan data, so their Item Name is locked
// (read-only) to keep it matching what was actually scanned — only rows
// added by hand via "Add Item" (isPrefilled: false) get an editable name.
interface PreInvoiceItemRow {
  name: string
  itemCode: string
  qty: number
  serialNo: string
  isPrefilled: boolean
  installation: "Yes" | "No"
}

// otp_dropdown "payment_mode" values are stored lower-case to match
// lto_enquiry_tracker(_for_leads).payment_mode exactly (see
// Database/30_otp_pre_invoice_payment_mode.sql) — this is purely a display
// formatter, the underlying value sent to the API stays lower-case.
const PAYMENT_MODE_LABELS: Record<string, string> = {
  "current date cheque": "Current Date Cheque",
  "full on credit": "Full On Credit",
  fullyadvance: "FullyAdvance",
  na: "NA",
  pdc: "PDC",
  "pi against advance": "PI Against Advance",
  "partial advance": "Partial Advance",
  "partial advance+pdc": "Partial Advance+PDC",
}
function formatPaymentModeLabel(value: string): string {
  if (!value) return ""
  return PAYMENT_MODE_LABELS[value] || value
}

function expandQueueItemsToRows(rawItems: any[]): PreInvoiceItemRow[] {
  const rows: PreInvoiceItemRow[] = []
  for (const it of rawItems || []) {
    const serials: string[] = Array.isArray(it.serials) ? it.serials : []
    const qty = Number(it.qty) || 0
    if (serials.length > 0) {
      const usable = serials.slice(0, qty)
      usable.forEach((serialNo: string) =>
        rows.push({ name: it.item_name, itemCode: it.item_code || "", qty: 1, serialNo, isPrefilled: true, installation: "No" })
      )
      const remaining = qty - usable.length
      if (remaining > 0) {
        rows.push({ name: it.item_name, itemCode: it.item_code || "", qty: remaining, serialNo: "", isPrefilled: true, installation: "No" })
      }
    } else {
      rows.push({ name: it.item_name, itemCode: it.item_code || "", qty, serialNo: "", isPrefilled: true, installation: "No" })
    }
  }
  return rows
}

export default function PreInvoicePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [processedOrders, setProcessedOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processedLoading, setProcessedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [srnAttachmentFile, setSrnAttachmentFile] = useState<File | null>(null)
  const [calibrationRequired, setCalibrationRequired] = useState("")
  const [calibrationType, setCalibrationType] = useState("")
  const [debitNoteForInvoiceRequired, setDebitNoteForInvoiceRequired] = useState("")
  const [transportId, setTransportId] = useState("")
  const [gstNumber, setGstNumber] = useState("")
  const [vehicleNumber, setVehicleNumber] = useState("")
  const [dispatchLocation, setDispatchLocation] = useState("")
  const [directDispatchDetails, setDirectDispatchDetails] = useState("")
  const [paymentAttachmentFile, setPaymentAttachmentFile] = useState<File | null>(null)
  const [preInvoiceRemarks, setPreInvoiceRemarks] = useState("")
  const [items, setItems] = useState<PreInvoiceItemRow[]>([])
  const [dispatchLocationOptions, setDispatchLocationOptions] = useState<string[]>([])
  const [paymentModeOptions, setPaymentModeOptions] = useState<string[]>([])
  const [paymentMode, setPaymentMode] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemListDialogOpen, setItemListDialogOpen] = useState(false)
  const [itemListDialogItems, setItemListDialogItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [crmNameFilter, setCrmNameFilter] = useState("all")
  const [currentTab, setCurrentTab] = useState("pending")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )
  const { user: currentUser } = useAuth()

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/otp-supabase/pre-invoice?status=pending")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data.map(mapPreInvoiceRowToUI))
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching pre-invoice pending queue:", err)
      setError(err.message)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProcessedOrders = async () => {
    setProcessedLoading(true)
    try {
      const response = await fetch("/api/otp-supabase/pre-invoice?status=history")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setProcessedOrders(result.data.map(mapPreInvoiceRowToUI))
      } else {
        setProcessedOrders([])
      }
    } catch (err) {
      console.error("Error fetching pre-invoice history:", err)
      setProcessedOrders([])
    } finally {
      setProcessedLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    fetch("/api/otp-supabase/dropdowns?category=dispatch_location")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          setDispatchLocationOptions(result.data.map((d: any) => d.value))
        }
      })
      .catch((err) => console.error("Error fetching dispatch location options:", err))
  }, [])

  useEffect(() => {
    fetch("/api/otp-supabase/dropdowns?category=payment_mode")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          setPaymentModeOptions(result.data.map((d: any) => d.value))
        }
      })
      .catch((err) => console.error("Error fetching payment mode options:", err))
  }, [])

  const handleProcessedTabClick = async () => {
    await fetchProcessedOrders()
  }

  // Role-based access: 'user' role only sees rows whose crmName is in their
  // assignedCrmNames (Settings > User Management) — see lib/crm-access.ts.
  const filteredOrders = useMemo(() => {
    let filtered = filterByCrmAccess(orders, currentUser)
    if (crmNameFilter !== "all") filtered = filtered.filter((order) => order.crmName === crmNameFilter)
    if (searchTerm) {
      filtered = filtered.filter((order) => {
        const searchableFields = pendingColumns
          .filter((col) => col.searchable)
          .map((col) => String(order[col.key] || "").toLowerCase())
        return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()))
      })
    }
    return filtered
  }, [orders, searchTerm, crmNameFilter, currentUser])

  const crmNameOptions = useMemo(() => crmNameOptionsFrom(filterByCrmAccess(orders, currentUser)), [orders, currentUser])

  const filteredProcessedOrders = useMemo(() => {
    let filtered = filterByCrmAccess(processedOrders, currentUser)
    if (crmNameFilter !== "all") filtered = filtered.filter((order) => order.crmName === crmNameFilter)
    if (searchTerm) {
      filtered = filtered.filter((order) => {
        const searchableFields = historyColumns
          .filter((col) => col.searchable)
          .map((col) => String(order[col.key] || "").toLowerCase())
        return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()))
      })
    }
    return filtered
  }, [processedOrders, searchTerm, crmNameFilter, currentUser])

  const togglePendingColumn = (columnKey: string) =>
    setVisiblePendingColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  const toggleHistoryColumn = (columnKey: string) =>
    setVisibleHistoryColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  const showAllPendingColumns = () =>
    setVisiblePendingColumns(pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))
  const hideAllPendingColumns = () =>
    setVisiblePendingColumns(pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: col.key === "actions" }), {}))
  const showAllHistoryColumns = () =>
    setVisibleHistoryColumns(historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))
  const hideAllHistoryColumns = () =>
    setVisibleHistoryColumns(historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: false }), {}))

  const handleProcess = (order: any) => {
    setSelectedOrder(order)
    setCalibrationRequired("")
    setCalibrationType("")
    setDebitNoteForInvoiceRequired("")
    setTransportId("")
    setGstNumber("")
    setVehicleNumber("")
    setDispatchLocation("")
    setDirectDispatchDetails("")
    setPaymentAttachmentFile(null)
    setSrnAttachmentFile(null)
    setPreInvoiceRemarks("")
    setPaymentMode(order.paymentMode || "")
    setItems(expandQueueItemsToRows(order.rawItems || []))
    setIsDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  const addItemRow = () => {
    setItems((prev) => [...prev, { name: "", itemCode: "", qty: 1, serialNo: "", isPrefilled: false, installation: "No" }])
  }

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateItemRow = (
    index: number,
    field: "name" | "qty" | "serialNo" | "installation",
    value: string | number
  ) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  }

  // Submits the Pre-Invoice stage — saves the dispatch-prep details onto
  // the otp_pre_invoice_queue row and flips its status to 'invoiced',
  // moving it from Pending to History. The Invoice Number itself is no
  // longer captured here — that's a later, not-yet-built stage's job on
  // this same row — so status is the sole pending/history signal now.
  const handleSubmit = async () => {
    if (!selectedOrder) return

    if (!debitNoteForInvoiceRequired) {
      alert("Please select whether Debit Note (Inv.) is required.")
      return
    }

    setIsSubmitting(true)
    try {
      let paymentAttachmentUrl = ""
      if (paymentAttachmentFile) {
        const formData = new FormData()
        formData.append("file", paymentAttachmentFile)
        formData.append("folder", "pre-invoice-payment")
        const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
        const uploadJson = await uploadRes.json()
        if (uploadJson.success) paymentAttachmentUrl = uploadJson.url
      }

      let srnAttachmentUrl = ""
      if (srnAttachmentFile) {
        const formData = new FormData()
        formData.append("file", srnAttachmentFile)
        formData.append("folder", "pre-invoice-srn")
        const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
        const uploadJson = await uploadRes.json()
        if (uploadJson.success) srnAttachmentUrl = uploadJson.url
      }

      const response = await fetch("/api/otp-supabase/pre-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedOrder.queueId || selectedOrder.id,
          createdBy: currentUser?.fullName || currentUser?.username || "Admin",
          items: items.map((it) => ({
            item_code: it.itemCode,
            item_name: it.name,
            qty: Number(it.qty) || 0,
            serial_no: it.serialNo || "",
            installation: it.installation, // carried forward so downstream stages can see which items needed installation
          })),
          calibrationRequired: calibrationRequired || "",
          calibrationType: calibrationRequired === "YES" ? calibrationType : "",
          transportId,
          gstNumber,
          vehicleNumber,
          dispatchLocation,
          directDispatchDetails,
          paymentAttachmentUrl,
          srnAttachmentUrl,
          remarks: preInvoiceRemarks,
          paymentMode,
          debitNoteForInvoiceRequired,
        }),
      })
      const result = await response.json()

      if (result.success) {
        // Items marked Installation=Yes each become one row in
        // sss_service_installation (existing legacy table/route — SI-001,
        // SI-002... generated there). Best-effort: a failure here doesn't
        // undo the Pre-Invoice submission that already succeeded above.
        const installationItems = items.filter((it) => it.installation === "Yes")
        let installationMessage = ""
        if (installationItems.length > 0) {
          try {
            const siRes = await fetch("/api/otp-supabase/service-installation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderNo: selectedOrder.orderNo,
                companyName: selectedOrder.companyName,
                contactPersonName: selectedOrder.contactPersonName,
                contactPersonNo: selectedOrder.contactNumber,
                items: installationItems.map((it) => ({
                  itemName: it.name,
                  qty: it.qty,
                  serial: it.serialNo,
                })),
              }),
            })
            const siResult = await siRes.json()
            installationMessage = siResult.success
              ? `\n\n${installationItems.length} item(s) logged in Service Installation.`
              : `\n\nFailed to log items in Service Installation: ${siResult.error}`
          } catch (siErr) {
            console.error("Error submitting to service-installation:", siErr)
            installationMessage = "\n\nFailed to log items in Service Installation system."
          }
        }

        setIsDialogOpen(false)
        setSelectedOrder(null)
        await fetchOrders()
        alert(`Order ${selectedOrder.orderNo} moved to Pre-Invoice History${installationMessage}`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting pre-invoice:", err)
      alert(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderCellContent = (order: any, columnKey: string) => {
    const value = order[columnKey]
    switch (columnKey) {
      case "actions":
        return (
          <Button size="sm" onClick={() => handleProcess(order)} disabled={currentUser?.role === "user"}>
            {currentUser?.role === "user" ? "View Only" : "Process"}
          </Button>
        )
      case "itemList":
        return (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
            onClick={() => handleViewItemList(order)}
          >
            <Eye className="h-3.5 w-3.5" />
            View Items
          </Button>
        )
      case "paymentAttachment":
        return order.paymentAttachmentUrl ? (
          <a href={order.paymentAttachmentUrl} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">Link</Badge>
          </a>
        ) : (
          <Badge variant="secondary">N/A</Badge>
        )
      case "srnAttachment":
        return order.srnAttachmentUrl ? (
          <a href={order.srnAttachmentUrl} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">Link</Badge>
          </a>
        ) : (
          <Badge variant="secondary">N/A</Badge>
        )
      case "sourceStage":
        return <Badge variant="outline">{value || "N/A"}</Badge>
      case "calibrationRequired":
      case "debitNoteForInvoiceRequired":
        return value ? <Badge variant={value === "YES" ? "default" : "secondary"}>{value}</Badge> : ""
      case "paymentMode":
        return formatPaymentModeLabel(value)
      default:
        return value || ""
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading pre-invoice queue...</span>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Error Loading Data</h1>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={fetchOrders} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="p-2 h-[calc(100vh-5rem)] md:h-[calc(100vh-5.5rem)] flex flex-col">
        <Tabs
          value={currentTab}
          onValueChange={(value) => setCurrentTab(value)}
          className="flex-1 flex flex-col min-h-0"
        >
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="border-b py-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="pending">Pending ({filteredOrders.length})</TabsTrigger>
                  <TabsTrigger value="history" onClick={handleProcessedTabClick}>
                    History ({filteredProcessedOrders.length})
                  </TabsTrigger>
                </TabsList>

                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select value={crmNameFilter} onValueChange={setCrmNameFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All CRM Names" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All CRM Names</SelectItem>
                      {crmNameOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={fetchOrders} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Column Visibility
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                      <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="flex gap-2 p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={currentTab === "pending" ? showAllPendingColumns : showAllHistoryColumns}
                        >
                          Show All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={currentTab === "pending" ? hideAllPendingColumns : hideAllHistoryColumns}
                        >
                          Hide All
                        </Button>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="p-2 space-y-2">
                        {(currentTab === "pending" ? pendingColumns : historyColumns).map((column) => {
                          const visibleCols = currentTab === "pending" ? visiblePendingColumns : visibleHistoryColumns;
                          const toggleCol = currentTab === "pending" ? togglePendingColumn : toggleHistoryColumn;
                          return (
                            <div key={column.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={`col-${column.key}`}
                                checked={visibleCols[column.key]}
                                onCheckedChange={() => toggleCol(column.key)}
                              />
                              <Label htmlFor={`col-${column.key}`} className="text-sm">
                                {column.label}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 min-h-0 flex flex-col">
              <TabsContent value="pending" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
                <div className="md:hidden space-y-3 overflow-y-auto flex-1">
                  {filteredOrders.map((order, idx) => (
                    <MobileRecordCard
                      key={order.id || idx}
                      columns={pendingColumns}
                      visibleColumns={visiblePendingColumns}
                      record={order}
                      renderCellContent={renderCellContent}
                    />
                  ))}
                  {filteredOrders.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? "No orders match your search criteria" : "No pending pre-invoice orders"}
                    </p>
                  )}
                </div>

                <div className="hidden md:flex flex-col flex-1 min-h-0 border rounded-lg overflow-hidden relative">
                  <div className="overflow-auto flex-1 min-h-0">
                    <Table className="w-full relative">
                      <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                        <TableRow>
                          {pendingColumns
                            .filter((col) => visiblePendingColumns[col.key])
                            .map((column) => (
                              <TableHead
                                key={column.key}
                                className="bg-gray-50 font-semibold text-gray-900 px-4 py-3 whitespace-nowrap"
                                style={{
                                  minWidth: column.key === 'actions' ? '120px' :
                                    column.key === 'timestamp' ? '130px' :
                                      column.key === 'orderNo' ? '120px' :
                                        column.key === 'quotationNo' ? '150px' :
                                          column.key === 'companyName' ? '250px' :
                                            column.key === 'contactPersonName' ? '180px' :
                                              column.key === 'contactNumber' ? '140px' :
                                                column.key === 'sourceStage' ? '150px' :
                                                  column.key === 'itemList' ? '130px' :
                                                    '160px',
                                }}
                              >
                                {column.label}
                              </TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order, idx) => (
                          <TableRow key={order.id || idx} className="hover:bg-gray-50">
                            {pendingColumns
                              .filter((col) => visiblePendingColumns[col.key])
                              .map((column) => (
                                <TableCell
                                  key={column.key}
                                  className="border-b px-4 py-3 align-top"
                                  style={{
                                    minWidth: column.key === 'actions' ? '120px' :
                                      column.key === 'timestamp' ? '130px' :
                                        column.key === 'orderNo' ? '120px' :
                                          column.key === 'quotationNo' ? '150px' :
                                            column.key === 'companyName' ? '250px' :
                                              column.key === 'contactPersonName' ? '180px' :
                                                column.key === 'contactNumber' ? '140px' :
                                                  column.key === 'sourceStage' ? '150px' :
                                                    column.key === 'itemList' ? '130px' :
                                                      '160px',
                                  }}
                                >
                                  <div className="break-words whitespace-normal leading-relaxed">
                                    {renderCellContent(order, column.key)}
                                  </div>
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                        {filteredOrders.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={pendingColumns.filter((col) => visiblePendingColumns[col.key]).length}
                              className="text-center text-muted-foreground h-32"
                            >
                              {searchTerm ? "No orders match your search criteria" : "No pending pre-invoice orders"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
                {processedLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading history...</span>
                  </div>
                ) : (
                  <>
                    <div className="md:hidden space-y-3 overflow-y-auto flex-1">
                      {filteredProcessedOrders.map((order, idx) => (
                        <MobileRecordCard
                          key={order.id || idx}
                          columns={historyColumns}
                          visibleColumns={visibleHistoryColumns}
                          record={order}
                          renderCellContent={renderCellContent}
                        />
                      ))}
                      {filteredProcessedOrders.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          {searchTerm ? "No orders match your search criteria" : "No processed orders found"}
                        </p>
                      )}
                    </div>

                    <div className="hidden md:flex flex-col flex-1 min-h-0 border rounded-lg overflow-hidden relative">
                      <div className="overflow-auto flex-1 min-h-0">
                        <Table className="w-full relative">
                          <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                            <TableRow>
                              {historyColumns
                                .filter((col) => visibleHistoryColumns[col.key])
                                .map((column) => (
                                  <TableHead
                                    key={column.key}
                                    className="bg-gray-50 font-semibold text-gray-900 px-4 py-3 whitespace-nowrap"
                                    style={{
                                      minWidth: column.key === 'timestamp' ? '130px' :
                                        column.key === 'orderNo' ? '120px' :
                                          column.key === 'quotationNo' ? '150px' :
                                            column.key === 'companyName' ? '250px' :
                                              column.key === 'contactPersonName' ? '180px' :
                                                column.key === 'contactNumber' ? '140px' :
                                                  column.key === 'sourceStage' ? '150px' :
                                                    column.key === 'paymentMode' ? '150px' :
                                                      column.key === 'calibrationRequired' ? '180px' :
                                                        column.key === 'calibrationType' ? '180px' :
                                                          column.key === 'transportId' ? '180px' :
                                                            column.key === 'gstNumber' ? '150px' :
                                                              column.key === 'vehicleNumber' ? '150px' :
                                                                column.key === 'dispatchLocation' ? '180px' :
                                                                  column.key === 'directDispatchDetails' ? '200px' :
                                                                    column.key === 'paymentAttachment' ? '180px' :
                                                                      column.key === 'srnAttachment' ? '150px' :
                                                                        column.key === 'remarks' ? '200px' :
                                                                          column.key === 'createdBy' ? '150px' :
                                                                            column.key === 'invoicedAt' ? '150px' :
                                                                              '160px',
                                    }}
                                  >
                                    {column.label}
                                  </TableHead>
                                ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredProcessedOrders.map((order, idx) => (
                              <TableRow key={order.id || idx} className="hover:bg-gray-50">
                                {historyColumns
                                  .filter((col) => visibleHistoryColumns[col.key])
                                  .map((column) => (
                                    <TableCell
                                      key={column.key}
                                      className="border-b px-4 py-3 align-top"
                                      style={{
                                        minWidth: column.key === 'timestamp' ? '130px' :
                                          column.key === 'orderNo' ? '120px' :
                                            column.key === 'quotationNo' ? '150px' :
                                              column.key === 'companyName' ? '250px' :
                                                column.key === 'contactPersonName' ? '180px' :
                                                  column.key === 'contactNumber' ? '140px' :
                                                    column.key === 'sourceStage' ? '150px' :
                                                      column.key === 'paymentMode' ? '150px' :
                                                        column.key === 'calibrationRequired' ? '180px' :
                                                          column.key === 'calibrationType' ? '180px' :
                                                            column.key === 'transportId' ? '180px' :
                                                              column.key === 'gstNumber' ? '150px' :
                                                                column.key === 'vehicleNumber' ? '150px' :
                                                                  column.key === 'dispatchLocation' ? '180px' :
                                                                    column.key === 'directDispatchDetails' ? '200px' :
                                                                      column.key === 'paymentAttachment' ? '180px' :
                                                                        column.key === 'srnAttachment' ? '150px' :
                                                                          column.key === 'remarks' ? '200px' :
                                                                            column.key === 'createdBy' ? '150px' :
                                                                              column.key === 'invoicedAt' ? '150px' :
                                                                                '160px',
                                      }}
                                    >
                                      <div className="break-words whitespace-normal leading-relaxed">
                                        {renderCellContent(order, column.key)}
                                      </div>
                                    </TableCell>
                                  ))}
                              </TableRow>
                            ))}
                            {filteredProcessedOrders.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={historyColumns.filter((col) => visibleHistoryColumns[col.key]).length}
                                  className="text-center text-muted-foreground h-32"
                                >
                                  {searchTerm ? "No orders match your search criteria" : "No processed orders found"}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        {/* Process Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Process Pre-Invoice</DialogTitle>
              <DialogDescription>Enter the dispatch details for this order's available quantity</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNo">Order No.</Label>
                  <Input id="orderNo" value={selectedOrder?.orderNo || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={selectedOrder?.companyName || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModeOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {formatPaymentModeLabel(opt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 1: Calibration Required, Dispatch Location, Debit Note (Inv.) Required */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calibration">Calibration Certificate Required</Label>
                  <Select value={calibrationRequired} onValueChange={setCalibrationRequired}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YES">YES</SelectItem>
                      <SelectItem value="NO">NO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dispatchLocation">Dispatch Location</Label>
                  <Select value={dispatchLocation} onValueChange={setDispatchLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dispatch location" />
                    </SelectTrigger>
                    <SelectContent>
                      {dispatchLocationOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debitNoteForInvoiceRequired">Debit Note (Inv.) Required</Label>
                  <Select value={debitNoteForInvoiceRequired} onValueChange={setDebitNoteForInvoiceRequired}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YES">YES</SelectItem>
                      <SelectItem value="NO">NO</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    YES sends this order to Debit Note (Inv.) first; NO skips straight to Make Invoice.
                  </p>
                </div>
                {calibrationRequired === "YES" && (
                  <div className="space-y-2">
                    <Label htmlFor="calibrationType">Calibration Type</Label>
                    <Select value={calibrationType} onValueChange={setCalibrationType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select calibration type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LAB">LAB</SelectItem>
                        <SelectItem value="Surevey Instruments">Survey Instruments</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Row 2: Transport Id/Name, GST Number, Vehicle Number */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transportId">Transport Id/Name</Label>
                  <Input
                    id="transportId"
                    value={transportId}
                    onChange={(e) => setTransportId(e.target.value)}
                    placeholder="Enter transport id/name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="Enter GST Number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                  <Input
                    id="vehicleNumber"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="Enter Vehicle Number"
                  />
                </div>
              </div>

              {/* Row 3: Direct Dispatch Details, Remarks */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="directDispatch">Direct Dispatch Details</Label>
                  <Input
                    id="directDispatch"
                    value={directDispatchDetails}
                    onChange={(e) => setDirectDispatchDetails(e.target.value)}
                    placeholder="Enter direct dispatch details"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preInvoiceRemarks">Remarks</Label>
                  <Input
                    id="preInvoiceRemarks"
                    value={preInvoiceRemarks}
                    onChange={(e) => setPreInvoiceRemarks(e.target.value)}
                    placeholder="Enter any remarks..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Items (Total: {items.length})</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addItemRow}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[30%] font-semibold">Item Name</TableHead>
                        <TableHead className="w-[25%] font-semibold">Serial No</TableHead>
                        <TableHead className="w-[15%] font-semibold text-center">Qty</TableHead>
                        <TableHead className="w-[20%] font-semibold text-center">Installation</TableHead>
                        <TableHead className="w-[10%] font-semibold text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/30">
                          <TableCell className="p-2">
                            <Input
                              value={item.name}
                              onChange={(e) => updateItemRow(index, "name", e.target.value)}
                              placeholder="Enter item name"
                              className="h-9"
                              disabled={item.isPrefilled}
                              readOnly={item.isPrefilled}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              value={item.serialNo}
                              onChange={(e) => updateItemRow(index, "serialNo", e.target.value)}
                              placeholder="Serial No"
                              className="h-9 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-2 text-center">
                            <Input
                              type="number"
                              value={item.qty}
                              onChange={(e) => updateItemRow(index, "qty", Number.parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="h-9 text-center w-full min-w-[60px]"
                            />
                          </TableCell>
                          <TableCell className="p-2 text-center">
                            <Select
                              value={item.installation}
                              onValueChange={(val) => updateItemRow(index, "installation", val)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="No" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-2 text-center">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeItemRow(index)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {items.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground border border-dashed rounded-md">
                    No items added. Click "Add Item" to begin.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentDetails">Payment Details (Attachment) - In case of Advance</Label>
                  <Input
                    id="paymentDetails"
                    type="file"
                    onChange={(e) => setPaymentAttachmentFile(e.target.files?.[0] || null)}
                  />
                  {paymentAttachmentFile && (
                    <p className="text-sm text-muted-foreground">Selected: {paymentAttachmentFile.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="srnAttachment">SRN Attachment</Label>
                  <Input
                    id="srnAttachment"
                    type="file"
                    onChange={(e) => setSrnAttachmentFile(e.target.files?.[0] || null)}
                  />
                  {srnAttachmentFile && (
                    <p className="text-sm text-muted-foreground">Selected: {srnAttachmentFile.name}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Item List Dialog */}
        <Dialog open={itemListDialogOpen} onOpenChange={setItemListDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Item List</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-center">Installation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemListDialogItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No items
                    </TableCell>
                  </TableRow>
                ) : (
                  itemListDialogItems.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.installation === "Yes" ? "default" : "secondary"}>
                          {item.installation === "Yes" ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex justify-end">
              <Button onClick={() => setItemListDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
