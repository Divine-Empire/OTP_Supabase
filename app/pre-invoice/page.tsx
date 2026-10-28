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
import { RefreshCw, Eye, Plus, Trash2 } from "lucide-react"
import { useStageList } from "@/hooks/use-stage-list"
import { useAuth } from "@/components/auth-provider"
import { mapPreInvoiceRowToUI } from "@/lib/otp-utils"
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
  { key: "sourceStage", label: "Source Stage", searchable: true },
  { key: "totalQty", label: "Total Qty", searchable: true },
  { key: "pendingQty", label: "Pending Qty", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
  { key: "accessories", label: "Accessories", searchable: true },
  { key: "planned", label: "Planned", searchable: false },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "actual", label: "Actual", searchable: true },
  { key: "paymentMode", label: "Payment Mode", searchable: true },
  { key: "calibrationRequired", label: "Calibration Required", searchable: true },
  { key: "calibrationType", label: "Calibration Type", searchable: true },
  { key: "DeliveryNoteForInvoiceRequired", label: "Delivery Note (Inv.) Required", searchable: true },
  { key: "transportId", label: "Transport Id/Name", searchable: true },
  { key: "gstNumber", label: "GST Number", searchable: true },
  { key: "vehicleNumber", label: "Vehicle Number", searchable: true },
  { key: "dispatchLocation", label: "Dispatch Location", searchable: true },
  { key: "directDispatchDetails", label: "Direct Dispatch Details", searchable: true },
  { key: "paymentAttachment", label: "Payment Attachment", searchable: false },
  { key: "srnAttachment", label: "SRN Attachment", searchable: false },
  { key: "releasedStockReasons", label: "Qty Released / Reason", searchable: true },
  { key: "remarks", label: "Remarks", searchable: true },
  { key: "createdBy", label: "Created By", searchable: true },
  { key: "invoicedAt", label: "Invoiced At", searchable: true },
]

