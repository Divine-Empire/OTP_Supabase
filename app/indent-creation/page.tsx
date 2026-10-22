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
import { RefreshCw, Eye } from "lucide-react"
import { useServerHistory } from "@/hooks/use-server-history"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"
import { mapIndentCreationRowToUI } from "@/lib/otp-utils"
import { filterByAccess, crmNameOptionsFrom } from "@/lib/access"
import { MobileRecordCard } from "@/components/mobile-record-card"
import { StatusTabs, ColumnSelector, FilterSearch, FilterChips, DataTable, StatusBadge, useConfirmDialog } from "@/components/shared"

// Base columns shared across all 3 tabs.
const baseColumns = [
  { key: "timestamp", label: "Timestamp", searchable: true },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "quotationNo", label: "Quotation No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "crmName", label: "CRM Name", searchable: true },
  { key: "contactPersonName", label: "Contact Person Name", searchable: true },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
  { key: "accessories", label: "Accessories", searchable: true },
]

// The process-form's own captured fields (shown read-only from the Material
// Received tab onward).
const indentFieldColumns = [
  { key: "customerWantsMaterialAs", label: "Customer Wants Material As", searchable: true },
  { key: "createdBy", label: "Created By", searchable: true },
  { key: "warehouseLocation", label: "Warehouse Location", searchable: true },
  { key: "receivingLeadTime", label: "Receiving Lead Time", searchable: false },
  { key: "inventoryPhoto", label: "Inventory Photo", searchable: false },
  { key: "remarks", label: "Remarks", searchable: true },
  { key: "indentCreatedAt", label: "Indent Created At", searchable: true },
]

const pendingColumns = [{ key: "actions", label: "Actions", searchable: false }, ...baseColumns]

const materialReceivedColumns = [
  { key: "actionsMR", label: "Actions", searchable: false },
  ...baseColumns,
  ...indentFieldColumns,
]

const historyColumns = [
  ...baseColumns,
  ...indentFieldColumns,
  { key: "materialReceived", label: "Material Received", searchable: true },
  { key: "materialReceivedBy", label: "Received By", searchable: true },
  { key: "actual", label: "Actual", searchable: true },
]

