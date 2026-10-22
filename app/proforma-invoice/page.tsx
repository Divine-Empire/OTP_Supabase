"use client"

import { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Eye, Loader2 } from "lucide-react"
import { useServerHistory } from "@/hooks/use-server-history"
import { useAuth } from "@/components/auth-provider"
import {
  mapProformaInvoicePendingRowToUI,
  mapProformaInvoicePaymentAgainstPiRowToUI,
  mapProformaInvoiceHistoryRowToUI,
} from "@/lib/otp-utils"
import { filterByAccess, crmNameOptionsFrom } from "@/lib/access"
import { MobileRecordCard } from "@/components/mobile-record-card"
import { StatusTabs, ColumnSelector, FilterSearch, FilterChips, DataTable, StatusBadge } from "@/components/shared"
import { toast } from "sonner"

// Column definitions for Pending tab
const pendingColumns = [
  { key: "actions", label: "Actions", searchable: false },
  { key: "timestamp", label: "Timestamp", searchable: true },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "crmName", label: "CRM Name", searchable: true },
  { key: "quotationNo", label: "Quotation No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "contactPersonName", label: "Contact Person Name", searchable: true },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "billingAddress", label: "Billing Address", searchable: true },
  { key: "shippingAddress", label: "Shipping Address", searchable: true },
  { key: "paymentMode", label: "Payment Mode", searchable: true },
  { key: "paymentTerms", label: "Payment Terms(In Days)", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
  { key: "transportMode", label: "Transport Mode", searchable: true },
  { key: "destination", label: "Destination", searchable: true },
  { key: "poNumber", label: "Po Number", searchable: true },
  { key: "quotationCopy", label: "Quotation Copy", searchable: true },
  { key: "acceptanceCopy", label: "Acceptance Copy", searchable: true },
  { key: "offerShow", label: "Offer Show", searchable: true },
  { key: "conveyedForRegistration", label: "Conveyed For Registration Form", searchable: true },
  { key: "totalOrderQty", label: "Total Order Qty", searchable: true },
  { key: "amount", label: "Amount", searchable: true },
  { key: "planned", label: "Planned", searchable: true },
]

// Column definitions for the "Payment Against PI" tab — sits between
// Pending and History: a row lands here once PI Number/Amount/Upload is
// submitted, and stays until Payment Received (Yes/No) is confirmed.
const paymentAgainstPiColumns = [
  { key: "actionsPayment", label: "Actions", searchable: false },
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "piNumber", label: "PI Number", searchable: true },
  { key: "piAmount", label: "PI Amount", searchable: false },
  { key: "piUpload", label: "PI Upload", searchable: false },
  { key: "remark", label: "Remark", searchable: true },
  { key: "createdBy", label: "Created By", searchable: true },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "piNumber", label: "PI Number", searchable: true },
  { key: "piAmount", label: "PI Amount", searchable: false },
  { key: "piUpload", label: "PI Upload", searchable: false },
  { key: "remark", label: "Remark", searchable: true },
  { key: "createdBy", label: "Created By", searchable: true },
  { key: "paymentReceived", label: "Payment Received", searchable: true },
  { key: "paymentRemark", label: "Payment Remark", searchable: true },
  { key: "actual", label: "Actual", searchable: true },
]

