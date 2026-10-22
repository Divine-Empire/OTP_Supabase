"use client"

import { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ORDER_LOCATIONS } from "@/lib/locations"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { RefreshCw, Eye } from "lucide-react"
import { useServerHistory } from "@/hooks/use-server-history"
import { useAuth } from "@/components/auth-provider"

import { mapOrderAcceptableRowToUI } from "@/lib/otp-utils"
import { filterByAccess } from "@/lib/access"
import { MobileRecordCard } from "@/components/mobile-record-card"
import { StatusTabs, ColumnSelector, FilterSearch, FilterChips, DataTable, StatusBadge } from "@/components/shared"
import { toast } from "sonner"

// Column definitions for Pending tab
const pendingColumns = [
  { key: "actions", label: "Actions", searchable: false },
  { key: "timestamp", label: "Timestamp", searchable: true },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "crmName", label: "CRM Name", searchable: true },
  { key: "orderLocation", label: "Order Location", searchable: true },
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

// Column definitions for History tab (includes 3 additional columns)
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "isOrderAcceptable", label: "Is Order Acceptable?", searchable: true },
  { key: "orderAcceptanceChecklist", label: "Order Acceptance Checklist", searchable: true },
  { key: "remarks", label: "Remark", searchable: true },
  { key: "actual", label: "Actual", searchable: true },
]

const checklistItems = [
  "Item Specification",
  "Quantity",
  "Price",
  "Delivery Date",
  "Payment Terms",
  "Billing/Shipping Address",
]

