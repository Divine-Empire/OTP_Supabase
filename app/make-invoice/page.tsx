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
import { RefreshCw, Search, Settings, Eye } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { mapMakeInvoicePendingRowToUI, mapMakeInvoiceHistoryRowToUI } from "@/lib/otp-utils"
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
  { key: "billingAddress", label: "Billing Address", searchable: true },
  { key: "shippingAddress", label: "Shipping Address", searchable: true },
  { key: "paymentMode", label: "Payment Mode", searchable: true },
  { key: "paymentTerms", label: "Payment Terms(In Days)", searchable: true },
  { key: "transportMode", label: "Transport Mode", searchable: true },
  { key: "destination", label: "Destination", searchable: true },
  { key: "poNumber", label: "Po Number", searchable: true },
  { key: "quotationCopy", label: "Quotation Copy", searchable: true },
  { key: "acceptanceCopy", label: "Acceptance Copy", searchable: true },
  { key: "offerShow", label: "Offer Show", searchable: true },
  { key: "conveyedForRegistration", label: "Conveyed For Registration Form", searchable: true },
  { key: "totalOrderQty", label: "Total Order Qty", searchable: true },
  { key: "amount", label: "Amount", searchable: true },
  { key: "sourceStage", label: "Source Stage", searchable: true },
  { key: "debitNoteForInvoiceRequired", label: "Debit Note", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "invoiceNumber", label: "Invoice Number", searchable: true },
  { key: "invoiceDate", label: "Invoice Date", searchable: true },
  { key: "invoiceUpload", label: "Invoice Upload", searchable: false },
  { key: "ewayBillNumber", label: "Eway Bill Number", searchable: true },
  { key: "ewayBillUpload", label: "Eway Bill Upload", searchable: false },
  { key: "totalBillAmount", label: "Total Bill Amount", searchable: false },
  { key: "transportId", label: "Transport Id/Name", searchable: true },
  { key: "gstNumber", label: "GST Number", searchable: true },
  { key: "vehicleNumber", label: "Vehicle Number", searchable: true },
  { key: "paymentAttachment", label: "Payment Details (Attachment) - In case of Advance", searchable: false },
  { key: "srnAttachment", label: "SRN Attachment", searchable: false },
  { key: "remarks", label: "Remarks", searchable: true },
  { key: "createdBy", label: "Created By", searchable: true },
]

// Offer Show / Conveyed For Registration Form have no backing DB column
// (same as order-acceptable, which this page's columns mirror) so are
// always blank; Source Stage / Debit Note are internal routing fields, not
// requested for display. All hidden by default, still toggleable.
const DEFAULT_HIDDEN_COLUMNS = new Set(["offerShow", "conveyedForRegistration", "sourceStage", "debitNoteForInvoiceRequired"])

