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
import { RefreshCw, Search, Eye, Banknote, ChevronLeft } from "lucide-react"
import { useStageList } from "@/hooks/use-stage-list"
import { filterByAccess } from "@/lib/access"
import { useAuth } from "@/components/auth-provider"
import { mapMakeInvoicePendingRowToUI, mapMakeInvoiceHistoryRowToUI } from "@/lib/otp-utils"
import { MobileRecordCard } from "@/components/mobile-record-card"
import { StatusTabs, ColumnSelector, FilterSearch, FilterChips, DataTable, StatusBadge } from "@/components/shared"
import { toast } from "sonner"

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
  { key: "totalQty", label: "Total Qty", searchable: true },
  { key: "pendingQty", label: "Pending Qty", searchable: true },
  { key: "amount", label: "Amount", searchable: true },
  { key: "sourceStage", label: "Source Stage", searchable: true },
  { key: "DeliveryNoteForInvoiceRequired", label: "Delivery Note", searchable: true },
  { key: "calibrationRequired", label: "Calibration Required", searchable: true },
  { key: "calibrationType", label: "Calibration Type", searchable: true },
  { key: "transportId", label: "Transport Id/Name", searchable: true },
  { key: "gstNumber", label: "GST Number", searchable: true },
  { key: "vehicleNumber", label: "Vehicle Number", searchable: true },
  { key: "dispatchLocation", label: "Dispatch Location", searchable: true },
  { key: "directDispatchDetails", label: "Direct Dispatch Details", searchable: true },
  { key: "paymentAttachment", label: "Payment Details (Attachment) - In case of Advance", searchable: false },
  { key: "srnAttachment", label: "SRN Attachment", searchable: false },
  { key: "remarks", label: "Remarks", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
  { key: "accessories", label: "Accessories", searchable: true },
  { key: "planned", label: "Planned", searchable: true },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions" && col.key !== "totalQty" && col.key !== "pendingQty"),
  { key: "invoiceNumber", label: "Invoice Number", searchable: true },
  { key: "invoiceDate", label: "Invoice Date", searchable: true },
  { key: "invoiceUpload", label: "Invoice Upload", searchable: false },
  { key: "ewayBillNumber", label: "Eway Bill Number", searchable: true },
  { key: "ewayBillUpload", label: "Eway Bill Upload", searchable: false },
  { key: "totalBillAmount", label: "Total Bill Amount", searchable: false },
  { key: "createdBy", label: "Created By", searchable: true },
  { key: "invoicedAt", label: "Invoiced At", searchable: true },
  { key: "actual", label: "Actual", searchable: true },
]

// Offer Show / Conveyed For Registration Form have no backing DB column
// (same as order-acceptable, which this page's columns mirror) so are
// always blank; Source Stage / Delivery Note are internal routing fields, not
// requested for display. All hidden by default, still toggleable.
const DEFAULT_HIDDEN_COLUMNS = new Set(["offerShow", "conveyedForRegistration", "sourceStage", "DeliveryNoteForInvoiceRequired"])

