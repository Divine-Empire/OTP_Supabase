"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Eye } from "lucide-react"
import { useStageList } from "@/hooks/use-stage-list"
import { useAuth } from "@/components/auth-provider"
import { mapPackagingTransportPendingRowToUI, mapPackagingTransportHistoryRowToUI } from "@/lib/otp-utils"
import { getSectionForMode, isReceivingSection, isBiltyRequired, FIELD_DEFS, type FieldKey } from "@/lib/dispatch-mode"
import { MobileRecordCard } from "@/components/mobile-record-card"
import { StatusTabs, ColumnSelector, FilterSearch, FilterChips, DataTable, StatusBadge } from "@/components/shared"
import { toast } from "sonner"

// Column definitions for Pending tab
const pendingColumns = [
  { key: "actions", label: "Actions", searchable: false },
  { key: "draftStatus", label: "Status", searchable: false },
  { key: "timestamp", label: "Timestamp", searchable: true },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "quotationNo", label: "Quotation No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "crmName", label: "CRM Name", searchable: true },
  { key: "contactPersonName", label: "Contact Person Name", searchable: true },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "invoiceNumber", label: "Invoice Number", searchable: true },
  { key: "invoiceCopy", label: "Invoice Copy", searchable: false },
  { key: "invoiceDate", label: "Invoice Date", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
  { key: "accessories", label: "Accessories", searchable: true },
  { key: "planned", label: "Planned", searchable: true },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions" && col.key !== "draftStatus"),
  { key: "beforePhoto", label: "Before Photo", searchable: false },
  { key: "afterPhoto", label: "After Photo", searchable: false },
  { key: "transportMode", label: "Transport Mode", searchable: true },
  { key: "modeDetails", label: "Mode Details", searchable: true },
  { key: "expenseAmount", label: "Freight/Fare", searchable: false },
  { key: "freightCharge", label: "Freight Charge", searchable: false },
  { key: "hamaliCharge", label: "Hamali Charge", searchable: false },
  { key: "parkingCharge", label: "Parking Charge", searchable: false },
  { key: "biltyUpload", label: "Bilty / Docket", searchable: false },
  { key: "transporterRemarks", label: "Remarks", searchable: true },
  { key: "dispatchStatus", label: "Dispatch Status", searchable: false },
  { key: "notOkReason", label: "Reason for Not Okay", searchable: true },
  { key: "receivingCopy", label: "Receiving's Copy", searchable: false },
  { key: "createdBy", label: "Created By", searchable: true },
  { key: "actual", label: "Actual", searchable: true },
]

// Only Timestamp, Order No., Quotation No., Company Name, Contact Person
// Name, Contact Number, Invoice Number, Invoice Copy, Invoice Date are
// shown by default -- everything else is still toggleable via Column
// Visibility, just hidden by default. draftStatus ("Status") is left out of
// this set deliberately -- it's operational furniture (like Actions), not
// one of the enumerated data columns.
const DEFAULT_HIDDEN_COLUMNS = new Set([
  "crmName",
  "itemList",
  "beforePhoto",
  "afterPhoto",
  "modeDetails",
  "expenseAmount",
  "freightCharge",
  "hamaliCharge",
  "parkingCharge",
  "transporterRemarks",
  "dispatchStatus",
  "notOkReason",
  "createdBy",
])

async function uploadFiles(files: File[], folder: string): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", folder)
    const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
    const uploadJson = await uploadRes.json()
    if (uploadJson.success) urls.push(uploadJson.url)
  }
  return urls
}