export default function MakeInvoicePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [processedOrders, setProcessedOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processedLoading, setProcessedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState("")
  const [invoiceUploadFile, setInvoiceUploadFile] = useState<File | null>(null)
  const [ewayBillNumber, setEwayBillNumber] = useState("")
  const [ewayBillUploadFile, setEwayBillUploadFile] = useState<File | null>(null)
  const [totalBillAmount, setTotalBillAmount] = useState("")
  const [transportId, setTransportId] = useState("")
  const [gstNumber, setGstNumber] = useState("")
  const [vehicleNumber, setVehicleNumber] = useState("")
  const [paymentAttachmentFile, setPaymentAttachmentFile] = useState<File | null>(null)
  const [srnAttachmentFile, setSrnAttachmentFile] = useState<File | null>(null)
  const [remarks, setRemarks] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemListDialogOpen, setItemListDialogOpen] = useState(false)
  const [itemListDialogItems, setItemListDialogItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [crmNameFilter, setCrmNameFilter] = useState("all")
  const [currentTab, setCurrentTab] = useState("pending")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: !DEFAULT_HIDDEN_COLUMNS.has(col.key) }), {})
  )
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: !DEFAULT_HIDDEN_COLUMNS.has(col.key) }), {})
  )
  const { user: currentUser } = useAuth()

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/otp-supabase/make-invoice?status=pending")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data.map(mapMakeInvoicePendingRowToUI))
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching make-invoice pending queue:", err)
      setError(err.message)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProcessedOrders = async () => {
    setProcessedLoading(true)
    try {
      const response = await fetch("/api/otp-supabase/make-invoice?status=history")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setProcessedOrders(result.data.map(mapMakeInvoiceHistoryRowToUI))
      } else {
        setProcessedOrders([])
      }
    } catch (err) {
      console.error("Error fetching make-invoice history:", err)
      setProcessedOrders([])
    } finally {
      setProcessedLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
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
    setInvoiceNumber("")
    setInvoiceDate("")
    setInvoiceUploadFile(null)
    setEwayBillNumber("")
    setEwayBillUploadFile(null)
    setTotalBillAmount("")
    setTransportId("")
    setGstNumber("")
    setVehicleNumber("")
    setPaymentAttachmentFile(null)
    setSrnAttachmentFile(null)
    setRemarks("")
    setIsDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  // Submits Make Invoice — inserts a row into otp_make_invoice (one per
  // otp_pre_invoice_queue wave), which is what moves this wave from
  // Pending to History here. This is where the Invoice Number actually
  // gets captured, one stage later than the wave was first queued.
  const handleSubmit = async () => {
    if (!selectedOrder) return
    if (!invoiceNumber.trim() || !invoiceDate || !totalBillAmount || !invoiceUploadFile) {
      alert("Invoice Number, Invoice Date, Total Bill Amount and Invoice Upload are required")
      return
    }

    setIsSubmitting(true)
    try {
      let invoiceUploadUrl = ""
      if (invoiceUploadFile) {
        const formData = new FormData()
        formData.append("file", invoiceUploadFile)
        formData.append("folder", "make-invoice")
        const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
        const uploadJson = await uploadRes.json()
        if (uploadJson.success) invoiceUploadUrl = uploadJson.url
      }

      let ewayBillUploadUrl = ""
      if (ewayBillUploadFile) {
        const formData = new FormData()
        formData.append("file", ewayBillUploadFile)
        formData.append("folder", "make-invoice-eway")
        const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
        const uploadJson = await uploadRes.json()
        if (uploadJson.success) ewayBillUploadUrl = uploadJson.url
      }

      let paymentAttachmentUrl = ""
      if (paymentAttachmentFile) {
        const formData = new FormData()
        formData.append("file", paymentAttachmentFile)
        formData.append("folder", "make-invoice-payment")
        const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
        const uploadJson = await uploadRes.json()
        if (uploadJson.success) paymentAttachmentUrl = uploadJson.url
      }

      let srnAttachmentUrl = ""
      if (srnAttachmentFile) {
        const formData = new FormData()
        formData.append("file", srnAttachmentFile)
        formData.append("folder", "make-invoice-srn")
        const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
        const uploadJson = await uploadRes.json()
        if (uploadJson.success) srnAttachmentUrl = uploadJson.url
      }

      const response = await fetch("/api/otp-supabase/make-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueId: selectedOrder.queueId || selectedOrder.id,
          invoiceNumber: invoiceNumber.trim(),
          invoiceDate: invoiceDate || null,
          invoiceUploadUrl,
          ewayBillNumber,
          ewayBillUploadUrl,
          totalBillAmount: totalBillAmount || null,
          transportId,
          gstNumber,
          vehicleNumber,
          paymentAttachmentUrl,
          srnAttachmentUrl,
          remarks,
          createdBy: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsDialogOpen(false)
        setSelectedOrder(null)
        await fetchOrders()
        alert(`Order ${selectedOrder.orderNo} — Invoice ${invoiceNumber.trim()} created.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting make-invoice:", err)
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
      case "invoiceUpload":
        return order.invoiceUploadUrl ? (
          <a href={order.invoiceUploadUrl} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">Link</Badge>
          </a>
        ) : (
          <Badge variant="secondary">N/A</Badge>
        )
      case "ewayBillUpload":
        return order.ewayBillUploadUrl ? (
          <a href={order.ewayBillUploadUrl} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">Link</Badge>
          </a>
        ) : (
          <Badge variant="secondary">N/A</Badge>
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
      case "billingAddress":
      case "shippingAddress":
        return <div className="address-cell">{value}</div>
      case "quotationCopy":
      case "acceptanceCopy":
        return value && (value.startsWith("http") || value.startsWith("https")) ? (
          <a href={value} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">Link</Badge>
          </a>
        ) : (
          <Badge variant="secondary">{value || "N/A"}</Badge>
        )
      case "totalBillAmount":
        return value ? `₹${Number(value).toLocaleString()}` : ""
      case "sourceStage":
        return <Badge variant="outline">{value || "N/A"}</Badge>
      case "debitNoteForInvoiceRequired":
        return value ? (
          <span
            className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-bold ${
              value === "YES" ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-emerald-100 text-emerald-800 border border-emerald-300"
            }`}
          >
            {value}
          </span>
        ) : (
          ""
        )
      default:
        return value || ""
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading make-invoice queue...</span>
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
                      {searchTerm ? "No orders match your search criteria" : "No pending make-invoice waves"}
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
                                                  column.key === 'debitNoteForInvoiceRequired' ? '110px' :
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
                                                    column.key === 'debitNoteForInvoiceRequired' ? '110px' :
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
                              {searchTerm ? "No orders match your search criteria" : "No pending make-invoice waves"}
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
                                                    column.key === 'invoiceNumber' ? '150px' :
                                                      column.key === 'invoiceDate' ? '150px' :
                                                        column.key === 'invoiceUpload' ? '150px' :
                                                          column.key === 'ewayBillNumber' ? '180px' :
                                                            column.key === 'ewayBillUpload' ? '150px' :
                                                              column.key === 'totalBillAmount' ? '150px' :
                                                                column.key === 'remarks' ? '200px' :
                                                                  column.key === 'createdBy' ? '150px' :
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
                                                      column.key === 'invoiceNumber' ? '150px' :
                                                        column.key === 'invoiceDate' ? '150px' :
                                                          column.key === 'invoiceUpload' ? '150px' :
                                                            column.key === 'ewayBillNumber' ? '180px' :
                                                              column.key === 'ewayBillUpload' ? '150px' :
                                                                column.key === 'totalBillAmount' ? '150px' :
                                                                  column.key === 'remarks' ? '200px' :
                                                                    column.key === 'createdBy' ? '150px' :
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Process Make Invoice</DialogTitle>
              <DialogDescription>Enter the invoice details for this order's available quantity</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNo">Order No.</Label>
                  <Input id="orderNo" value={selectedOrder?.orderNo || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={selectedOrder?.companyName || ""} disabled />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Enter invoice number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceDate">Invoice Date *</Label>
                  <Input id="invoiceDate" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ewayBillNumber">Eway Bill Number</Label>
                  <Input
                    id="ewayBillNumber"
                    value={ewayBillNumber}
                    onChange={(e) => setEwayBillNumber(e.target.value)}
                    placeholder="Enter eway bill number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalBillAmount">Total Bill Amount *</Label>
                  <Input
                    id="totalBillAmount"
                    type="number"
                    value={totalBillAmount}
                    onChange={(e) => setTotalBillAmount(e.target.value)}
                    placeholder="Enter total bill amount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceUpload">Invoice Upload *</Label>
                  <Input id="invoiceUpload" type="file" onChange={(e) => setInvoiceUploadFile(e.target.files?.[0] || null)} />
                  {invoiceUploadFile && <p className="text-sm text-muted-foreground">Selected: {invoiceUploadFile.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ewayBillUpload">Eway Bill Upload</Label>
                  <Input id="ewayBillUpload" type="file" onChange={(e) => setEwayBillUploadFile(e.target.files?.[0] || null)} />
                  {ewayBillUploadFile && <p className="text-sm text-muted-foreground">Selected: {ewayBillUploadFile.name}</p>}
                </div>
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentAttachment">Payment Details (Attachment) - In case of Advance</Label>
                  <Input
                    id="paymentAttachment"
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

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Input id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter any remarks..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!invoiceNumber.trim() || !invoiceDate || !totalBillAmount || !invoiceUploadFile || isSubmitting}
                >
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