export default function ProformaInvoicePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [paymentAgainstPiOrders, setPaymentAgainstPiOrders] = useState<any[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(50)
  const [loading, setLoading] = useState(true)
  const [paymentAgainstPiLoading, setPaymentAgainstPiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [piNumber, setPiNumber] = useState("")
  const [piAmount, setPiAmount] = useState("")
  const [piUploadFile, setPiUploadFile] = useState<File | null>(null)
  const [remark, setRemark] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState<any>(null)
  const [paymentReceived, setPaymentReceived] = useState("")
  const [paymentRemark, setPaymentRemark] = useState("")
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [itemListDialogOpen, setItemListDialogOpen] = useState(false)
  const [itemListDialogItems, setItemListDialogItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [crmNameFilter, setCrmNameFilter] = useState("all")
  const [currentTab, setCurrentTab] = useState("pending")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const DEFAULT_HIDDEN_COLUMNS = new Set(["offerShow", "conveyedForRegistration"])
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: !DEFAULT_HIDDEN_COLUMNS.has(col.key) }), {})
  )
  const [visiblePaymentAgainstPiColumns, setVisiblePaymentAgainstPiColumns] = useState<Record<string, boolean>>(
    paymentAgainstPiColumns.reduce((acc, col) => ({ ...acc, [col.key]: !DEFAULT_HIDDEN_COLUMNS.has(col.key) }), {})
  )
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: !DEFAULT_HIDDEN_COLUMNS.has(col.key) }), {})
  )
  const { user: currentUser } = useAuth()

  // History: one server page per request (search / CRM / access rules run in SQL).
  const history = useServerHistory({
    url: "/api/otp-supabase/proforma-invoice?status=history",
    map: mapProformaInvoiceHistoryRowToUI,
    active: currentTab === "history",
    page: historyPage,
    pageSize: historyPageSize,
    search: searchTerm,
    crmName: crmNameFilter,
    currentUser,
  })
  const processedOrders = history.rows
  const processedTotal = history.total
  const processedLoading = history.loading
  const loadProcessedOrders = history.reload

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/otp-supabase/proforma-invoice?status=pending")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data.map(mapProformaInvoicePendingRowToUI))
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching proforma-invoice pending queue:", err)
      setError(err.message)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentAgainstPiOrders = async () => {
    setPaymentAgainstPiLoading(true)
    try {
      const response = await fetch("/api/otp-supabase/proforma-invoice?status=payment-against-pi")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setPaymentAgainstPiOrders(result.data.map(mapProformaInvoicePaymentAgainstPiRowToUI))
      } else {
        setPaymentAgainstPiOrders([])
      }
    } catch (err) {
      console.error("Error fetching payment-against-pi queue:", err)
      setPaymentAgainstPiOrders([])
    } finally {
      setPaymentAgainstPiLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchPaymentAgainstPiOrders()
  }, [])

  const handleProcessedTabClick = () => {
    setHistoryPage(1)
    loadProcessedOrders()
  }

  // Any filter/search change can shrink the list under the current page.
  useEffect(() => { setHistoryPage(1) }, [searchTerm, crmNameFilter])

  // Role-based access: 'user' role only sees rows matching their assigned
  // CRM names and location (Settings > User Management) — see lib/access.ts.
  const filteredOrders = useMemo(() => {
    let filtered = filterByAccess(orders, currentUser)
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

  const crmNameOptions = useMemo(() => crmNameOptionsFrom(filterByAccess(orders, currentUser)), [orders, currentUser])

  const filteredPaymentAgainstPiOrders = useMemo(() => {
    let filtered = filterByAccess(paymentAgainstPiOrders, currentUser)
    if (crmNameFilter !== "all") filtered = filtered.filter((order) => order.crmName === crmNameFilter)
    if (searchTerm) {
      filtered = filtered.filter((order) => {
        const searchableFields = paymentAgainstPiColumns
          .filter((col) => col.searchable)
          .map((col) => String(order[col.key] || "").toLowerCase())
        return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()))
      })
    }
    return filtered
  }, [paymentAgainstPiOrders, searchTerm, crmNameFilter, currentUser])

  // Already filtered and paged by the server.
  const filteredProcessedOrders = processedOrders

  const historyPageRows = processedOrders

  const togglePendingColumn = (columnKey: string) =>
    setVisiblePendingColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  const togglePaymentAgainstPiColumn = (columnKey: string) =>
    setVisiblePaymentAgainstPiColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  const toggleHistoryColumn = (columnKey: string) =>
    setVisibleHistoryColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  const showAllPendingColumns = () =>
    setVisiblePendingColumns(pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))
  const hideAllPendingColumns = () =>
    setVisiblePendingColumns(pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: col.key === "actions" }), {}))
  const showAllPaymentAgainstPiColumns = () =>
    setVisiblePaymentAgainstPiColumns(paymentAgainstPiColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))
  const hideAllPaymentAgainstPiColumns = () =>
    setVisiblePaymentAgainstPiColumns(
      paymentAgainstPiColumns.reduce((acc, col) => ({ ...acc, [col.key]: col.key === "actionsPayment" }), {})
    )
  const showAllHistoryColumns = () =>
    setVisibleHistoryColumns(historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))
  const hideAllHistoryColumns = () =>
    setVisibleHistoryColumns(historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: false }), {}))

  const handleProcessPayment = (order: any) => {
    setSelectedPaymentOrder(order)
    setPaymentReceived("")
    setPaymentRemark("")
    setIsPaymentDialogOpen(true)
  }

  const handleSubmitPayment = async () => {
    if (!selectedPaymentOrder || !paymentReceived) return
    if (paymentReceived === "No" && !paymentRemark.trim()) {
      toast.error("Please enter a remark since payment was not received.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/otp-supabase/proforma-invoice/payment-against-pi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proformaInvoiceId: selectedPaymentOrder.proformaInvoiceId || selectedPaymentOrder.id,
          paymentReceived,
          remark: paymentRemark,
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsPaymentDialogOpen(false)
        setSelectedPaymentOrder(null)
        await fetchPaymentAgainstPiOrders()
        toast.success(`Order ${selectedPaymentOrder.orderNo} — Payment Against PI recorded. Packing List is now scheduled.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting payment-against-pi:", err)
      toast.error(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProcess = (order: any) => {
    setSelectedOrder(order)
    setPiNumber("")
    setPiAmount("")
    setPiUploadFile(null)
    setRemark("")
    setIsDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  // Submits Pro-Forma Invoice — inserts a row into otp_proforma_invoice,
  // which moves this order from Pending to the "Payment Against PI" tab
  // (not History — that only happens once Payment Against PI is itself
  // processed, see handleSubmitPayment above and
  // app/api/otp-supabase/proforma-invoice/payment-against-pi/route.ts,
  // which is also where Check Inventory's planned date now gets set).
  const handleSubmit = async () => {
    if (!selectedOrder) return
    if (!piNumber.trim() || !piAmount || !piUploadFile) {
      toast.error("PI Number, PI Amount and PI Upload are required")
      return
    }

    setIsSubmitting(true)
    try {
      let piUploadUrl = ""
      if (piUploadFile) {
        const formData = new FormData()
        formData.append("file", piUploadFile)
        formData.append("folder", "proforma-invoice")
        const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
        const uploadJson = await uploadRes.json()
        if (uploadJson.success) piUploadUrl = uploadJson.url
      }

      const response = await fetch("/api/otp-supabase/proforma-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.orderId || selectedOrder.id,
          piNumber: piNumber.trim(),
          piAmount,
          piUploadUrl,
          remark,
          createdBy: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsDialogOpen(false)
        setSelectedOrder(null)
        await fetchOrders()
        await fetchPaymentAgainstPiOrders()
        toast.success(`Order ${selectedOrder.orderNo} — Pro-Forma Invoice recorded. Awaiting Payment Against PI confirmation.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting proforma-invoice:", err)
      toast.error(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderCellContent = (order: any, columnKey: string) => {
    const value = order[columnKey]
    switch (columnKey) {
      case "actions":
        return (
          <Button
            size="sm"
            onClick={() => handleProcess(order)}
            className="h-7 px-2.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Process
          </Button>
        )
      case "actionsPayment":
        return (
          <Button
            size="sm"
            onClick={() => handleProcessPayment(order)}
            className="h-7 px-2.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Process
          </Button>
        )
      case "paymentReceived":
        return value ? <StatusBadge tone={value === "Yes" ? "success" : "warning"}>{value}</StatusBadge> : ""
      case "itemList":
        return (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-brand-700 hover:bg-accent"
            onClick={() => handleViewItemList(order)}
            title="View item list"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )
      case "piUpload":
        return order.piUploadUrl ? (
          <a href={order.piUploadUrl} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">View PI</StatusBadge>
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">N/A</span>
        )
      case "quotationCopy":
      case "acceptanceCopy":
        return value && (value.startsWith("http") || value.startsWith("https")) ? (
          <a href={value} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">View Link</StatusBadge>
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">{value || "N/A"}</span>
        )
      case "crmName":
        return value ? <StatusBadge tone="neutral">{value}</StatusBadge> : <span className="text-muted-foreground text-xs">-</span>
      case "amount":
      case "piAmount":
        return value ? `₹${Number(value).toLocaleString()}` : ""
      default:
        return value ?? ""
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading pro-forma invoice queue...</span>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">Error Loading Data</h1>
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

  const columnPanel =
    currentTab === "pending"
      ? { columns: pendingColumns, visible: visiblePendingColumns, toggle: togglePendingColumn, showAll: showAllPendingColumns, hideAll: hideAllPendingColumns }
      : currentTab === "payment-against-pi"
        ? {
            columns: paymentAgainstPiColumns,
            visible: visiblePaymentAgainstPiColumns,
            toggle: togglePaymentAgainstPiColumn,
            showAll: showAllPaymentAgainstPiColumns,
            hideAll: hideAllPaymentAgainstPiColumns,
          }
        : { columns: historyColumns, visible: visibleHistoryColumns, toggle: toggleHistoryColumn, showAll: showAllHistoryColumns, hideAll: hideAllHistoryColumns }

  const activeColumns = columnPanel.columns.filter((col) => columnPanel.visible[col.key])
  const currentData =
    currentTab === "pending"
      ? filteredOrders
      : currentTab === "payment-against-pi"
      ? filteredPaymentAgainstPiOrders
      : historyPageRows

  const activeChips = []
  if (searchTerm) {
    activeChips.push({
      key: "search",
      label: `Search: "${searchTerm}"`,
      onRemove: () => setSearchTerm(""),
    })
  }
  if (crmNameFilter && crmNameFilter !== "all") {
    activeChips.push({
      key: "crm",
      label: `CRM: ${crmNameFilter}`,
      onRemove: () => setCrmNameFilter("all"),
    })
  }

  const handleClearAllFilters = () => {
    setSearchTerm("")
    setCrmNameFilter("all")
  }

  return (
    <MainLayout fitViewport>
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        {/* One toolbar row; the table below fills the rest of the screen and scrolls inside its own card, so the page itself never scrolls. */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusTabs
            tabs={[
              { id: "pending", label: "Pending", count: filteredOrders.length },
              {
                id: "payment-against-pi",
                label: "Payment Against PI",
                count: filteredPaymentAgainstPiOrders.length,
              },
              { id: "history", label: "History", count: processedTotal },
            ]}
            activeTab={currentTab}
            onChange={(tab) => {
              setCurrentTab(tab)
              if (tab === "history") handleProcessedTabClick()
            }}
            variant="segmented"
          />
          <FilterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search order no, company, contact, quotation..."
            className="min-w-[220px] flex-1"
          />
          <div className="w-[180px]">
            <Select value={crmNameFilter} onValueChange={setCrmNameFilter}>
              <SelectTrigger className="h-9 text-xs border-input bg-card">
                <SelectValue placeholder="All CRM Names" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All CRM Names
                </SelectItem>
                {crmNameOptions.map((name) => (
                  <SelectItem key={name} value={name} className="text-xs">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={fetchOrders}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-medium border-input bg-card hover:bg-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <ColumnSelector
            options={columnPanel.columns}
            visible={columnPanel.visible}
            onToggle={columnPanel.toggle}
            onSelectAll={columnPanel.showAll}
            onHideAll={columnPanel.hideAll}
          />
        </div>

        <FilterChips chips={activeChips} onClearAll={handleClearAllFilters} className="-mt-1" />

        {/* Unified Enterprise DataTable */}
        <div className="flex-1 flex flex-col min-h-0">
          <DataTable
            headers={activeColumns.map((col) => ({
              key: col.key,
              label: col.label,
              minWidth:
                col.key === "actions" || col.key === "actionsPayment"
                  ? "90px"
                  : col.key === "itemList"
                  ? "70px"
                  : col.key === "companyName"
                  ? "220px"
                  : col.key === "billingAddress" || col.key === "shippingAddress"
                  ? "180px"
                  : "140px",
            }))}
            data={currentData}
            keyExtractor={(order, idx) => order.id || order.orderId || order.orderNo || idx}
            loading={
              currentTab === "payment-against-pi"
                ? paymentAgainstPiLoading
                : currentTab === "history"
                ? processedLoading
                : false
            }
            emptyTitle={
              searchTerm
                ? "No matching orders found"
                : currentTab === "pending"
                ? "No pending pro-forma invoices"
                : currentTab === "payment-against-pi"
                ? "No orders awaiting Payment Against PI"
                : "No processed history found"
            }
            emptyDescription={
              searchTerm ? "Try adjusting your search terms or clearing CRM filters." : undefined
            }
            simpleFooter={currentTab !== "history"}
            currentPage={historyPage}
            itemsPerPage={historyPageSize}
            totalResults={currentTab === "history" ? filteredProcessedOrders.length : undefined}
            totalPages={Math.ceil(processedTotal / historyPageSize) || 1}
            onPageChange={setHistoryPage}
            onItemsPerPageChange={(n) => { setHistoryPageSize(n); setHistoryPage(1) }}
            itemsPerPageOptions={[25, 50, 100, 200]}
            renderRow={(order) => (
              <TableRow
                key={order.id || order.orderId || order.orderNo}
                className="hover:bg-secondary/50 transition-colors"
              >
                {activeColumns.map((column) => (
                  <TableCell key={column.key} className="px-3.5 py-2 text-xs text-foreground align-middle">
                    {(() => {
                      const content = renderCellContent(order, column.key)
                      return typeof content === "string" ? (
                        <div className="max-w-[280px] truncate" title={content}>
                          {content}
                        </div>
                      ) : (
                        <div>{content}</div>
                      )
                    })()}
                  </TableCell>
                ))}
              </TableRow>
            )}
            renderCard={(order) => (
              <MobileRecordCard
                columns={columnPanel.columns}
                visibleColumns={columnPanel.visible}
                record={order}
                renderCellContent={renderCellContent}
              />
            )}
          />
        </div>

        {/* Process Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Process Pro-Forma Invoice</DialogTitle>
              <DialogDescription>Enter the Pro-Forma Invoice details for this order</DialogDescription>
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
                  <Label htmlFor="piNumber">PI Number *</Label>
                  <Input
                    id="piNumber"
                    value={piNumber}
                    onChange={(e) => setPiNumber(e.target.value)}
                    placeholder="Enter PI number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="piAmount">PI Amount *</Label>
                  <Input
                    id="piAmount"
                    type="number"
                    value={piAmount}
                    onChange={(e) => setPiAmount(e.target.value)}
                    placeholder="Enter PI amount"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="piUpload">PI Upload *</Label>
                <Input id="piUpload" type="file" onChange={(e) => setPiUploadFile(e.target.files?.[0] || null)} />
                {piUploadFile && <p className="text-sm text-muted-foreground">Selected: {piUploadFile.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remark">Remarks</Label>
                <Input id="remark" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Enter any remarks..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!piNumber.trim() || !piAmount || !piUploadFile || isSubmitting}
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

        {/* Payment Against PI Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Process Payment Against PI</DialogTitle>
              <DialogDescription>Confirm whether payment against this PI has been received</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentOrderNo">Order No.</Label>
                  <Input id="paymentOrderNo" value={selectedPaymentOrder?.orderNo || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentCompanyName">Company Name</Label>
                  <Input id="paymentCompanyName" value={selectedPaymentOrder?.companyName || ""} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentReceived">Payment Received *</Label>
                <Select value={paymentReceived} onValueChange={setPaymentReceived}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentReceived === "No" && (
                <div className="space-y-2">
                  <Label htmlFor="paymentRemark">Remarks *</Label>
                  <Input
                    id="paymentRemark"
                    value={paymentRemark}
                    onChange={(e) => setPaymentRemark(e.target.value)}
                    placeholder="Enter reason payment was not received..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitPayment}
                  disabled={!paymentReceived || (paymentReceived === "No" && !paymentRemark.trim()) || isSubmitting}
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
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Item List</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Description</TableHead>
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
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description || ""}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setItemListDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
