"use client"

import { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Eye, Trash2, Loader2 } from "lucide-react"
import { useStageList } from "@/hooks/use-stage-list"
import { useAuth } from "@/components/auth-provider"
import { mapCreditNoteRowToUI } from "@/lib/otp-utils"
import { MobileRecordCard } from "@/components/mobile-record-card"
import { StatusTabs, ColumnSelector, FilterSearch, FilterChips, DataTable, StatusBadge } from "@/components/shared"
import { toast } from "sonner"

// Ledger palette — deliberately distinct from the rest of the app (the
// user asked for the whole Credit Note stage to have its own professional
// look, not just match the indigo system used everywhere else).
const INK = "#241F1D"
const SLATE = "#5B6168"
const PAPER = "#FAF8F5"
const LINE = "#E4DED8"

const pendingColumns = [
  { key: "actions", label: "Actions", searchable: false },
  { key: "timestamp", label: "Created", searchable: true },
  { key: "invoiceNumber", label: "Invoice Number", searchable: true },
  { key: "orderNos", label: "Order No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "poNumber", label: "PO Number", searchable: true },
  { key: "crmName", label: "CRM Name", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
  { key: "createdBy", label: "Created By", searchable: true },
]

const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "remarks", label: "Remarks", searchable: true },
  { key: "submittedBy", label: "Submitted By", searchable: true },
  { key: "actual", label: "Submitted At", searchable: true },
]

export default function CreditNotePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const [creditItems, setCreditItems] = useState<any[]>([])
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
    serverHistory: { url: "/api/otp-supabase/credit-note?status=history", map: mapCreditNoteRowToUI },
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
      const response = await fetch("/api/otp-supabase/credit-note?status=pending")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data.map(mapCreditNoteRowToUI))
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching credit-note pending queue:", err)
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
    setCreditItems((order.rawItems || []).map((it: any) => ({ ...it })))
    setRemarks("")
    setIsDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  const removeCreditItem = (idx: number) => setCreditItems((prev) => prev.filter((_, i) => i !== idx))
  const updateCreditItemQty = (idx: number, qty: string) =>
    setCreditItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qty } : it)))

  // Submits the Credit Note process form — otp_credit_note's own status
  // flips to 'completed' (see Database/60_credit_note.sql); items can be
  // trimmed further and remarks added here, on top of whatever was first
  // selected back on Make Invoice's invoice grid.
  const handleSubmit = async () => {
    if (!selectedOrder) return
    if (creditItems.length === 0) {
      toast.error("At least one item is required — remove the record instead if nothing should be credited.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/otp-supabase/credit-note", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedOrder.id,
          items: creditItems.map((it) => ({
            order_id: it.order_id,
            order_no: it.order_no,
            make_invoice_id: it.make_invoice_id,
            item_code: it.item_code,
            item_name: it.item_name,
            qty: Number(it.qty) || 0,
          })),
          remarks,
          submittedBy: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsDialogOpen(false)
        setSelectedOrder(null)
        await fetchOrders()
        toast.success(`Credit Note for invoice ${selectedOrder.invoiceNumber} submitted.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting credit-note:", err)
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
            className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
          >
            Process
          </Button>
        )
      case "invoiceNumber":
        return <span className="font-mono font-semibold" style={{ color: INK }}>{value}</span>
      case "itemList":
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1 border-primary/20 text-primary hover:bg-primary/5"
            onClick={() => handleViewItemList(order)}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Items</span>
          </Button>
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
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading credit notes...</span>
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
            placeholder="Search invoice, order, company, PO..."
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
                  : col.key === "orderNos"
                  ? "120px"
                  : col.key === "invoiceNumber"
                  ? "150px"
                  : col.key === "poNumber"
                  ? "140px"
                  : col.key === "remarks"
                  ? "200px"
                  : "140px",
            }))}
            data={activeRows}
            keyExtractor={(order, idx) => order.id || order.queueId || order.orderId || order.orderNo || idx}
            loading={currentTab === "history" ? processedLoading : false}
            emptyTitle={
              searchTerm
                ? "No credit notes match your search"
                : currentTab === "pending"
                ? "No pending credit notes"
                : "No credit notes yet"
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

        {/* Process Dialog — document-style: read-only reference block, then
            an editable line-item ledger, then remarks + submit. */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0" style={{ background: PAPER }}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: LINE }}>
              <DialogTitle className="font-mono text-xl" style={{ color: INK }}>
                {selectedOrder?.invoiceNumber}
              </DialogTitle>
              <DialogDescription style={{ color: SLATE }}>
                {selectedOrder?.companyName}
                {selectedOrder?.poNumber ? ` · PO ${selectedOrder.poNumber}` : ""} — Order {selectedOrder?.orderNos}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: LINE }}>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right w-28">Qty</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditItems.map((it, idx) => (
                    <TableRow key={idx} style={{ borderColor: LINE }}>
                      <TableCell>
                        <div style={{ color: INK }}>{it.item_name}</div>
                        {it.order_no && (
                          <div className="text-xs" style={{ color: SLATE }}>
                            Order {it.order_no}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={(e) => updateCreditItemQty(idx, e.target.value)}
                          className="w-20 ml-auto text-right font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeCreditItem(idx)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {creditItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-20" style={{ color: SLATE }}>
                        No items left — removing all of them means nothing gets credited.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="px-6 py-4 border-t space-y-3" style={{ borderColor: LINE }}>
              <div className="space-y-1.5">
                <Label htmlFor="remarks" style={{ color: INK }}>
                  Remarks
                </Label>
                <Textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason for this credit note..." rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
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