export default function MakeInvoicePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([])
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user: currentUser } = useAuth()
  const {
    currentTab,
    setCurrentTab,
    tabs,
    searchTerm,
    setSearchTerm,
    crmNameFilter,
    setCrmNameFilter,
    crmNameOptions,
    activeChips,
    handleClearAllFilters,
    filteredPendingRows: filteredOrders,
    historyPage,
    setHistoryPage,
    historyPageSize,
    setHistoryPageSize,
    columnPanel,
    activeColumns,
    activeRows,
    historyTotal,
    historyTotalPages,
    history,
  } = useStageList({
    pendingRows: orders,
    serverHistory: { url: "/api/otp-supabase/make-invoice?status=history", map: mapMakeInvoiceHistoryRowToUI },
    pendingColumns,
    historyColumns,
    currentUser,
    defaultHiddenColumns: DEFAULT_HIDDEN_COLUMNS,
  })
  // History is fetched a page at a time by the hook; these keep the page's older names.
  const processedOrders = history.rows
  const processedLoading = history.loading
  const fetchProcessedOrders = history.reload

  // Credit Note — invoice-picker modal launched from this page's header
  // (see app/api/otp-supabase/credit-note/route.ts's `?view=invoices`).
  const [creditNoteOpen, setCreditNoteOpen] = useState(false)
  const [creditNoteStep, setCreditNoteStep] = useState<"grid" | "items">("grid")
  const [creditNoteLoading, setCreditNoteLoading] = useState(false)
  const [creditNoteCards, setCreditNoteCards] = useState<any[]>([])
  const [creditNoteSearch, setCreditNoteSearch] = useState("")
  const [selectedCard, setSelectedCard] = useState<any>(null)
  const [creditNoteChecked, setCreditNoteChecked] = useState<Record<number, boolean>>({})
  const [creditNoteQty, setCreditNoteQty] = useState<Record<number, string>>({})
  const [creditNoteSubmitting, setCreditNoteSubmitting] = useState(false)

  const openCreditNote = async () => {
    setCreditNoteOpen(true)
    setCreditNoteStep("grid")
    setSelectedCard(null)
    setCreditNoteLoading(true)
    try {
      const res = await fetch("/api/otp-supabase/credit-note?view=invoices")
      const json = await res.json()
      setCreditNoteCards(json.success ? json.data : [])
    } catch (err) {
      console.error("Error loading invoices for Credit Note:", err)
      setCreditNoteCards([])
    } finally {
      setCreditNoteLoading(false)
    }
  }

  const filteredCreditNoteCards = useMemo(() => {
    const visible = filterByAccess(creditNoteCards, currentUser)
    if (!creditNoteSearch) return visible
    const q = creditNoteSearch.toLowerCase()
    return visible.filter(
      (c) =>
        c.invoiceNumber.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q) ||
        c.orderNos.some((o: string) => o.toLowerCase().includes(q)) ||
        c.poNumbers.some((p: string) => p.toLowerCase().includes(q))
    )
  }, [creditNoteCards, creditNoteSearch, currentUser])

  const openCreditNoteItems = (card: any) => {
    setSelectedCard(card)
    setCreditNoteStep("items")
    setCreditNoteChecked({})
    setCreditNoteQty(Object.fromEntries(card.items.map((it: any, idx: number) => [idx, String(it.remaining_qty)])))
  }

  const handleSubmitCreditNote = async () => {
    if (!selectedCard) return
    const selectedItems = selectedCard.items
      .map((it: any, idx: number) => ({ ...it, qty: Number(creditNoteQty[idx]) || 0, _checked: creditNoteChecked[idx] }))
      .filter((it: any) => it._checked)
    if (selectedItems.length === 0) {
      toast.error("Select at least one item.")
      return
    }
    setCreditNoteSubmitting(true)
    try {
      const res = await fetch("/api/otp-supabase/credit-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: selectedCard.invoiceNumber,
          companyName: selectedCard.companyName,
          poNumber: selectedCard.poNumbers[0] || "",
          crmName: selectedCard.crmName,
          items: selectedItems.map((it: any) => ({
            order_id: it.order_id,
            order_no: it.order_no,
            make_invoice_id: it.make_invoice_id,
            item_code: it.item_code,
            item_name: it.item_name,
            qty: it.qty,
          })),
          createdBy: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to create Credit Note")
      toast.success(`Credit Note created for invoice ${selectedCard.invoiceNumber} — find it in Credit Note's Pending tab.`)
      setCreditNoteOpen(false)
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setCreditNoteSubmitting(false)
    }
  }

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

  useEffect(() => {
    fetchOrders()
  }, [])

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

  // Multi-wave billing: several pending waves of ONE order -> one invoice
  // (merged server-side — see otp_merge_queue_waves).
  const selectedWaveRows = filteredOrders.filter((o) => selectedQueueIds.includes(o.queueId))
  const selectedOrderId = selectedWaveRows[0]?.orderId
  const toggleWave = (order: any) =>
    setSelectedQueueIds((prev) =>
      prev.includes(order.queueId) ? prev.filter((x) => x !== order.queueId) : [...prev, order.queueId]
    )
  const handleProcessSelected = () => {
    if (selectedWaveRows.length < 2) return
    handleProcess({
      ...selectedWaveRows[0],
      rawItems: selectedWaveRows.flatMap((r) => r.rawItems || []),
      mergeIds: selectedWaveRows.slice(1).map((r) => r.queueId),
    })
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
      toast.error("Invoice Number, Invoice Date, Total Bill Amount and Invoice Upload are required")
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
          mergeIds: selectedOrder.mergeIds || [],
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
        setSelectedQueueIds([])
        await fetchOrders()
        toast.success(`Order ${selectedOrder.orderNo} — Invoice ${invoiceNumber.trim()} created.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting make-invoice:", err)
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
          <div className="flex items-center gap-1.5">
            <Checkbox
              aria-label="Select wave for one combined invoice"
              checked={selectedQueueIds.includes(order.queueId)}
              disabled={!!selectedOrderId && selectedOrderId !== order.orderId}
              onCheckedChange={() => toggleWave(order)}
            />
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              onClick={() => handleProcess(order)}
            >
              Process
            </Button>
          </div>
        )
      case "itemList":
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 gap-1 text-xs border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
            onClick={() => handleViewItemList(order)}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Items</span>
          </Button>
        )
      case "invoiceUpload":
        return order.invoiceUploadUrl ? (
          <a href={order.invoiceUploadUrl} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">Link</StatusBadge>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )
      case "ewayBillUpload":
        return order.ewayBillUploadUrl ? (
          <a href={order.ewayBillUploadUrl} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">Link</StatusBadge>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )
      case "paymentAttachment":
        return order.paymentAttachmentUrl ? (
          <a href={order.paymentAttachmentUrl} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">Link</StatusBadge>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )
      case "srnAttachment":
        return order.srnAttachmentUrl ? (
          <a href={order.srnAttachmentUrl} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">Link</StatusBadge>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )
      case "billingAddress":
      case "shippingAddress":
        return (
          <div className="max-w-[200px] truncate text-xs" title={value}>
            {value}
          </div>
        )
      case "quotationCopy":
      case "acceptanceCopy":
        return value && (value.startsWith("http") || value.startsWith("https")) ? (
          <a href={value} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">Link</StatusBadge>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">{value || "N/A"}</span>
        )
      case "totalBillAmount":
        return value ? `₹${Number(value).toLocaleString()}` : ""
      case "sourceStage":
        return <StatusBadge tone="neutral">{value || "N/A"}</StatusBadge>
      case "DeliveryNoteForInvoiceRequired":
      case "calibrationRequired":
        return value ? (
          <StatusBadge tone={value === "YES" ? "warning" : "success"}>
            {value}
          </StatusBadge>
        ) : (
          ""
        )
      default:
        return value ?? ""
    }
  }

  const handleTabChange = (val: string) => {
    setCurrentTab(val)
  }

  const handleRefresh = () => {
    fetchOrders()
    if (currentTab === "history" || processedOrders.length > 0) {
      fetchProcessedOrders()
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

  return (
    <MainLayout fitViewport>
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        {/* One toolbar row; the table below fills the rest of the screen and scrolls inside its own card, so the page itself never scrolls. */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusTabs
            tabs={tabs}
            activeTab={currentTab}
            onChange={handleTabChange}
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
          {currentTab === "pending" && selectedWaveRows.length >= 2 && (
            <Button
              onClick={handleProcessSelected}
              size="sm"
              className="h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              One invoice for {selectedWaveRows.length} waves ({selectedWaveRows[0].orderNo})
            </Button>
          )}
          {currentTab === "pending" && selectedQueueIds.length > 0 && (
            <Button
              onClick={() => setSelectedQueueIds([])}
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear selection ({selectedQueueIds.length})
            </Button>
          )}
          <Button
            onClick={openCreditNote}
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs font-medium border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <Banknote className="h-3.5 w-3.5" />
            <span>Credit Note</span>
          </Button>
          <Button
            onClick={handleRefresh}
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
                col.key === "actions"
                  ? "90px"
                  : col.key === "itemList"
                  ? "75px"
                  : col.key === "companyName"
                  ? "220px"
                  : col.key === "orderNo"
                  ? "120px"
                  : col.key === "quotationNo"
                  ? "130px"
                  : col.key === "contactPersonName"
                  ? "160px"
                  : col.key === "totalBillAmount" || col.key === "amount"
                  ? "130px"
                  : "140px",
            }))}
            data={activeRows}
            keyExtractor={(order, idx) => order.id || order.queueId || order.orderId || order.orderNo || idx}
            loading={currentTab === "history" ? processedLoading : false}
            emptyTitle={
              searchTerm
                ? "No matching records found"
                : currentTab === "pending"
                ? "No pending make-invoice waves"
                : "No processed orders found"
            }
            emptyDescription={
              searchTerm ? "Try adjusting your search terms or clearing CRM filters." : undefined
            }
            simpleFooter={currentTab === "pending"}
            currentPage={historyPage}
            itemsPerPage={historyPageSize}
            totalResults={currentTab === "pending" ? undefined : historyTotal}
            totalPages={historyTotalPages}
            onPageChange={setHistoryPage}
            onItemsPerPageChange={(n) => { setHistoryPageSize(n); setHistoryPage(1) }}
            itemsPerPageOptions={[25, 50, 100, 200]}
            renderRow={(order) => (
              <TableRow
                key={order.id || order.queueId || order.orderId || order.orderNo}
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
              <DialogTitle>Process Make Invoice</DialogTitle>
              <DialogDescription>Enter the invoice details for this order&apos;s available quantity</DialogDescription>
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
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
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
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setItemListDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Credit Note — invoice picker (step "grid") then item/qty
            selection (step "items"). Ledger-strip visual treatment,
            distinct from the rest of the app — see Database/60_credit_note.sql
            and app/api/otp-supabase/credit-note/route.ts. */}
        <Dialog open={creditNoteOpen} onOpenChange={setCreditNoteOpen}>
          <DialogContent
            className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0"
            style={{ background: "#FAF8F5" }}
          >
            {creditNoteStep === "grid" ? (
              <>
                <DialogHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "#E4DED8" }}>
                  <DialogTitle className="text-xl" style={{ color: "#241F1D" }}>
                    Credit Note
                  </DialogTitle>
                  <DialogDescription style={{ color: "#5B6168" }}>
                    Pick an invoice to issue a credit against. Only invoices with something left to credit are listed.
                  </DialogDescription>
                </DialogHeader>
                <div className="px-6 pt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#5B6168" }} />
                    <Input
                      placeholder="Search invoice no., order no., company, PO..."
                      value={creditNoteSearch}
                      onChange={(e) => setCreditNoteSearch(e.target.value)}
                      className="pl-10 bg-white"
                      style={{ borderColor: "#E4DED8" }}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {creditNoteLoading ? (
                    <div className="flex items-center justify-center py-16" style={{ color: "#5B6168" }}>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Loading invoices...
                    </div>
                  ) : filteredCreditNoteCards.length === 0 ? (
                    <div className="text-center py-16" style={{ color: "#5B6168" }}>
                      Nothing left to credit.
                    </div>
                  ) : (
                    filteredCreditNoteCards.map((card) => (
                      <button
                        key={card.invoiceNumber}
                        type="button"
                        onClick={() => openCreditNoteItems(card)}
                        className="w-full text-left bg-white hover:shadow-md transition-shadow rounded-r-md overflow-hidden flex"
                        style={{
                          borderTop: "1px solid #E4DED8",
                          borderRight: "1px solid #E4DED8",
                          borderBottom: "1px solid #E4DED8",
                        }}
                      >
                        {/* Perforated stub edge — a credit note is a tear-off against an invoice */}
                        <div
                          className="w-2 shrink-0"
                          style={{
                            background: "repeating-linear-gradient(to bottom, #7A2E3B 0 6px, transparent 6px 12px)",
                          }}
                        />
                        <div className="flex-1 px-5 py-4 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono text-base font-semibold" style={{ color: "#241F1D" }}>
                                {card.invoiceNumber}
                              </span>
                              {card.invoiceDate && (
                                <span className="text-xs font-mono" style={{ color: "#5B6168" }}>
                                  {new Date(card.invoiceDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-0.5 truncate" style={{ color: "#241F1D" }}>
                              {card.companyName}
                            </p>
                            <p className="text-xs mt-0.5 truncate" style={{ color: "#5B6168" }}>
                              Order {card.orderNos.join(", ")}
                              {card.poNumbers.length > 0 ? ` · PO ${card.poNumbers.join(", ")}` : ""}
                            </p>
                          </div>
                          <span
                            className="text-xs font-medium px-2.5 py-1 rounded-sm shrink-0"
                            style={{ background: "#F4E7E9", color: "#7A2E3B" }}
                          >
                            {card.items.filter((it: any) => it.remaining_qty > 0).length} item(s) creditable
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <DialogHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "#E4DED8" }}>
                  <button
                    type="button"
                    onClick={() => setCreditNoteStep("grid")}
                    className="flex items-center gap-1 text-sm mb-1"
                    style={{ color: "#7A2E3B" }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    All invoices
                  </button>
                  <DialogTitle className="text-xl font-mono" style={{ color: "#241F1D" }}>
                    {selectedCard?.invoiceNumber}
                  </DialogTitle>
                  <DialogDescription style={{ color: "#5B6168" }}>
                    {selectedCard?.companyName} — select items and the qty to credit.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow style={{ borderColor: "#E4DED8" }}>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right font-mono">Invoiced</TableHead>
                        <TableHead className="text-right font-mono">Remaining</TableHead>
                        <TableHead className="text-right w-28">Credit Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedCard?.items || []).map((it: any, idx: number) => {
                        const disabled = it.remaining_qty <= 0
                        return (
                          <TableRow key={idx} style={{ borderColor: "#E4DED8", opacity: disabled ? 0.45 : 1 }}>
                            <TableCell>
                              <Checkbox
                                checked={!!creditNoteChecked[idx]}
                                disabled={disabled}
                                onCheckedChange={(c) => setCreditNoteChecked((prev) => ({ ...prev, [idx]: c === true }))}
                              />
                            </TableCell>
                            <TableCell>
                              <div style={{ color: "#241F1D" }}>{it.item_name}</div>
                              {it.order_no && (
                                <div className="text-xs" style={{ color: "#5B6168" }}>
                                  Order {it.order_no}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono" style={{ color: "#5B6168" }}>
                              {it.invoiced_qty}
                            </TableCell>
                            <TableCell className="text-right font-mono" style={{ color: "#5B6168" }}>
                              {it.remaining_qty}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={1}
                                max={it.remaining_qty}
                                disabled={disabled || !creditNoteChecked[idx]}
                                value={creditNoteQty[idx] ?? ""}
                                onChange={(e) => setCreditNoteQty((prev) => ({ ...prev, [idx]: e.target.value }))}
                                className="w-20 ml-auto text-right font-mono"
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E4DED8" }}>
                  <Button variant="outline" onClick={() => setCreditNoteStep("grid")}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitCreditNote}
                    disabled={creditNoteSubmitting}
                    className="text-white"
                    style={{ background: "#7A2E3B" }}
                  >
                    {creditNoteSubmitting ? "Creating..." : "Make Credit Note"}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