export default function PackagingTransportPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const [beforePhotoFiles, setBeforePhotoFiles] = useState<File[]>([])
  const [afterPhotoFiles, setAfterPhotoFiles] = useState<File[]>([])
  // Already-saved photo URLs from a prior "Save Photos" draft (see
  // Database/39_packaging_transport_draft_save.sql) — shown as a preview
  // instead of a re-upload input; new selections above are appended to
  // these on save.
  const [existingBeforePhotoUrls, setExistingBeforePhotoUrls] = useState<string[]>([])
  const [existingAfterPhotoUrls, setExistingAfterPhotoUrls] = useState<string[]>([])
  const [isSavingPhotos, setIsSavingPhotos] = useState(false)
  const [transportMode, setTransportMode] = useState("")
  const [transportModeOptions, setTransportModeOptions] = useState<string[]>([])
  const [receivingCopyFile, setReceivingCopyFile] = useState<File | null>(null)
  const [existingReceivingCopyUrl, setExistingReceivingCopyUrl] = useState("")
  // Every section's non-file fields live in one generic map, keyed by the
  // shared FieldKey concept (driver_name, reference_no, ...) — see
  // lib/dispatch-mode.ts's FIELD_DEFS. expense_amount also lives here
  // ("Freight"/"Fare" depending on section).
  const [fieldValues, setFieldValues] = useState<Partial<Record<FieldKey, string>>>({})
  // Bilty section (what the removed Bilty Upload stage used to collect,
  // Database/65_remove_bilty_upload_stage.sql). Freight Charge + at least one
  // Bilty/Docket file are mandatory unless the mode is a receiving one.
  const [freightCharge, setFreightCharge] = useState("")
  const [hamaliCharge, setHamaliCharge] = useState("")
  const [parkingCharge, setParkingCharge] = useState("")
  const [biltyFiles, setBiltyFiles] = useState<File[]>([])
  const [existingBiltyUrls, setExistingBiltyUrls] = useState<string[]>([])
  const [transporterRemarks, setTransporterRemarks] = useState("")
  const [dispatchStatus, setDispatchStatus] = useState("okay")
  const [notOkReason, setNotOkReason] = useState("")

  // Transport Mode decides which section (and which fields) the form shows
  // below it — see lib/dispatch-mode.ts.
  const section = getSectionForMode(transportMode)
  const isReceivingPath = isReceivingSection(section)
  const sectionFields = FIELD_DEFS[section] || []
  const biltyRequired = isBiltyRequired(section)
  const setFieldValue = (key: FieldKey, value: string) => setFieldValues((prev) => ({ ...prev, [key]: value }))

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
    serverHistory: { url: "/api/otp-supabase/packaging-transport?status=history", map: mapPackagingTransportHistoryRowToUI },
    pendingColumns,
    historyColumns,
    currentUser,
    defaultHiddenColumns: DEFAULT_HIDDEN_COLUMNS,
    searchChip: true,
  })
  // History is fetched a page at a time by the hook; these keep the page's older names.
  const processedOrders = history.rows
  const processedLoading = history.loading
  const fetchProcessedOrders = history.reload

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/otp-supabase/packaging-transport?status=pending")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data.map(mapPackagingTransportPendingRowToUI))
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching packaging-transport pending queue:", err)
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
    fetch("/api/otp-supabase/dropdowns?category=transport_mode")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          setTransportModeOptions(result.data.map((d: any) => d.value))
        }
      })
      .catch((err) => console.error("Error fetching transport mode options:", err))
  }, [])

  const handleProcess = (order: any) => {
    setSelectedOrder(order)
    setBeforePhotoFiles([])
    setAfterPhotoFiles([])
    setExistingBeforePhotoUrls(order.beforePhotoUrls || [])
    setExistingAfterPhotoUrls(order.afterPhotoUrls || [])
    // Pre-filled from the order's own transport_mode (order-acceptable's
    // value) — user can change it here; the change is saved only on this
    // otp_packaging_transport row, never written back to otp_orders.
    // otp_orders.transport_mode is synced from LTO verbatim and is
    // lowercase ("by hand-warehouse"), while the transport_mode dropdown
    // (and the Select below) use Title Case ("By Hand-Warehouse") — a
    // case-sensitive match against transportModeOptions is needed so the
    // Select actually shows it as selected instead of silently falling
    // back to the placeholder.
    const rawMode = (order.draftTransportMode || order.transportMode || "").trim()
    const matchedMode = transportModeOptions.find((opt) => opt.toLowerCase() === rawMode.toLowerCase())
    setTransportMode(matchedMode || rawMode)
    setReceivingCopyFile(null)
    // Drafts normally only hold photos, but an order sent back from the
    // removed Bilty Upload stage already has its dispatch data, so prefill it.
    setExistingReceivingCopyUrl(order.draftReceivingCopyUrl || "")
    setFieldValues(order.draftFieldValues || {})
    setFreightCharge(order.draftFreightCharge || "")
    setHamaliCharge(order.draftHamaliCharge || "")
    setParkingCharge(order.draftParkingCharge || "")
    setBiltyFiles([])
    setExistingBiltyUrls(order.draftBiltyUploadUrls || [])
    setTransporterRemarks(order.draftRemarks || "")
    setDispatchStatus(order.draftDispatchStatus || "okay")
    setNotOkReason(order.draftNotOkReason || "")
    setIsDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  // Step 1 — "Save Photos": only Before/After Photo required. Saves (or
  // updates) a draft otp_packaging_transport row and keeps the order in
  // Pending — see Database/39_packaging_transport_draft_save.sql.
  const handleSavePhotos = async () => {
    if (!selectedOrder) return

    const totalBeforeCount = existingBeforePhotoUrls.length + beforePhotoFiles.length
    if (totalBeforeCount === 0) {
      toast.error("Please upload at least one Before Photo (Packing).")
      return
    }

    setIsSavingPhotos(true)
    try {
      const [newBeforeUrls, newAfterUrls] = await Promise.all([
        uploadFiles(beforePhotoFiles, "packaging_transport/before"),
        uploadFiles(afterPhotoFiles, "packaging_transport/after"),
      ])

      const response = await fetch("/api/otp-supabase/packaging-transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "draft",
          makeInvoiceId: selectedOrder.makeInvoiceId || selectedOrder.id,
          beforePhotoUrls: [...existingBeforePhotoUrls, ...newBeforeUrls],
          afterPhotoUrls: [...existingAfterPhotoUrls, ...newAfterUrls],
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsDialogOpen(false)
        setSelectedOrder(null)
        await fetchOrders()
        toast.success(`Order ${selectedOrder.orderNo} — photos saved. Still pending; open again to complete the rest.`)
      } else {
        throw new Error(result.error || "Save failed")
      }
    } catch (err: any) {
      console.error("Error saving packaging-transport photos:", err)
      toast.error(`Error: ${err.message}`)
    } finally {
      setIsSavingPhotos(false)
    }
  }

  // Step 2 — "Submit" (final): the rest of the form. Flips the same row
  // to status='submitted', which is what moves it to History here.
  const handleSubmit = async () => {
    if (!selectedOrder) return

    const totalBeforeCount = existingBeforePhotoUrls.length + beforePhotoFiles.length
    if (totalBeforeCount === 0) {
      toast.error("Please upload at least one Before Photo (Packing).")
      return
    }
    if (!transportMode) {
      toast.error("Please select a Transport Mode.")
      return
    }
    const receivingCopyField = sectionFields.find((f) => f.key === "receiving_copy_url")
    for (const def of sectionFields) {
      if (!def.required || def.key === "receiving_copy_url") continue
      if (!String(fieldValues[def.key] || "").trim()) {
        toast.error(`Please enter ${def.label}.`)
        return
      }
    }
    if (receivingCopyField?.required && !existingReceivingCopyUrl && !receivingCopyFile) {
      toast.error(`Please upload ${receivingCopyField.label}.`)
      return
    }
    if (biltyRequired) {
      if (!freightCharge.trim()) {
        toast.error("Please enter the Freight Charge.")
        return
      }
      if (existingBiltyUrls.length + biltyFiles.length === 0) {
        toast.error("Please upload at least one Bilty / Docket file.")
        return
      }
    }
    if (dispatchStatus === "notokay" && !notOkReason.trim()) {
      toast.error("Please provide a reason for 'Not Okay' status.")
      return
    }

    setIsSubmitting(true)
    try {
      const newBiltyUrls = await uploadFiles(biltyFiles, "bilty_upload")
      const [newBeforeUrls, newAfterUrls, newReceivingCopyUrls] = await Promise.all([
        uploadFiles(beforePhotoFiles, "packaging_transport/before"),
        uploadFiles(afterPhotoFiles, "packaging_transport/after"),
        receivingCopyField && receivingCopyFile ? uploadFiles([receivingCopyFile], "packaging_transport/receiving") : Promise.resolve([]),
      ])

      const response = await fetch("/api/otp-supabase/packaging-transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "final",
          makeInvoiceId: selectedOrder.makeInvoiceId || selectedOrder.id,
          beforePhotoUrls: [...existingBeforePhotoUrls, ...newBeforeUrls],
          afterPhotoUrls: [...existingAfterPhotoUrls, ...newAfterUrls],
          transportMode,
          fieldValues,
          ...(receivingCopyField ? { receivingCopyUrl: existingReceivingCopyUrl || newReceivingCopyUrls[0] } : {}),
          freightCharge,
          hamaliCharge,
          parkingCharge,
          biltyUploadUrls: [...existingBiltyUrls, ...newBiltyUrls],
          transporterRemarks,
          dispatchStatus,
          notOkReason,
          createdBy: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsDialogOpen(false)
        setSelectedOrder(null)
        await fetchOrders()
        toast.success(`Order ${selectedOrder.orderNo} — packaging and transport recorded.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting packaging-transport:", err)
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
            className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            onClick={() => handleProcess(order)}
          >
            {order.isDraft ? "Continue" : "Process"}
          </Button>
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
      case "draftStatus":
        return order.isDraft ? (
          <StatusBadge tone="warning">Photos Saved</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">New</StatusBadge>
        )
      case "beforePhoto":
        return order.beforePhotoUrls && order.beforePhotoUrls.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {order.beforePhotoUrls.map((url: string, idx: number) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                <StatusBadge tone="info">{idx + 1}</StatusBadge>
              </a>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )
      case "freightCharge":
      case "hamaliCharge":
      case "parkingCharge":
        return value !== "" && value !== null && value !== undefined ? `₹${value}` : ""
      case "biltyUpload":
        return order.biltyUploadUrls && order.biltyUploadUrls.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {order.biltyUploadUrls.map((url: string, idx: number) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                <StatusBadge tone="info">{idx + 1}</StatusBadge>
              </a>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )
      case "receivingCopy":
        return order.receivingCopyUrl ? (
          <a href={order.receivingCopyUrl} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">Link</StatusBadge>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )
      case "afterPhoto":
        return order.afterPhotoUrls && order.afterPhotoUrls.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {order.afterPhotoUrls.map((url: string, idx: number) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                <StatusBadge tone="info">{idx + 1}</StatusBadge>
              </a>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )
      case "expenseAmount":
        return value !== "" && value !== null && value !== undefined ? `₹${value}` : ""
      case "dispatchStatus":
        return (
          <StatusBadge tone={value === "notokay" ? "danger" : "success"}>
            {value === "notokay" ? "Not Okay" : "Okay"}
          </StatusBadge>
        )
      case "invoiceCopy":
        return order.invoiceCopyUrl ? (
          <a href={order.invoiceCopyUrl} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">Link</StatusBadge>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )
      default:
        return value || ""
    }
  }

  const handleTabChange = (value: string) => {
    setCurrentTab(value)
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
          <span className="ml-2">Loading packaging and transport queue...</span>
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
            placeholder="Search order no, company, contact, quotation, invoice..."
            className="min-w-[220px] flex-1"
          />
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
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
                  ? "110px"
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
                  : col.key === "invoiceNumber"
                  ? "150px"
                  : col.key === "transportMode" || col.key === "modeDetails"
                  ? "180px"
                  : "140px",
            }))}
            data={activeRows}
            keyExtractor={(order, idx) => order.id || order.queueId || order.orderId || order.orderNo || idx}
            loading={currentTab === "history" ? processedLoading : false}
            emptyTitle={
              searchTerm
                ? "No matching records found"
                : currentTab === "pending"
                ? "No pending packaging/transport records"
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Packaging and Dispatch</DialogTitle>
              <DialogDescription>Upload packaging photos and enter transportation details for this order</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
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

              {/* Documentation */}
              <div className="bg-card p-4 rounded-lg border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Documentation</h3>
                  {selectedOrder?.isDraft && (
                    <Badge variant="outline" className="border-warning/40 text-warning-foreground bg-warning/10">
                      Draft — photos already saved
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beforePhoto">
                    Before Photo (Packing) <span className="text-destructive font-bold">*</span>
                  </Label>
                  {existingBeforePhotoUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-1">
                      {existingBeforePhotoUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-16 w-16 overflow-hidden rounded-lg border border-border bg-card"
                        >
                          <img src={url} alt={`Before ${idx + 1}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  <Input
                    id="beforePhoto"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setBeforePhotoFiles(Array.from(e.target.files || []))}
                  />
                  {beforePhotoFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">{beforePhotoFiles.length} new file(s) selected</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="afterPhoto">
                    After Photo (Final Package)
                  </Label>
                  {existingAfterPhotoUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-1">
                      {existingAfterPhotoUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-16 w-16 overflow-hidden rounded-lg border border-border bg-card"
                        >
                          <img src={url} alt={`After ${idx + 1}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  <Input
                    id="afterPhoto"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setAfterPhotoFiles(Array.from(e.target.files || []))}
                  />
                  {afterPhotoFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">{afterPhotoFiles.length} new file(s) selected</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={handleSavePhotos} disabled={isSavingPhotos || isSubmitting}>
                    {isSavingPhotos ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Photos"
                    )}
                  </Button>
                </div>
              </div>

              {/* Transport Mode — decides which section renders below */}
              <div className="space-y-2">
                <Label htmlFor="transportMode">
                  Transport Mode <span className="text-destructive font-bold">*</span>
                </Label>
                <Select value={transportMode} onValueChange={setTransportMode}>
                  <SelectTrigger id="transportMode">
                    <SelectValue placeholder="Select transport mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {transportModeOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section fields — driven entirely by FIELD_DEFS for the
                  currently selected Transport Mode (see
                  lib/dispatch-mode.ts). Every mode shares this one renderer
                  instead of 11 hand-written blocks. */}
              <div className="bg-card p-4 rounded-lg border border-border space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {isReceivingPath ? "Receiving's Section" : "Dispatch Details"}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {sectionFields
                    .filter((def) => def.key !== "receiving_copy_url")
                    .map((def) => (
                      <div key={def.key} className="space-y-2">
                        <Label htmlFor={def.key}>
                          {def.label} {def.required && <span className="text-destructive font-bold">*</span>}
                        </Label>
                        <Input
                          id={def.key}
                          type={def.type === "number" ? "number" : def.type === "datetime-local" ? "datetime-local" : "text"}
                          value={fieldValues[def.key] || ""}
                          onChange={(e) => setFieldValue(def.key, e.target.value)}
                          placeholder={`Enter ${def.label.toLowerCase()}`}
                        />
                      </div>
                    ))}
                </div>

                {sectionFields.some((def) => def.key === "receiving_copy_url") && (
                  <div className="space-y-2">
                    <Label htmlFor="receivingCopy">
                      {sectionFields.find((def) => def.key === "receiving_copy_url")!.label}{" "}
                      {sectionFields.find((def) => def.key === "receiving_copy_url")!.required && (
                        <span className="text-destructive font-bold">*</span>
                      )}
                    </Label>
                    {existingReceivingCopyUrl && (
                      <a
                        href={existingReceivingCopyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-16 w-16 overflow-hidden rounded-lg border border-border bg-card"
                      >
                        <img src={existingReceivingCopyUrl} alt="Proof document" className="h-full w-full object-cover" />
                      </a>
                    )}
                    <Input
                      id="receivingCopy"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setReceivingCopyFile(e.target.files?.[0] || null)}
                    />
                    {receivingCopyFile && <p className="text-xs text-muted-foreground">{receivingCopyFile.name} selected</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="transporterRemarks">
                    Remarks
                  </Label>
                  <Textarea
                    id="transporterRemarks"
                    value={transporterRemarks}
                    onChange={(e) => setTransporterRemarks(e.target.value)}
                    placeholder="Enter remarks..."
                    rows={1}
                  />
                </div>
              </div>

              {/* Bilty section: the same 4 fields the removed Bilty Upload stage
                  collected. Freight Charge + Bilty/Docket are mandatory for every
                  non-receiving mode, optional for Customer Pickup and the legacy
                  receiving modes (see isBiltyRequired in lib/dispatch-mode.ts). */}
              <div className="bg-card p-4 rounded-lg border border-border space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Bilty / Docket {!biltyRequired && <span className="font-normal text-muted-foreground">(optional for this mode)</span>}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="freightCharge">
                      Freight Charge {biltyRequired && <span className="text-destructive font-bold">*</span>}
                    </Label>
                    <Input id="freightCharge" type="number" value={freightCharge} onChange={(e) => setFreightCharge(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hamaliCharge">Hamali Charge</Label>
                    <Input id="hamaliCharge" type="number" value={hamaliCharge} onChange={(e) => setHamaliCharge(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parkingCharge">Parking Charge</Label>
                    <Input id="parkingCharge" type="number" value={parkingCharge} onChange={(e) => setParkingCharge(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="biltyUpload">
                    Bilty / Docket Upload {biltyRequired && <span className="text-destructive font-bold">*</span>}
                  </Label>
                  {existingBiltyUrls.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {existingBiltyUrls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="default">{idx + 1}</Badge>
                        </a>
                      ))}
                    </div>
                  )}
                  <Input
                    id="biltyUpload"
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={(e) => setBiltyFiles(Array.from(e.target.files || []))}
                  />
                  {biltyFiles.length > 0 && <p className="text-xs text-muted-foreground">{biltyFiles.length} file(s) selected</p>}
                </div>
              </div>

              {/* Dispatch Confirmation */}
              <div className="bg-card p-4 rounded-lg border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Dispatch Confirmation</h3>
                  <div className="flex bg-muted/50 p-1 rounded-md border border-border">
                    <button
                      type="button"
                      onClick={() => setDispatchStatus("okay")}
                      className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${dispatchStatus === "okay" ? "bg-success text-success-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      OKAY
                    </button>
                    <button
                      type="button"
                      onClick={() => setDispatchStatus("notokay")}
                      className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${dispatchStatus === "notokay" ? "bg-destructive text-destructive-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      NOT OKAY
                    </button>
                  </div>
                </div>
                {dispatchStatus === "notokay" && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label htmlFor="notOkReason" className="text-destructive font-semibold">
                      Reason for NOT OKAY
                    </Label>
                    <Textarea
                      id="notOkReason"
                      value={notOkReason}
                      onChange={(e) => setNotOkReason(e.target.value)}
                      placeholder="Please specify why this order is not okay for dispatch..."
                      className="border-destructive/40"
                    />
                  </div>
                )}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemListDialogItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No items
                    </TableCell>
                  </TableRow>
                ) : (
                  itemListDialogItems.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
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
