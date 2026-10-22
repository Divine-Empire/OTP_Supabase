"use client"

import { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { RefreshCw, Search, Settings, Eye, Loader2 } from "lucide-react"
import { useStageList } from "@/hooks/use-stage-list"
import { useAuth } from "@/components/auth-provider"
import { mapDeliveryNoteForInvoicePendingRowToUI, mapDeliveryNoteForInvoiceHistoryRowToUI } from "@/lib/otp-utils"
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
  { key: "itemList", label: "Item List", searchable: false },
  { key: "accessories", label: "Accessories", searchable: true },
  { key: "planned", label: "Planned", searchable: true },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "amount", label: "Amount", searchable: true },
  { key: "dnNumber", label: "DN Number", searchable: true },
  { key: "dnAttachment", label: "DN Attachment", searchable: false },
  { key: "createdBy", label: "Created By", searchable: true },
  { key: "actual", label: "Actual", searchable: true },
]

export default function DeliveryNoteForInvoicePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [amount, setAmount] = useState("")
  const [dnNumber, setDnNumber] = useState("")
  const [dnAttachmentFile, setDnAttachmentFile] = useState<File | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemListDialogOpen, setItemListDialogOpen] = useState(false)
  const [itemListDialogItems, setItemListDialogItems] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user: currentUser } = useAuth()
  const {
    currentTab: activeTab,
    setCurrentTab: setActiveTab,
    tabs,
    searchTerm,
    setSearchTerm,
    crmNameFilter,
    setCrmNameFilter,
    crmNameOptions,
    activeChips,
    handleClearAllFilters,
    filteredPendingRows: filteredOrders,
    filteredHistoryRows: filteredProcessedOrders,
    historyPage,
    setHistoryPage,
    historyPageSize,
    setHistoryPageSize,
    columnPanel,
    activeColumns,
    historyPageRows,
    historyTotal,
    historyTotalPages,
    history,
  } = useStageList({
    pendingRows: orders,
    serverHistory: { url: "/api/otp-supabase/delivery-note-for-invoice?status=history", map: mapDeliveryNoteForInvoiceHistoryRowToUI },
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
      const response = await fetch("/api/otp-supabase/delivery-note-for-invoice?status=pending")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data.map(mapDeliveryNoteForInvoicePendingRowToUI))
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching delivery-note-for-invoice pending queue:", err)
      setError(err.message)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProcessedOrders = () => {
    setHistoryPage(1)
    return loadProcessedOrders()
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleProcessedTabClick = async () => {
    await fetchProcessedOrders()
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as "pending" | "history")
    if (value === "history") handleProcessedTabClick()
  }

  const handleRefresh = () => {
    if (activeTab === "history") fetchProcessedOrders()
    else fetchOrders()
  }

  const handleProcess = (order: any) => {
    setSelectedOrder(order)
    setAmount("")
    setDnNumber("")
    setDnAttachmentFile(null)
    setIsDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  // Submits Delivery Note (Inv.) — inserts a row into
  // otp_debit_note_for_invoice, moving this wave from Pending to History,
  // AND is what unlocks Make Invoice's own planned date for this wave (see
  // app/api/otp-supabase/delivery-note-for-invoice/route.ts POST).
  const handleSubmit = async () => {
    if (!selectedOrder) return
    if (!amount || !dnNumber.trim() || !dnAttachmentFile) {
      toast.error("Amount, DN Number and DN Attachment are required")
      return
    }

    setIsSubmitting(true)
    try {
      let dnAttachmentUrl = ""
      if (dnAttachmentFile) {
        const formData = new FormData()
        formData.append("file", dnAttachmentFile)
        formData.append("folder", "delivery-note-for-invoice")
        const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
        const uploadJson = await uploadRes.json()
        if (uploadJson.success) dnAttachmentUrl = uploadJson.url
      }

      const response = await fetch("/api/otp-supabase/delivery-note-for-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueId: selectedOrder.queueId || selectedOrder.id,
          amount,
          dnNumber: dnNumber.trim(),
          dnAttachmentUrl,
          createdBy: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsDialogOpen(false)
        setSelectedOrder(null)
        await fetchOrders()
        toast.success(`Order ${selectedOrder.orderNo} — Delivery Note (Inv.) recorded. Make Invoice is now scheduled.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting delivery-note-for-invoice:", err)
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
      case "dnAttachment":
        return order.dnAttachmentUrl ? (
          <a href={order.dnAttachmentUrl} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">
              Link
            </StatusBadge>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )
      case "sourceStage":
        return <StatusBadge tone="neutral">{value || "N/A"}</StatusBadge>
      case "amount":
        return value !== "" && value !== null && value !== undefined ? `₹${Number(value).toLocaleString()}` : ""
      default:
        return value || ""
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading Delivery Note (inv.) queue...</span>
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
            activeTab={activeTab}
            onChange={(val) => handleTabChange(val as "pending" | "history")}
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
                  : col.key === "amount"
                  ? "120px"
                  : "140px",
            }))}
            data={activeTab === "pending" ? filteredOrders : historyPageRows}
            keyExtractor={(order, idx) => order.id || order.queueId || order.orderId || order.orderNo || idx}
            loading={activeTab === "history" ? processedLoading : false}
            emptyTitle={
              searchTerm
                ? "No matching records found"
                : activeTab === "pending"
                ? "No pending Delivery Note (inv.) records"
                : "No processed records found"
            }
            emptyDescription={
              searchTerm ? "Try adjusting your search terms or clearing CRM filters." : undefined
            }
            simpleFooter={activeTab === "pending"}
            currentPage={historyPage}
            itemsPerPage={historyPageSize}
            totalResults={activeTab === "pending" ? undefined : historyTotal}
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
              <DialogTitle>Process Delivery Note (Inv.)</DialogTitle>
              <DialogDescription>Enter the Delivery Note details for this wave</DialogDescription>
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
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dnNumber">DN Number *</Label>
                  <Input
                    id="dnNumber"
                    value={dnNumber}
                    onChange={(e) => setDnNumber(e.target.value)}
                    placeholder="Enter DN number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dnAttachment">DN Attachment *</Label>
                <Input id="dnAttachment" type="file" onChange={(e) => setDnAttachmentFile(e.target.files?.[0] || null)} />
                {dnAttachmentFile && <p className="text-sm text-muted-foreground">Selected: {dnAttachmentFile.name}</p>}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!amount || !dnNumber.trim() || !dnAttachmentFile || isSubmitting}
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