// One row per physical unit for serialized items (see packing-list's
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [srnAttachmentFile, setSrnAttachmentFile] = useState<File | null>(null)
  const [calibrationRequired, setCalibrationRequired] = useState("")
  const [calibrationType, setCalibrationType] = useState("")
  const [DeliveryNoteForInvoiceRequired, setDeliveryNoteForInvoiceRequired] = useState("")
  const [transportId, setTransportId] = useState("")
  const [gstNumber, setGstNumber] = useState("")
  const [vehicleNumber, setVehicleNumber] = useState("")
  const [dispatchLocation, setDispatchLocation] = useState("")
  const [directDispatchDetails, setDirectDispatchDetails] = useState("")
  const [paymentAttachmentFile, setPaymentAttachmentFile] = useState<File | null>(null)
  const [preInvoiceRemarks, setPreInvoiceRemarks] = useState("")
  const [items, setItems] = useState<PreInvoiceItemRow[]>([])
  // Reason text per item_name (lowercase-trim key), required whenever that
  // item's edited total drops below what Check Inventory originally queued
  // — see Database/55_otp_released_stock.sql.
  const [reductionReasons, setReductionReasons] = useState<Record<string, string>>({})
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([])
  const [editItemsOrder, setEditItemsOrder] = useState<any>(null)
  const [editItemsQty, setEditItemsQty] = useState<Record<string, string>>({})
  const [editItemsReasons, setEditItemsReasons] = useState<Record<string, string>>({})
  const [dispatchLocationOptions, setDispatchLocationOptions] = useState<string[]>([])
  const [paymentModeOptions, setPaymentModeOptions] = useState<string[]>([])
  const [paymentMode, setPaymentMode] = useState("")
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
    serverHistory: { url: "/api/otp-supabase/pre-invoice?status=history", map: mapPreInvoiceRowToUI },
    pendingColumns,
    historyColumns,
    currentUser,
  })
  // History is fetched a page at a time by the hook; these keep the page's older names.
  const processedOrders = history.rows
  const processedLoading = history.loading
  const loadProcessedOrders = history.reload

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

  const handleProcess = (order: any) => {
    setSelectedOrder(order)
    setCalibrationRequired("")
    setCalibrationType("")
    setDeliveryNoteForInvoiceRequired("")
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
    setReductionReasons({})
    setIsDialogOpen(true)
  }

  // Sums item rows by item_name (lowercase-trim) — PreInvoiceItemRow explodes
  // one queued {item_name, qty} into several per-serial rows, so the
  // per-name total has to be summed across however many rows share a name.
  const sumQtyByName = (rows: { name: string; qty: number }[]) => {
    const totals = new Map<string, number>()
    for (const r of rows) {
      const key = (r.name || "").trim().toLowerCase()
      if (!key) continue
      totals.set(key, (totals.get(key) || 0) + (Number(r.qty) || 0))
    }
    return totals
  }

  const originalQtyByName = useMemo(
    () => sumQtyByName(expandQueueItemsToRows(selectedOrder?.rawItems || [])),
    [selectedOrder]
  )
  const currentQtyByName = useMemo(() => sumQtyByName(items), [items])
  const reducedNames = useMemo(() => {
    const names = new Set<string>()
    for (const [key, originalQty] of originalQtyByName.entries()) {
      if ((currentQtyByName.get(key) || 0) < originalQty) names.add(key)
    }
    return names
  }, [originalQtyByName, currentQtyByName])

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

    if (!DeliveryNoteForInvoiceRequired) {
      toast.error("Please select whether Delivery Note (Inv.) is required.")
      return
    }

    const missingReasons = Array.from(reducedNames).filter((key) => !reductionReasons[key]?.trim())
    if (missingReasons.length > 0) {
      toast.error("Please enter a reason for every item whose qty was reduced below what was queued.")
      return
    }

    setIsSubmitting(true)
    try {
      // Independent uploads — run concurrently instead of one after the other.
      const uploadOne = async (file: File | null, folder: string): Promise<string> => {
        if (!file) return ""
        const formData = new FormData()
        formData.append("file", file)
        formData.append("folder", folder)
        const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
        const uploadJson = await uploadRes.json()
        return uploadJson.success ? uploadJson.url : ""
      }

      const [paymentAttachmentUrl, srnAttachmentUrl] = await Promise.all([
        uploadOne(paymentAttachmentFile, "pre-invoice-payment"),
        uploadOne(srnAttachmentFile, "pre-invoice-srn"),
      ])

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
          DeliveryNoteForInvoiceRequired,
          reductionReasons,
          mergeIds: selectedOrder.mergeIds || [],
        }),
      })
      const result = await response.json()

      if (result.success) {
        // Items marked Installation=Yes get their sss_service_installation rows
        // (and SI numbers) from the DB trigger on this submit — see
        // Database/81_sss_service_installation_auto_sync.sql.
        setIsDialogOpen(false)
        setSelectedOrder(null)
        setSelectedQueueIds([])
        await fetchOrders()
        toast.success(`Order ${selectedOrder.orderNo} moved to Pre-Invoice History`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting pre-invoice:", err)
      toast.error(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Multi-wave billing: several pending waves of ONE order processed as one
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

  // Edit Items (pending only, reduce-only) — totals per item name
  const openEditItems = (order: any) => {
    const totals: Record<string, number> = {}
    for (const it of order.rawItems || []) totals[it.item_name] = (totals[it.item_name] || 0) + (Number(it.qty) || 0)
    setEditItemsOrder({ ...order, originalTotals: totals })
    setEditItemsQty(Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, String(v)])))
    setEditItemsReasons({})
  }
  const editItemsReduced = editItemsOrder
    ? Object.entries(editItemsOrder.originalTotals as Record<string, number>).filter(
        ([name, orig]) => (Number(editItemsQty[name]) || 0) < orig
      )
    : []
  const handleSaveEditItems = async () => {
    if (editItemsReduced.some(([name]) => !editItemsReasons[name.trim().toLowerCase()]?.trim())) {
      toast.error("Please enter a reason for every item whose qty was reduced.")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/otp-supabase/pre-invoice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editItemsOrder.queueId,
          items: Object.entries(editItemsQty).map(([item_name, qty]) => ({ item_name, qty: Number(qty) })),
          reductionReasons: editItemsReasons,
          editedBy: currentUser?.fullName || currentUser?.username || "Unknown",
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Update failed")
      setEditItemsOrder(null)
      await fetchOrders()
    } catch (err: any) {
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
              aria-label="Select wave for combined billing"
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
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs border-input bg-card hover:bg-accent"
              onClick={() => openEditItems(order)}
            >
              Edit Items
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
      case "paymentAttachment":
        return order.paymentAttachmentUrl ? (
          <a href={order.paymentAttachmentUrl} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">
              Link
            </StatusBadge>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )
      case "srnAttachment":
        return order.srnAttachmentUrl ? (
          <a href={order.srnAttachmentUrl} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">
              Link
            </StatusBadge>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )
      case "sourceStage":
        return <StatusBadge tone="neutral">{value || "N/A"}</StatusBadge>
      case "releasedStockReasons": {
        const released = order.releasedStockReasons || []
        if (released.length === 0) return <span className="text-muted-foreground">-</span>
        return (
          <div className="space-y-0.5">
            {released.map((r: any, idx: number) => (
              <p key={idx} className="text-xs text-foreground font-medium">
                {r.item_name}: -{r.qty_released} ({r.reason})
              </p>
            ))}
          </div>
        )
      }
      case "calibrationRequired":
      case "DeliveryNoteForInvoiceRequired":
        return value ? (
          <StatusBadge tone={value === "YES" ? "success" : "neutral"}>
            {value}
          </StatusBadge>
        ) : ""
      case "paymentMode":
        return formatPaymentModeLabel(value)
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
      loadProcessedOrders()
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
        {/* One toolbar row (tabs, search, CRM filter, actions); the table below fills the rest of the
            screen and scrolls inside its own card, so the page itself never scrolls. */}
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
            Process {selectedWaveRows.length} waves ({selectedWaveRows[0].orderNo})
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
                  ? "170px"
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
                  : col.key === "releasedStockReasons" || col.key === "remarks" || col.key === "directDispatchDetails"
                  ? "200px"
                  : "130px",
            }))}
            data={activeRows}
            keyExtractor={(order, idx) => order.id || order.queueId || order.orderId || order.orderNo || idx}
            loading={currentTab === "history" ? processedLoading : false}
            emptyTitle={
              searchTerm
                ? "No matching orders found"
                : currentTab === "pending"
                ? "No pending pre-invoice orders"
                : "No processed history found"
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

        {/* Edit Items Dialog (pending only, reduce-only) */}
        <Dialog open={!!editItemsOrder} onOpenChange={(open) => !open && setEditItemsOrder(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Edit Items — {editItemsOrder?.orderNo}</DialogTitle>
              <DialogDescription>
                Qty can only be reduced (not above what Packing List found). A reduced qty needs a reason and becomes
                released stock other orders can use.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-3">
              {editItemsOrder &&
                Object.entries(editItemsOrder.originalTotals as Record<string, number>).map(([name, orig]) => {
                  const reduced = (Number(editItemsQty[name]) || 0) < orig
                  const key = name.trim().toLowerCase()
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm font-normal">{name}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={orig}
                            className="w-20 text-right"
                            value={editItemsQty[name] ?? ""}
                            onChange={(e) => setEditItemsQty((prev) => ({ ...prev, [name]: e.target.value }))}
                          />
                          <span className="text-xs text-muted-foreground w-10">/ {orig}</span>
                        </div>
                      </div>
                      {reduced && (
                        <Input
                          placeholder="Reason for reducing qty (required)"
                          value={editItemsReasons[key] || ""}
                          onChange={(e) => setEditItemsReasons((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                      )}
                    </div>
                  )
                })}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditItemsOrder(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditItems} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Process Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Process Pre-Invoice</DialogTitle>
              <DialogDescription>Enter the dispatch details for this order&apos;s available quantity</DialogDescription>
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

              {/* Row 1: Calibration Required, Dispatch Location, Delivery Note (Inv.) Required */}
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
                  <Label htmlFor="DeliveryNoteForInvoiceRequired">Delivery Note (Inv.) Required</Label>
                  <Select value={DeliveryNoteForInvoiceRequired} onValueChange={setDeliveryNoteForInvoiceRequired}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YES">YES</SelectItem>
                      <SelectItem value="NO">NO</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    YES sends this order to Delivery Note (Inv.) first; NO skips straight to Make Invoice.
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
                        <SelectItem value="Survey Instruments">Survey Instruments</SelectItem>
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
                    No items added. Click &quot;Add Item&quot; to begin.
                  </div>
                )}
              </div>

              {reducedNames.size > 0 && (
                <div className="space-y-2 border border-warning/40 bg-warning/10 rounded-md p-3">
                  <p className="text-sm font-medium text-foreground">
                    Qty reduced below what was queued — a reason is required (the freed qty becomes visible to
                    other pending orders needing the same item):
                  </p>
                  {Array.from(reducedNames).map((key) => {
                    const label = items.find((it) => it.name.trim().toLowerCase() === key)?.name || key
                    return (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          value={reductionReasons[key] || ""}
                          onChange={(e) => setReductionReasons((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder="Reason for reducing qty (required)"
                          className="h-9"
                        />
                      </div>
                    )
                  })}
                </div>
              )}

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
      </div>
    </MainLayout>
  )
}