export default function OrderAcceptablePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isAcceptable, setIsAcceptable] = useState("")
  const [checkedItems, setCheckedItems] = useState<any[]>([])
  const [remarks, setRemarks] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemListDialogOpen, setItemListDialogOpen] = useState(false)
  const [itemListDialogItems, setItemListDialogItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState("pending")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingCreFilter, setPendingCreFilter] = useState("all")
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(50)
  // Offer Show / Conveyed For Registration Form are hidden by default (still
  // toggleable via Column Visibility) — everything else starts visible.
  const DEFAULT_HIDDEN_COLUMNS = new Set(["offerShow", "conveyedForRegistration"])
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: !DEFAULT_HIDDEN_COLUMNS.has(col.key) }), {})
  )
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: !DEFAULT_HIDDEN_COLUMNS.has(col.key) }), {})
  )
  const [historyCreFilter, setHistoryCreFilter] = useState("all")
  const [creName, setCreName] = useState("")
  const { user: currentUser } = useAuth()

  // History: one server page per request (search / CRM / access rules run in SQL).
  const history = useServerHistory({
    url: "/api/otp-supabase/order-acceptable?status=history",
    map: mapOrderAcceptableRowToUI,
    active: currentTab === "history",
    page: historyPage,
    pageSize: historyPageSize,
    search: searchTerm,
    crmName: historyCreFilter,
  })
  const processedOrders = history.rows
  const processedTotal = history.total
  const processedLoading = history.loading
  const loadProcessedOrders = history.reload

  // Fetch pending orders from Supabase API
  const fetchOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/otp-supabase/order-acceptable?status=pending")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        const ordersData = result.data.map(mapOrderAcceptableRowToUI)
        setOrders(ordersData)
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching orders data:", err)
      setError(err.message)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Role-based access: 'user' role only sees rows matching their assigned
  // CRM names and location (Settings > User Management) — see lib/access.ts.
  // admin is unrestricted.
  const filteredOrders = useMemo(() => {
    let filtered = filterByAccess(orders, currentUser);

    if (searchTerm) {
      filtered = filtered.filter((order) => {
        const searchableFields = pendingColumns
          .filter((col) => col.searchable)
          .map((col) => String(order[col.key] || "").toLowerCase());

        return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()));
      });
    }

    // Apply CRM filter - only filter if pendingCreFilter is not empty and not "all"
    if (pendingCreFilter && pendingCreFilter !== "all") {
      filtered = filtered.filter((order) => order.crmName === pendingCreFilter);
    }

    return filtered;
  }, [orders, searchTerm, pendingCreFilter, currentUser]);

  // Filter orders based on status
  const pendingOrders = filteredOrders

  // Pending CRMs plus every CRM in the whole History (server facet).
  const creOptions = useMemo(() => {
    const options = new Set<string>(history.facets.crmName || [])
    filterByAccess(orders, currentUser).forEach((order) => {
      if (order.crmName) options.add(order.crmName)
    })
    return Array.from(options).sort()
  }, [orders, currentUser, history.facets])

  // Already filtered and paged by the server.

  const handleProcessedTabClick = () => {
    setHistoryPage(1)
    loadProcessedOrders()
  }

  // Any filter/search change can shrink the list under the current page.
  useEffect(() => { setHistoryPage(1) }, [searchTerm, historyCreFilter])

  const historyPageRows = processedOrders

  const handleProcess = (order: any) => {
    setSelectedOrder(order)
    setIsAcceptable("")
    setCheckedItems([])
    setRemarks("")
    setCreName("") // Reset CRE name
    setIsDialogOpen(true)
  }

  // Column visibility handlers
  const togglePendingColumn = (columnKey: string) => {
    setVisiblePendingColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }))
  }

  const toggleHistoryColumn = (columnKey: string) => {
    setVisibleHistoryColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }))
  }

  const showAllPendingColumns = () => {
    setVisiblePendingColumns(pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))
  }

  const hideAllPendingColumns = () => {
    setVisiblePendingColumns(pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: col.key === "actions" }), {}))
  }

  const showAllHistoryColumns = () => {
    setVisibleHistoryColumns(historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))
  }

  const hideAllHistoryColumns = () => {
    setVisibleHistoryColumns(historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: false }), {}))
  }

  const handleSubmit = async () => {
    // Add proper validation
    if (!selectedOrder || !isAcceptable) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)

    try {
      const acceptanceData = {
        isAcceptable,
        checklist: isAcceptable === "Yes" ? checkedItems : [],
        remarks,
        creName, // Make sure this is included
        processedAt: new Date().toISOString(),
        processedBy: currentUser?.fullName || currentUser?.username || "Admin",
      }

      const success = await updateOrderStatus(selectedOrder, acceptanceData)

      if (success) {
        setIsDialogOpen(false)
        setSelectedOrder(null)
        // Reset form fields
        setIsAcceptable("")
        setCheckedItems([])
        setRemarks("")
        setCreName("")

        toast.success(`Order ${selectedOrder.orderNo} has been updated successfully as: ${isAcceptable}`)
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      toast.error("Failed to update order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  };

  // Submits Stage 1 (Order Acceptable) — inserts a row into
  // otp_orders_acceptable, which is what moves this order from Pending to History.
  const updateOrderStatus = async (order: any, acceptanceData: any) => {
    try {
      const updateResponse = await fetch("/api/otp-supabase/order-acceptable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId || order.id,
          isAcceptable: acceptanceData.isAcceptable,
          checklist: acceptanceData.checklist,
          remarks: acceptanceData.remarks || "",
          processedBy: acceptanceData.processedBy,
        }),
      })

      const result = await updateResponse.json()

      if (result.success) {
        await fetchOrders()
        return true
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error updating order:", err)
      setError(err.message)
      return false
    }
  }

  const handleSetLocation = async (orderId: string, orderLocation: string) => {
    try {
      const res = await fetch("/api/otp-supabase/order-acceptable", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, orderLocation }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Update failed")
      const patch = (rows: any[]) => rows.map((r) => (r.orderId === orderId ? { ...r, orderLocation } : r))
      setOrders(patch)
      history.reload() // History is server-paged: refetch the current page instead of patching rows
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  // Complete renderCellContent function
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
      case "billingAddress":
      case "shippingAddress":
        return <div className="max-w-[200px] truncate" title={value}>{value}</div>
      case "quotationCopy":
      case "acceptanceCopy":
        return value && (value.startsWith("http") || value.startsWith("https")) ? (
          <a href={value} target="_blank" rel="noopener noreferrer">
            <StatusBadge tone="info">View Link</StatusBadge>
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">{value || "N/A"}</span>
        )
      case "itemList":
        return (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleViewItemList(order)}
            title="View item list"
            className="h-7 w-7 text-brand-700 hover:bg-accent"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )
      case "status":
        return <StatusBadge tone="neutral">{value}</StatusBadge>
      case "isOrderAcceptable":
        return <StatusBadge tone={value === "Yes" ? "success" : "danger"}>{value || "N/A"}</StatusBadge>
      case "crmName":
        return value ? <StatusBadge tone="neutral">{value}</StatusBadge> : <span className="text-muted-foreground text-xs">-</span>
      case "orderLocation":
        if (currentUser?.role !== "admin") {
          return value ? <StatusBadge tone="info">{value}</StatusBadge> : <span className="text-muted-foreground text-xs">Not set</span>
        }
        return (
          <Select value={value || undefined} onValueChange={(loc) => handleSetLocation(order.orderId, loc)}>
            <SelectTrigger className={`h-7 w-[150px] text-xs ${value ? "" : "border-warning/50 text-warning-foreground"}`}>
              <SelectValue placeholder="Set location" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_LOCATIONS.map((loc) => (
                <SelectItem key={loc.label} value={loc.label} className="text-xs">
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case "orderAcceptanceChecklist":
      case "remarks":
        return <div className="max-w-[150px] truncate" title={value}>{value}</div>
      default:
        return value || ""
    }
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading orders...</span>
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

  const activeColumns = (currentTab === "pending" ? pendingColumns : historyColumns).filter(
    (col) => (currentTab === "pending" ? visiblePendingColumns[col.key] : visibleHistoryColumns[col.key])
  )
  const activeCrmFilter = currentTab === "pending" ? pendingCreFilter : historyCreFilter
  const setActiveCrmFilter = currentTab === "pending" ? setPendingCreFilter : setHistoryCreFilter

  const activeChips = []
  if (searchTerm) {
    activeChips.push({
      key: "search",
      label: `Search: "${searchTerm}"`,
      onRemove: () => setSearchTerm(""),
    })
  }
  if (activeCrmFilter && activeCrmFilter !== "all") {
    activeChips.push({
      key: "crm",
      label: `CRM: ${activeCrmFilter}`,
      onRemove: () => setActiveCrmFilter("all"),
    })
  }

  const handleClearAllFilters = () => {
    setSearchTerm("")
    setActiveCrmFilter("all")
  }

  return (
    <MainLayout fitViewport>
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        {/* One toolbar row; the table below fills the rest of the screen and scrolls inside its own card, so the page itself never scrolls. */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusTabs
            tabs={[
              { id: "pending", label: "Pending", count: pendingOrders.length },
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
            <Select value={activeCrmFilter} onValueChange={setActiveCrmFilter}>
              <SelectTrigger className="h-9 text-xs border-input bg-card">
                <SelectValue placeholder="All CRM Names" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All CRM Names
                </SelectItem>
                {creOptions.map((cre) => (
                  <SelectItem key={cre} value={cre} className="text-xs">
                    {cre}
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
            options={currentTab === "pending" ? pendingColumns : historyColumns}
            visible={currentTab === "pending" ? visiblePendingColumns : visibleHistoryColumns}
            onToggle={currentTab === "pending" ? togglePendingColumn : toggleHistoryColumn}
            onSelectAll={currentTab === "pending" ? showAllPendingColumns : showAllHistoryColumns}
            onHideAll={currentTab === "pending" ? hideAllPendingColumns : hideAllHistoryColumns}
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
                  ? "70px"
                  : col.key === "companyName"
                  ? "220px"
                  : col.key === "billingAddress" || col.key === "shippingAddress"
                  ? "180px"
                  : "140px",
            }))}
            data={currentTab === "pending" ? pendingOrders : historyPageRows}
            keyExtractor={(order, idx) => order.id || order.orderId || order.orderNo || idx}
            loading={currentTab === "history" && processedLoading}
            emptyTitle={
              searchTerm
                ? "No matching orders found"
                : currentTab === "pending"
                ? "No pending orders"
                : "No history orders"
            }
            emptyDescription={
              searchTerm ? "Try adjusting your search terms or clearing CRM filters." : undefined
            }
            simpleFooter={currentTab === "pending"}
            currentPage={historyPage}
            itemsPerPage={historyPageSize}
            totalResults={currentTab === "pending" ? undefined : processedTotal}
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
                columns={currentTab === "pending" ? pendingColumns : historyColumns}
                visibleColumns={currentTab === "pending" ? visiblePendingColumns : visibleHistoryColumns}
                record={order}
                renderCellContent={renderCellContent}
              />
            )}
          />
        </div>

        {/* Process Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Process Order Acceptable</DialogTitle>
              <DialogDescription>Review and process the order acceptance</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNo">Order No.</Label>
                <Input id="orderNo" value={selectedOrder?.orderNo || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" value={selectedOrder?.companyName || ""} disabled />
              </div>
              {/* <div className="space-y-2">
  <Label htmlFor="creName">CRE Name *</Label>
  <Select value={creName} onValueChange={setCreName}>
    <SelectTrigger>
      <SelectValue placeholder="Select CRE Name" />
    </SelectTrigger>
    <SelectContent>
      {creOptions.map((cre) => (
        <SelectItem key={cre} value={cre}>
          {cre}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div> */}
              <div className="space-y-2">
                <Label htmlFor="acceptable">Is Order Acceptable? *</Label>
                <Select value={isAcceptable} onValueChange={setIsAcceptable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                    <SelectItem value="Order Cancel">Order Cancel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isAcceptable === "Yes" && (
                <div className="space-y-2">
                  <Label>Order Acceptance Checklist</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {checklistItems.map((item) => (
                      <div key={item} className="flex items-center space-x-2">
                        <Checkbox
                          id={item}
                          checked={checkedItems.includes(item)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCheckedItems([...checkedItems, item])
                            } else {
                              setCheckedItems(checkedItems.filter((i) => i !== item))
                            }
                          }}
                        />
                        <Label htmlFor={item} className="text-sm">
                          {item}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter any remarks..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isAcceptable || isSubmitting}
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Item List</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemListDialogItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No items
                      </TableCell>
                    </TableRow>
                  ) : (
                    itemListDialogItems.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {item.rate != null ? `₹${Number(item.rate).toLocaleString("en-IN")}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.rate != null ? `₹${(Number(item.rate) * Number(item.quantity || 0)).toLocaleString("en-IN")}` : "-"}
                        </TableCell>
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