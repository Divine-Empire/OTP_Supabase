"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Eye } from "lucide-react"
import { useStageList } from "@/hooks/use-stage-list"
import { useAuth } from "@/components/auth-provider"
import { mapCalibrationPendingRowToUI, mapCalibrationHistoryRowToUI } from "@/lib/otp-utils"
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
  { key: "invoiceNumber", label: "Invoice Number", searchable: true },
  { key: "invoiceCopy", label: "Invoice Copy", searchable: false },
  { key: "invoiceDate", label: "Invoice Date", searchable: true },
  { key: "calibrationType", label: "Type", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
  { key: "accessories", label: "Accessories", searchable: true },
  { key: "planned", label: "Planned", searchable: true },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "certificateNumber", label: "Certificate Number", searchable: true },
  { key: "certificateType", label: "Certificate Type", searchable: true },
  { key: "certificateUpload", label: "Certificate Upload", searchable: false },
  { key: "remarks", label: "Remarks", searchable: true },
  { key: "createdBy", label: "Created By", searchable: true },
  { key: "actual", label: "Actual", searchable: true },
]

// Only Timestamp, Order No., Quotation No., Company Name, Contact Person
// Name, Contact Number, Invoice Number, Invoice Copy, Invoice Date are
// shown by default -- everything else (CRM Name, Item List, and this
// stage's own certificate/remarks/created-by fields) is still toggleable
// via Column Visibility, just hidden by default.
const DEFAULT_HIDDEN_COLUMNS = new Set([
  "itemList",
  "certificateNumber",
  "certificateType",
  "certificateUpload",
  "remarks",
  "createdBy",
])

export default function CalibrationPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [certificateNumber, setCertificateNumber] = useState("")
  const [certificateType, setCertificateType] = useState("")
  const [certificateUploadFile, setCertificateUploadFile] = useState<File | null>(null)
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
    extraValues,
    setExtraFilter,
    extraOptions,
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
    serverHistory: { url: "/api/otp-supabase/calibration?status=history", map: mapCalibrationHistoryRowToUI },
    pendingColumns,
    historyColumns,
    currentUser,
    defaultHiddenColumns: DEFAULT_HIDDEN_COLUMNS,
    extraFilters: [{ key: "calibrationType", label: "Type", field: "calibrationType" }],
  })
  // History is fetched a page at a time by the hook; these keep the page's older names.
  const processedOrders = history.rows
  const processedLoading = history.loading
  const loadProcessedOrders = history.reload
  const calibrationTypeFilter = extraValues.calibrationType
  const setCalibrationTypeFilter = (value: string) => setExtraFilter("calibrationType", value)
  const calibrationTypeOptions = extraOptions.calibrationType

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/otp-supabase/calibration?status=pending")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data.map(mapCalibrationPendingRowToUI))
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching calibration pending queue:", err)
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
    setCertificateNumber("")
    setCertificateType("")
    setCertificateUploadFile(null)
    setRemarks("")
    setIsDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  // Submits Calibration Certificate — inserts a row into
  // otp_calibration_certificate (one per otp_make_invoice record), which
  // is what moves this order from Pending to History here.
  const handleSubmit = async () => {
    if (!selectedOrder) return

    setIsSubmitting(true)
    try {
      let certificateUploadUrl = ""
      if (certificateUploadFile) {
        const formData = new FormData()
        formData.append("file", certificateUploadFile)
        formData.append("folder", "calibration")
        const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
        const uploadJson = await uploadRes.json()
        if (uploadJson.success) certificateUploadUrl = uploadJson.url
      }

      const response = await fetch("/api/otp-supabase/calibration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          makeInvoiceId: selectedOrder.makeInvoiceId || selectedOrder.id,
          certificateNumber,
          certificateType,
          certificateUploadUrl,
          remarks,
          createdBy: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsDialogOpen(false)
        setSelectedOrder(null)
        await fetchOrders()
        toast.success(`Order ${selectedOrder.orderNo} — calibration certificate recorded.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting calibration:", err)
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
            Process
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
      case "certificateUpload":
        return order.certificateUploadUrl ? (
          <a href={order.certificateUploadUrl} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">Link</StatusBadge>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
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
          <span className="ml-2">Loading calibration queue...</span>
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
            placeholder="Search order no, company, contact, quotation, certificate..."
            className="min-w-[220px] flex-1"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[170px]">
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
            <div className="w-[150px]">
              <Select value={calibrationTypeFilter} onValueChange={setCalibrationTypeFilter}>
                <SelectTrigger className="h-9 text-xs border-input bg-card">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Types
                  </SelectItem>
                  {calibrationTypeOptions.map((type) => (
                    <SelectItem key={type} value={type} className="text-xs">
                      {type}
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
                  : col.key === "certificateNumber" || col.key === "invoiceNumber"
                  ? "150px"
                  : col.key === "remarks"
                  ? "200px"
                  : "140px",
            }))}
            data={activeRows}
            keyExtractor={(order, idx) => order.id || order.queueId || order.orderId || order.orderNo || idx}
            loading={currentTab === "history" ? processedLoading : false}
            emptyTitle={
              searchTerm
                ? "No matching records found"
                : currentTab === "pending"
                ? "No pending calibration certificates"
                : "No processed orders found"
            }
            emptyDescription={
              searchTerm ? "Try adjusting your search terms or clearing CRM/Type filters." : undefined
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
              <DialogTitle>Process Calibration Certificate</DialogTitle>
              <DialogDescription>Record the calibration certificate details for this order</DialogDescription>
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
                  <Label htmlFor="certificateNumber">Certificate Number</Label>
                  <Input
                    id="certificateNumber"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    placeholder="Enter certificate number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certificateType">Certificate Type</Label>
                  <Input
                    id="certificateType"
                    value={certificateType}
                    onChange={(e) => setCertificateType(e.target.value)}
                    placeholder="Enter certificate type"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificateUpload">Certificate Upload</Label>
                <Input id="certificateUpload" type="file" onChange={(e) => setCertificateUploadFile(e.target.files?.[0] || null)} />
                {certificateUploadFile && <p className="text-sm text-muted-foreground">Selected: {certificateUploadFile.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Input id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter any remarks..." />
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