export default function IndentCreationPage() {
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [materialReceivedOrders, setMaterialReceivedOrders] = useState<any[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(50)
  const [loading, setLoading] = useState(true)
  const [materialReceivedLoading, setMaterialReceivedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pending tab — Indent Creation process form
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [customerWantsMaterialAs, setCustomerWantsMaterialAs] = useState("")
  const [createdByPerson, setCreatedByPerson] = useState("")
  const [warehouseLocationValue, setWarehouseLocationValue] = useState("")
  const [receivingLeadTime, setReceivingLeadTime] = useState("")
  const [inventoryPhotoFile, setInventoryPhotoFile] = useState<File | null>(null)
  const [remarks, setRemarks] = useState("")

  // Material Received tab
  const [selectedMROrder, setSelectedMROrder] = useState<any>(null)
  const [isMRDialogOpen, setIsMRDialogOpen] = useState(false)
  const [materialReceivedValue, setMaterialReceivedValue] = useState("")

  // Pending tab — Edit Qty dialog
  const [editQtyOrder, setEditQtyOrder] = useState<any>(null)
  const [editQtyValues, setEditQtyValues] = useState<Record<string, string>>({})

  const [itemListDialogOpen, setItemListDialogOpen] = useState(false)
  const [itemListDialogItems, setItemListDialogItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [crmNameFilter, setCrmNameFilter] = useState("all")
  const [currentTab, setCurrentTab] = useState("pending")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )
  const [visibleMaterialReceivedColumns, setVisibleMaterialReceivedColumns] = useState<Record<string, boolean>>(
    materialReceivedColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )

  const { user: currentUser } = useAuth()

  // History: one server page per request (search / CRM / access rules run in SQL).
  const history = useServerHistory({
    url: "/api/otp-supabase/indent-creation?status=history",
    map: mapIndentCreationRowToUI,
    active: currentTab === "history",
    page: historyPage,
    pageSize: historyPageSize,
    search: searchTerm,
    crmName: crmNameFilter,
  })
  const historyOrders = history.rows
  const historyTotal = history.total
  const historyLoading = history.loading
  const fetchHistoryOrders = history.reload
  const { askConfirm, confirmDialog } = useConfirmDialog()

  const fetchPendingOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/otp-supabase/indent-creation?status=pending")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setPendingOrders(result.data.map(mapIndentCreationRowToUI))
      } else {
        setPendingOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching indent-creation pending queue:", err)
      setError(err.message)
      setPendingOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMaterialReceivedOrders = async () => {
    setMaterialReceivedLoading(true)
    try {
      const response = await fetch("/api/otp-supabase/indent-creation?status=material-received")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setMaterialReceivedOrders(result.data.map(mapIndentCreationRowToUI))
      } else {
        setMaterialReceivedOrders([])
      }
    } catch (err) {
      console.error("Error fetching indent-creation material-received queue:", err)
      setMaterialReceivedOrders([])
    } finally {
      setMaterialReceivedLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingOrders()
    fetchMaterialReceivedOrders()
  }, [])

  const filteredPendingOrders = useMemo(() => {
    let filtered = filterByAccess(pendingOrders, currentUser)
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
  }, [pendingOrders, searchTerm, crmNameFilter, currentUser])

  const crmNameOptions = useMemo(
    () => Array.from(new Set([...crmNameOptionsFrom(filterByAccess(pendingOrders, currentUser)), ...(history.facets.crmName || [])])).sort(),
    [pendingOrders, currentUser, history.facets]
  )

  const filteredMaterialReceivedOrders = useMemo(() => {
    let filtered = filterByAccess(materialReceivedOrders, currentUser)
    if (crmNameFilter !== "all") filtered = filtered.filter((order) => order.crmName === crmNameFilter)
    if (searchTerm) {
      filtered = filtered.filter((order) => {
        const searchableFields = materialReceivedColumns
          .filter((col) => col.searchable)
          .map((col) => String(order[col.key] || "").toLowerCase())
        return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()))
      })
    }
    return filtered
  }, [materialReceivedOrders, searchTerm, crmNameFilter, currentUser])

  // Already filtered and paged by the server.
  const filteredHistoryOrders = historyOrders

  // Any filter/search change can shrink the list under the current page.
  useEffect(() => { setHistoryPage(1) }, [searchTerm, crmNameFilter])

  const historyPageRows = historyOrders

  const togglePendingColumn = (columnKey: string) =>
    setVisiblePendingColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  const toggleMaterialReceivedColumn = (columnKey: string) =>
    setVisibleMaterialReceivedColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  const toggleHistoryColumn = (columnKey: string) =>
    setVisibleHistoryColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  const showAllPendingColumns = () => setVisiblePendingColumns(pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))
  const hideAllPendingColumns = () =>
    setVisiblePendingColumns(pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: col.key === "actions" }), {}))
  const showAllMaterialReceivedColumns = () =>
    setVisibleMaterialReceivedColumns(materialReceivedColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))
  const hideAllMaterialReceivedColumns = () =>
    setVisibleMaterialReceivedColumns(materialReceivedColumns.reduce((acc, col) => ({ ...acc, [col.key]: col.key === "actionsMR" }), {}))
  const showAllHistoryColumns = () => setVisibleHistoryColumns(historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))
  const hideAllHistoryColumns = () => setVisibleHistoryColumns(historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: false }), {}))

  const handleProcess = (order: any) => {
    setSelectedOrder(order)
    setCustomerWantsMaterialAs("")
    setCreatedByPerson("")
    setWarehouseLocationValue("")
    setReceivingLeadTime("")
    setInventoryPhotoFile(null)
    setRemarks("")
    setIsDialogOpen(true)
  }

  const handleProcessMR = (order: any) => {
    setSelectedMROrder(order)
    setMaterialReceivedValue("")
    setIsMRDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  // Submits the Indent Creation process form — moves the row from Pending
  // to the Material Received tab (also raises the indent, best-effort, on
  // the PFMS side — see lib/pfms.ts).
  const handleSubmit = async () => {
    if (!selectedOrder) return

    setIsSubmitting(true)
    try {
      let inventoryPhotoUrl = ""
      if (inventoryPhotoFile) {
        const formData = new FormData()
        formData.append("file", inventoryPhotoFile)
        formData.append("folder", "indent-creation")
        const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
        const uploadJson = await uploadRes.json()
        if (uploadJson.success) inventoryPhotoUrl = uploadJson.url
      }

      const response = await fetch("/api/otp-supabase/indent-creation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indentId: selectedOrder.indentId || selectedOrder.id,
          customerWantsMaterialAs,
          createdBy: createdByPerson || currentUser?.fullName || currentUser?.username || "Admin",
          warehouseLocation: warehouseLocationValue,
          receivingLeadTime,
          inventoryPhotoUrl,
          remarks,
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsDialogOpen(false)
        setSelectedOrder(null)
        await Promise.all([fetchPendingOrders(), fetchMaterialReceivedOrders()])

        // PFMS indent-generation outcome — separate from the save itself,
        // which already succeeded by this point either way.
        if (!result.pfmsConfigured) {
          toast.message("Indent saved", {
            description: "PFMS indent creation is not configured yet — recorded internally only.",
          })
        } else if (result.pfmsSuccess) {
          toast.success("PFMS indent created", {
            description: result.pfmsIndentNo ? `Indent No: ${result.pfmsIndentNo}` : undefined,
          })
        } else {
          toast.error("PFMS indent creation failed", {
            description: "Saved here, but the request to Purchase-FMS-Supabase didn't go through.",
          })
        }

        toast.success(`Order ${selectedOrder.orderNo} — indent created, moved to Material Received.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting indent-creation:", err)
      toast.error(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submits Material Received (Yes/No) — moves the row to History either
  // way, and queues the order back into Packing List's own Pending for a
  // re-check (see indent-creation/material-received/route.ts).
  const handleSubmitMR = async () => {
    if (!selectedMROrder || !materialReceivedValue) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/otp-supabase/indent-creation/material-received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indentId: selectedMROrder.indentId || selectedMROrder.id,
          materialReceived: materialReceivedValue,
          materialReceivedBy: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsMRDialogOpen(false)
        setSelectedMROrder(null)
        await fetchMaterialReceivedOrders()
        toast.success(`Order ${selectedMROrder.orderNo} — Material Received recorded. Packing List will show it again for a re-check.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting material-received:", err)
      toast.error(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditQty = (order: any) => {
    setEditQtyOrder(order)
    setEditQtyValues(
      Object.fromEntries((order.rawItems || []).map((it: any) => [it.item_name, String(it.qty ?? 0)]))
    )
  }

  const patchIndent = async (payload: Record<string, any>) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/otp-supabase/indent-creation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || "Update failed")
      return true
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveEditQty = async () => {
    if (!editQtyOrder) return
    const ok = await patchIndent({
      indentId: editQtyOrder.indentId || editQtyOrder.id,
      action: "editQty",
      items: Object.entries(editQtyValues).map(([item_name, qty]) => ({ item_name, qty: Number(qty) })),
    })
    if (ok) {
      setEditQtyOrder(null)
      await fetchPendingOrders()
    }
  }

  const handleReject = (order: any) => {
    askConfirm(
      {
        title: "Reject Indent",
        message: `Reject indent for ${order.orderNo}? It moves to History and will not go back to Packing List.`,
        confirmText: "Reject",
        destructive: true,
      },
      async () => {
        const ok = await patchIndent({
          indentId: order.indentId || order.id,
          action: "reject",
          by: currentUser?.fullName || currentUser?.username || "Admin",
        })
        if (ok) await fetchPendingOrders()
      }
    )
  }

  const renderCellContent = (order: any, columnKey: string) => {
    const value = order[columnKey]
    switch (columnKey) {
      case "actions": {
        const items = order.rawItems || []
        const zeroCount = items.filter((it: any) => !(Number(it.qty) > 0)).length
        const allZero = items.length > 0 && zeroCount === items.length
        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              {!allZero && (
                <Button
                  size="sm"
                  onClick={() => handleProcess(order)}
                  className="h-7 px-2.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Process
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEditQty(order)}
                className="h-7 px-2 text-xs font-medium border-input bg-card hover:bg-accent"
              >
                Edit Qty
              </Button>
              {allZero && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(order)}
                  disabled={isSubmitting}
                  className="h-7 px-2 text-xs font-medium"
                >
                  Reject
                </Button>
              )}
            </div>
            {zeroCount > 0 && (
              <StatusBadge tone="danger" className="w-fit text-[11px]">
                {allZero ? "All items 0 qty" : `${zeroCount} item(s) 0 qty`}
              </StatusBadge>
            )}
          </div>
        )
      }
      case "actionsMR":
        return (
          <Button
            size="sm"
            onClick={() => handleProcessMR(order)}
            className="h-7 px-2.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Process
          </Button>
        )
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
      case "inventoryPhoto":
        return order.inventoryPhotoUrl ? (
          <a href={order.inventoryPhotoUrl} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">View Photo</StatusBadge>
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">N/A</span>
        )
      case "materialReceived":
        return value ? (
          <StatusBadge tone={value === "Yes" ? "success" : value === "Rejected" ? "danger" : "warning"}>
            {value}
          </StatusBadge>
        ) : (
          ""
        )
      case "crmName":
        return value ? <StatusBadge tone="neutral">{value}</StatusBadge> : <span className="text-muted-foreground text-xs">-</span>
      default:
        return value ?? ""
    }
  }

  const columnPanel =
    currentTab === "pending"
      ? { columns: pendingColumns, visible: visiblePendingColumns, toggle: togglePendingColumn, showAll: showAllPendingColumns, hideAll: hideAllPendingColumns }
      : currentTab === "material-received"
        ? {
            columns: materialReceivedColumns,
            visible: visibleMaterialReceivedColumns,
            toggle: toggleMaterialReceivedColumn,
            showAll: showAllMaterialReceivedColumns,
            hideAll: hideAllMaterialReceivedColumns,
          }
        : { columns: historyColumns, visible: visibleHistoryColumns, toggle: toggleHistoryColumn, showAll: showAllHistoryColumns, hideAll: hideAllHistoryColumns }

  const activeRows =
    currentTab === "pending" ? filteredPendingOrders : currentTab === "material-received" ? filteredMaterialReceivedOrders : filteredHistoryOrders

  const tabs = useMemo(
    () => [
      { id: "pending", label: "Pending", count: filteredPendingOrders.length },
      { id: "material-received", label: "Material Received", count: filteredMaterialReceivedOrders.length },
      { id: "history", label: "History", count: historyTotal },
    ],
    [filteredPendingOrders.length, filteredMaterialReceivedOrders.length, historyTotal]
  )

  const activeColumns = useMemo(() => {
    return columnPanel.columns.filter((c) => columnPanel.visible[c.key])
  }, [columnPanel.columns, columnPanel.visible])

  const activeChips = useMemo(() => {
    const chips = []
    if (crmNameFilter && crmNameFilter !== "all") {
      chips.push({
        key: "crm",
        label: `CRM: ${crmNameFilter}`,
        onRemove: () => setCrmNameFilter("all"),
      })
    }
    return chips
  }, [crmNameFilter])

  const handleClearAllFilters = () => {
    setSearchTerm("")
    setCrmNameFilter("all")
  }

  const handleTabChange = (val: string) => {
    setCurrentTab(val)
    if (val === "material-received") {
      fetchMaterialReceivedOrders()
    } else if (val === "history") {
      setHistoryPage(1)
      fetchHistoryOrders()
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading indent creation queue...</span>
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
            <Button onClick={fetchPendingOrders} className="mt-4">
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
          <Button
            onClick={() => {
              fetchPendingOrders()
              fetchMaterialReceivedOrders()
              fetchHistoryOrders()
            }}
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
                col.key === "actions" || col.key === "actionsMR"
                  ? "110px"
                  : col.key === "itemList"
                  ? "70px"
                  : col.key === "companyName"
                  ? "200px"
                  : "140px",
            }))}
            data={currentTab === "history" ? historyPageRows : activeRows}
            keyExtractor={(order, idx) => order.id || order.indentId || order.orderNo || idx}
            loading={
              currentTab === "material-received"
                ? materialReceivedLoading
                : currentTab === "history"
                ? historyLoading
                : false
            }
            emptyTitle={
              searchTerm
                ? "No matching indents found"
                : currentTab === "pending"
                ? "No pending indents"
                : currentTab === "material-received"
                ? "No indents awaiting material"
                : "No processed indents found"
            }
            emptyDescription={
              searchTerm ? "Try adjusting your search terms or clearing CRM filters." : undefined
            }
            simpleFooter={currentTab !== "history"}
            currentPage={historyPage}
            itemsPerPage={historyPageSize}
            totalResults={currentTab === "history" ? filteredHistoryOrders.length : undefined}
            totalPages={Math.ceil(historyTotal / historyPageSize) || 1}
            onPageChange={setHistoryPage}
            onItemsPerPageChange={(n) => { setHistoryPageSize(n); setHistoryPage(1) }}
            itemsPerPageOptions={[25, 50, 100, 200]}
            renderRow={(order) => (
              <TableRow
                key={order.id || order.indentId || order.orderNo}
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

        {/* Pending -> Material Received: Indent Creation process form */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Process Indent Creation</DialogTitle>
              <DialogDescription>
                Shortage qty will go to Material Received pending, and an indent will be raised for it.
              </DialogDescription>
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
                <Label htmlFor="customerDecision">Customer wants material as</Label>
                <Select value={customerWantsMaterialAs} onValueChange={setCustomerWantsMaterialAs}>
                  <SelectTrigger id="customerDecision">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="When full material will available">When full material will available</SelectItem>
                    <SelectItem value="Order cancel">Order cancel</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="createdBy">Created by</Label>
                  <Select value={createdByPerson} onValueChange={setCreatedByPerson}>
                    <SelectTrigger id="createdBy">
                      <SelectValue placeholder="Select name" />
                    </SelectTrigger>
                    <SelectContent>
                      {crmNameOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouseLocation">Warehouse location</Label>
                  <Select value={warehouseLocationValue} onValueChange={setWarehouseLocationValue}>
                    <SelectTrigger id="warehouseLocation">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C.G Warehouse">C.G Warehouse</SelectItem>
                      <SelectItem value="NE Warehouse">NE Warehouse</SelectItem>
                      <SelectItem value="Maniquip Store">Maniquip Store</SelectItem>
                      <SelectItem value="Head Office">Head Office</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leadTime">Receiving lead time</Label>
                  <Input
                    type="number"
                    id="leadTime"
                    value={receivingLeadTime}
                    onChange={(e) => setReceivingLeadTime(e.target.value)}
                    placeholder="Enter no. of days"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventoryPhoto">Inventory Photo</Label>
                <Input id="inventoryPhoto" type="file" accept="image/*" onChange={(e) => setInventoryPhotoFile(e.target.files?.[0] || null)} />
                {inventoryPhotoFile && <p className="text-sm text-muted-foreground">Selected: {inventoryPhotoFile.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter remarks..." />
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

        {/* Material Received -> History: Yes/No confirmation */}
        <Dialog open={isMRDialogOpen} onOpenChange={setIsMRDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Material Received</DialogTitle>
              <DialogDescription>Confirm whether the indented material has been received.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNoMR">Order No.</Label>
                <Input id="orderNoMR" value={selectedMROrder?.orderNo || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialReceived">Material Received *</Label>
                <Select value={materialReceivedValue} onValueChange={setMaterialReceivedValue}>
                  <SelectTrigger id="materialReceived">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsMRDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitMR} disabled={!materialReceivedValue || isSubmitting}>
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

        {/* Edit Qty Dialog (Pending tab) */}
        <Dialog open={!!editQtyOrder} onOpenChange={(open) => !open && setEditQtyOrder(null)}>
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Edit Qty — {editQtyOrder?.orderNo}</DialogTitle>
              <DialogDescription>
                Set 0 for an item that&apos;s no longer needed. 0-qty items are skipped on Process; if every item is 0 you can
                Reject the indent instead.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-3">
              {Object.entries(editQtyValues).map(([itemName, qty]) => (
                <div key={itemName} className="flex items-center justify-between gap-3">
                  <Label className="text-sm font-normal">{itemName}</Label>
                  <Input
                    type="number"
                    min={0}
                    className="w-24 text-right"
                    value={qty}
                    onChange={(e) => setEditQtyValues((prev) => ({ ...prev, [itemName]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditQtyOrder(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditQty} disabled={isSubmitting}>
                Save
              </Button>
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
        {confirmDialog}
      </div>
    </MainLayout>
  )
}
