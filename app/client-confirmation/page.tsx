"use client"

import { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Eye, Loader2 } from "lucide-react"
import { useStageList } from "@/hooks/use-stage-list"
import { useAuth } from "@/components/auth-provider"
import { mapClientConfirmationPendingRowToUI, mapClientConfirmationHistoryRowToUI } from "@/lib/otp-utils"
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
  { key: "transportMode", label: "Transport Mode", searchable: true },
  { key: "transporterName", label: "Assigned Driver for Dispatch", searchable: true },
  { key: "receivingCopy", label: "Receiving's Copy", searchable: false },
  { key: "itemList", label: "Item List", searchable: false },
  { key: "accessories", label: "Accessories", searchable: true },
  { key: "planned", label: "Planned", searchable: true },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "materialReceived", label: "Material Received", searchable: true },
  { key: "sitePersonName", label: "Site-Person Name", searchable: true },
  { key: "clientContactNumber", label: "Contact Number", searchable: true },
  { key: "createdBy", label: "Created By", searchable: true },
  { key: "actual", label: "Actual", searchable: true },
]

export default function ClientConfirmationPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const [materialReceived, setMaterialReceived] = useState("")
  const [sitePersonName, setSitePersonName] = useState("")
  const [clientContactNumber, setClientContactNumber] = useState("")

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
    filteredHistoryRows: filteredProcessedOrders,
    historyPage,
    setHistoryPage,
    historyPageSize,
    setHistoryPageSize,
    columnPanel,
    activeColumns,
    activeRows,
    historyPageRows,
    historyTotal,
    historyTotalPages,
    history,
  } = useStageList({
    pendingRows: orders,
    serverHistory: { url: "/api/otp-supabase/client-confirmation?status=history", map: mapClientConfirmationHistoryRowToUI },
    pendingColumns,
    historyColumns,
    currentUser,
    searchChip: true,
  })
  // History is fetched a page at a time by the hook; these keep the page's older names.
  const processedOrders = history.rows
  const processedLoading = history.loading
  const loadProcessedOrders = history.reload

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/otp-supabase/client-confirmation?status=pending")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data.map(mapClientConfirmationPendingRowToUI))
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching client-confirmation pending queue:", err)
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
    setMaterialReceived("")
    setSitePersonName("")
    setClientContactNumber("")
    setIsDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  const isFormValid = materialReceived !== "" && sitePersonName.trim() !== "" && clientContactNumber.trim() !== ""

  // Submits Client Confirmation — inserts a row into
  // otp_client_confirmation (one per otp_packaging_transport record), which is
  // what moves this order from Pending to History here. Terminal stage:
  // nothing downstream gets scheduled from here.
  const handleSubmit = async () => {
    if (!selectedOrder) return
    if (!isFormValid) {
      toast.error("Material Received, Site-Person Name and Contact Number are all required.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/otp-supabase/client-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packagingTransportId: selectedOrder.packagingTransportId,
          materialReceived,
          sitePersonName,
          contactNumber: clientContactNumber,
          createdBy: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsDialogOpen(false)
        setSelectedOrder(null)
        await fetchOrders()
        toast.success(`Order ${selectedOrder.orderNo} — client confirmation recorded.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting client-confirmation:", err)
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
            className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
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
            className="h-7 px-2 text-xs gap-1 border-primary/20 text-accent-foreground hover:bg-primary/5"
            onClick={() => handleViewItemList(order)}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Items</span>
          </Button>
        )
      case "materialReceived":
        return value ? (
          <StatusBadge tone={value === "Yes" ? "success" : "warning"}>
            {value}
          </StatusBadge>
        ) : null
      case "receivingCopy":
        return order.receivingCopyUrl ? (
          <a href={order.receivingCopyUrl} target="_blank" rel="noopener noreferrer">
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
      loadProcessedOrders()
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading client confirmation queue...</span>
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
                  ? "100px"
                  : col.key === "itemList"
                  ? "75px"
                  : col.key === "companyName"
                  ? "220px"
                  : col.key === "orderNo"
                  ? "120px"
                  : col.key === "quotationNo"
                  ? "130px"
                  : col.key === "contactPersonName" || col.key === "sitePersonName"
                  ? "160px"
                  : col.key === "invoiceNumber"
                  ? "150px"
                  : col.key === "transportMode" || col.key === "transporterName"
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
                ? "No pending client confirmations"
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
              <DialogTitle>Client Confirmation</DialogTitle>
              <DialogDescription>Confirm delivery details for this order with the client</DialogDescription>
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

              <div className="space-y-2">
                <Label htmlFor="materialReceived">
                  Material Received <span className="text-destructive font-bold">*</span>
                </Label>
                <Select value={materialReceived} onValueChange={setMaterialReceived}>
                  <SelectTrigger id="materialReceived">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sitePersonName">
                  Site-Person Name <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="sitePersonName"
                  value={sitePersonName}
                  onChange={(e) => setSitePersonName(e.target.value)}
                  placeholder="Enter site-person name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientContactNumber">
                  Contact Number <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="clientContactNumber"
                  value={clientContactNumber}
                  onChange={(e) => setClientContactNumber(e.target.value)}
                  placeholder="Enter contact number"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
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
