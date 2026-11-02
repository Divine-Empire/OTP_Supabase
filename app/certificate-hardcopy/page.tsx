"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Eye, Filter } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HardcopyCertificateDialog } from "./hardcopy-certificate-dialog"
import { useStageList } from "@/hooks/use-stage-list"
import { useAuth } from "@/components/auth-provider"
import { mapCertiHardcopyRowToUI } from "@/lib/otp-utils"
import { invalidateSidebarPendingCounts } from "@/components/layout/sidebar"
import { MobileRecordCard } from "@/components/mobile-record-card"
import { StatusTabs, ColumnSelector, FilterSearch, FilterChips, DataTable, StatusBadge } from "@/components/shared"

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
  { key: "certificateNumber", label: "Certificate Number", searchable: true },
  { key: "certHardcopyRequired", label: "Cert. Hardcopy Req.", searchable: true },
  { key: "hardcopyDeliveryType", label: "Hardcopy Delivery Add.", searchable: true },
  { key: "hardcopyDeliveryAddress", label: "Hardcopy Address", searchable: true },
  { key: "itemList", label: "Items Packed", searchable: false },
  { key: "planned", label: "Planned", searchable: true },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "hardcopyUpload", label: "Hardcopy PDF", searchable: false },
  { key: "actual", label: "Actual", searchable: true },
]

const DEFAULT_HIDDEN_COLUMNS = new Set(["crmName", "contactPersonName", "contactNumber", "quotationNo"])

export default function CertificateHardcopyPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generateOrder, setGenerateOrder] = useState<any>(null)
  const [itemListDialogOpen, setItemListDialogOpen] = useState(false)
  const [itemListDialogItems, setItemListDialogItems] = useState<any[]>([])
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
    serverHistory: { url: "/api/otp-supabase/certi-hardcopy?status=history", map: mapCertiHardcopyRowToUI },
    pendingColumns,
    historyColumns,
    currentUser,
    defaultHiddenColumns: DEFAULT_HIDDEN_COLUMNS,
  })
  const processedOrders = history.rows
  const processedLoading = history.loading
  const loadProcessedOrders = history.reload

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/otp-supabase/certi-hardcopy?status=pending")
      const result = await response.json()
      if (result.success) {
        setOrders(result.data.map(mapCertiHardcopyRowToUI))
      } else {
        setError(result.error || "Failed to fetch data")
      }
    } catch (err) {
      console.error("Error fetching certi-hardcopy pending queue:", err)
      setError("Network error. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  const handleRefresh = () => {
    fetchOrders()
    if (currentTab === "history" || processedOrders.length > 0) {
      loadProcessedOrders()
    }
  }

  const renderCellContent = (order: any, columnKey: string) => {
    const value = order[columnKey]
    const link = (url: string) =>
      url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <StatusBadge tone="info">Link</StatusBadge>
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">N/A</span>
      )
    switch (columnKey) {
      case "actions":
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => setGenerateOrder(order)}
          >
            Generate Certificate
          </Button>
        )
      case "certHardcopyRequired":
        return value ? <StatusBadge tone={value === "YES" ? "success" : "neutral"}>{value}</StatusBadge> : ""
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
      case "invoiceCopy":
        return link(order.invoiceCopyUrl)
      case "hardcopyUpload":
        return link(order.hardcopyPdfUrl)
      default:
        return value || ""
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading hardcopy queue...</span>
        </div>
      </MainLayout>
    )
  }

  const activeFilterCount = crmNameFilter && crmNameFilter !== "all" ? 1 : 0

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
        <div className="flex flex-wrap items-center gap-2">
          <StatusTabs tabs={tabs} activeTab={currentTab} onChange={setCurrentTab} variant="segmented" />
          <FilterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search order no, company, invoice, certificate, address..."
            className="min-w-[220px] flex-1"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium border-input bg-card hover:bg-accent">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{activeFilterCount}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">CRM Name</p>
                <Select value={crmNameFilter} onValueChange={setCrmNameFilter}>
                  <SelectTrigger className="h-9 text-xs border-input bg-card">
                    <SelectValue placeholder="All CRM Names" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All CRM Names
                    </SelectItem>
                    {crmNameOptions.map((o) => (
                      <SelectItem key={o} value={o} className="text-xs">
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            aria-label="Refresh"
            title="Refresh"
            className="h-9 w-9 p-0 border-input bg-card hover:bg-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <ColumnSelector
            options={columnPanel.columns}
            visible={columnPanel.visible}
            onToggle={columnPanel.toggle}
            onSelectAll={columnPanel.showAll}
            onHideAll={columnPanel.hideAll}
          />
        </div>

        <HardcopyCertificateDialog
          open={!!generateOrder}
          onOpenChange={(o) => !o && setGenerateOrder(null)}
          calibrationId={generateOrder ? generateOrder.calibrationId || generateOrder.id : null}
          orderNo={generateOrder?.orderNo || ""}
          invoiceNumber={generateOrder?.invoiceNumber || ""}
          onGenerated={() => {
            invalidateSidebarPendingCounts()
            handleRefresh()
          }}
        />

        <FilterChips chips={activeChips} onClearAll={handleClearAllFilters} className="-mt-1" />

        <div className="flex-1 flex flex-col min-h-0">
          <DataTable
            headers={activeColumns.map((col) => ({
              key: col.key,
              label: col.label,
              minWidth:
                col.key === "actions"
                  ? "170px"
                  : col.key === "itemList"
                  ? "110px"
                  : col.key === "companyName"
                  ? "220px"
                  : col.key === "orderNo"
                  ? "120px"
                  : col.key === "hardcopyDeliveryAddress"
                  ? "260px"
                  : col.key === "certificateNumber" || col.key === "invoiceNumber"
                  ? "150px"
                  : "140px",
            }))}
            data={activeRows}
            keyExtractor={(order, idx) => order.id || order.orderId || order.orderNo || idx}
            loading={currentTab === "history" ? processedLoading : false}
            emptyTitle={searchTerm ? "No matching records found" : currentTab === "pending" ? "No pending hardcopy certificates" : "No generated hardcopies found"}
            emptyDescription={searchTerm ? "Try adjusting your search terms or clearing the CRM filter." : undefined}
            simpleFooter={currentTab === "pending"}
            currentPage={historyPage}
            itemsPerPage={historyPageSize}
            totalResults={currentTab === "pending" ? undefined : historyTotal}
            totalPages={historyTotalPages}
            onPageChange={setHistoryPage}
            onItemsPerPageChange={(n) => {
              setHistoryPageSize(n)
              setHistoryPage(1)
            }}
            itemsPerPageOptions={[25, 50, 100, 200]}
            renderRow={(order) => (
              <TableRow key={order.id || order.orderId || order.orderNo} className="hover:bg-secondary/50 transition-colors">
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

        <Dialog open={itemListDialogOpen} onOpenChange={setItemListDialogOpen}>
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Items Packed</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
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
                        <TableCell className="font-mono text-xs">{item.item_code || "-"}</TableCell>
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
