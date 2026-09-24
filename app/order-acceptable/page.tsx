"use client"

import { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { RefreshCw, Search, Settings, Eye } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

import { mapOrderAcceptableRowToUI } from "@/lib/otp-utils"
import { filterByCrmAccess } from "@/lib/crm-access"
import { MobileRecordCard } from "@/components/mobile-record-card"

// Column definitions for Pending tab
const pendingColumns = [
  { key: "actions", label: "Actions", searchable: false },
  { key: "timestamp", label: "Timestamp", searchable: true },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "crmName", label: "CRM Name", searchable: true },
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
]

// Column definitions for History tab (includes 3 additional columns)
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "isOrderAcceptable", label: "Is Order Acceptable?", searchable: true },
  { key: "orderAcceptanceChecklist", label: "Order Acceptance Checklist", searchable: true },
  { key: "remarks", label: "Remark", searchable: true },
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
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewOrder, setViewOrder] = useState<any>(null)
  const [itemListDialogOpen, setItemListDialogOpen] = useState(false)
  const [itemListDialogItems, setItemListDialogItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState("pending")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingCreFilter, setPendingCreFilter] = useState("all")
  const [processedOrders, setProcessedOrders] = useState<any[]>([])
  const [processedLoading, setProcessedLoading] = useState(false)
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
  const [creFilter, setCreFilter] = useState("all")
  const { user: currentUser } = useAuth()

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

  // Fetch history orders from Supabase API
  const fetchProcessedOrders = async () => {
    try {
      const response = await fetch("/api/otp-supabase/order-acceptable?status=history")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        return result.data.map(mapOrderAcceptableRowToUI)
      }
      return []
    } catch (err) {
      console.error("Error fetching processed orders data:", err)
      return []
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Role-based access: 'user' role only sees rows whose crmName is in their
  // assignedCrmNames (Settings > User Management) — see lib/crm-access.ts.
  // admin is unrestricted.
  const filteredOrders = useMemo(() => {
    let filtered = filterByCrmAccess(orders, currentUser);

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

  const creOptions = useMemo(() => {
    const options = new Set<string>()
    filterByCrmAccess(orders, currentUser).forEach((order) => {
      if (order.crmName) options.add(order.crmName)
    })
    return Array.from(options)
  }, [orders, currentUser])

  const filteredProcessedOrders = useMemo(() => {
    let filtered = filterByCrmAccess(processedOrders, currentUser);

    if (searchTerm) {
      filtered = filtered.filter((order) => {
        const searchableFields = historyColumns
          .filter((col) => col.searchable)
          .map((col) => String(order[col.key] || "").toLowerCase());

        return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()));
      });
    }

    if (historyCreFilter && historyCreFilter !== "all") {
      filtered = filtered.filter((order) => order.crmName === historyCreFilter);
    }

    return filtered;
  }, [processedOrders, searchTerm, historyCreFilter, currentUser]);

  const handleProcessedTabClick = async () => {
    setProcessedLoading(true)
    const processed = await fetchProcessedOrders()
    setProcessedOrders(processed)
    setProcessedLoading(false)
  }

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
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const acceptanceData = {
        isAcceptable,
        checklist: isAcceptable === "Yes" ? checkedItems : [],
        remarks,
        creName, // Make sure this is included
        processedAt: new Date().toISOString(),
        processedBy: currentUser?.fullName || currentUser?.username || "Admin",
      };

      const success = await updateOrderStatus(selectedOrder, acceptanceData);

      if (success) {
        setIsDialogOpen(false);
        setSelectedOrder(null);
        // Reset form fields
        setIsAcceptable("");
        setCheckedItems([]);
        setRemarks("");
        setCreName("");

        alert(`Order ${selectedOrder.orderNo} has been updated successfully as: ${isAcceptable}`);
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      alert("Failed to update order. Please try again.");
    } finally {
      setIsSubmitting(false);
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

  // Complete renderCellContent function
  const renderCellContent = (order: any, columnKey: string) => {
    const value = order[columnKey]

    switch (columnKey) {
      case "actions":
        return (
          <Button size="sm" onClick={() => handleProcess(order)}>
            Process
          </Button>
        )
      case "billingAddress":
      case "shippingAddress":
        return <div className="address-cell">{value}</div>
      case "quotationCopy":
      // return <Badge variant={value === "Available" ? "default" : "secondary"}>{value || "N/A"}</Badge>
      case "acceptanceCopy":
        return value && (value.startsWith("http") || value.startsWith("https")) ? (
          <a href={value} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">Link</Badge>
          </a>
        ) : (
          <Badge variant="secondary">{value || "N/A"}</Badge>
        )
      case "itemList":
        return (
          <Button size="icon" variant="ghost" onClick={() => handleViewItemList(order)} title="View item list">
            <Eye className="h-4 w-4" />
          </Button>
        )
      case "status":
        return <Badge variant="outline">{value}</Badge>
      case "isOrderAcceptable":
        return <Badge variant={value === "Yes" ? "default" : "destructive"}>{value || "N/A"}</Badge>
      case "crmName":
        return <Badge variant="outline">{value || "N/A"}</Badge>
      case "orderAcceptanceChecklist":
      case "remarks":
        return <div className="max-w-[150px] truncate">{value}</div>
      default:
        return value || ""
    }
  }

  const handleView = (order: any) => {
    setViewOrder(order)
    setViewDialogOpen(true)
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
            <h1 className="text-2xl font-bold text-red-600">Error Loading Data</h1>
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
    <MainLayout>
      <div className="p-2 h-[calc(100vh-5rem)] md:h-[calc(100vh-5.5rem)] flex flex-col">
        <Tabs
          value={currentTab}
          onValueChange={(value) => setCurrentTab(value)}
          className="flex-1 flex flex-col min-h-0"
        >
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="border-b py-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
                  <TabsTrigger value="history" onClick={handleProcessedTabClick}>
                    History ({filteredProcessedOrders.length})
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-4 flex-1 max-w-2xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search across all columns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {currentTab === "pending" && (
                    <div className="w-[200px]">
                      <Select value={pendingCreFilter} onValueChange={setPendingCreFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All CRM Names" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All CRM Names</SelectItem>
                          {creOptions.map((cre) => (
                            <SelectItem key={cre} value={cre}>
                              {cre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {currentTab === "history" && (
                    <div className="w-[200px]">
                      <Select value={historyCreFilter} onValueChange={setHistoryCreFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All CRM Names" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All CRM Names</SelectItem>
                          {creOptions.map((cre) => (
                            <SelectItem key={cre} value={cre}>
                              {cre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={fetchOrders} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Column Visibility
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                      <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="flex gap-2 p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={currentTab === "pending" ? showAllPendingColumns : showAllHistoryColumns}
                        >
                          Show All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={currentTab === "pending" ? hideAllPendingColumns : hideAllHistoryColumns}
                        >
                          Hide All
                        </Button>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="p-2 space-y-2">
                        {(currentTab === "pending" ? pendingColumns : historyColumns).map((column) => {
                          const visibleCols = currentTab === "pending" ? visiblePendingColumns : visibleHistoryColumns;
                          const toggleCol = currentTab === "pending" ? togglePendingColumn : toggleHistoryColumn;
                          return (
                            <div key={column.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={`col-${column.key}`}
                                checked={visibleCols[column.key]}
                                onCheckedChange={() => toggleCol(column.key)}
                              />
                              <Label htmlFor={`col-${column.key}`} className="text-sm">
                                {column.label}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 min-h-0 flex flex-col">
              <TabsContent value="pending" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
                {/* Mobile: one card per record */}
                <div className="md:hidden space-y-3 overflow-y-auto flex-1">
                  {pendingOrders.map((order, idx) => (
                    <MobileRecordCard
                      key={order.id || order.orderId || order.orderNo || idx}
                      columns={pendingColumns}
                      visibleColumns={visiblePendingColumns}
                      record={order}
                      renderCellContent={renderCellContent}
                    />
                  ))}
                  {pendingOrders.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? "No orders match your search criteria" : "No pending orders found"}
                    </p>
                  )}
                </div>

                {/* Desktop: synchronized table with flex-1 */}
                <div className="hidden md:flex flex-col flex-1 min-h-0 border rounded-lg overflow-hidden relative">
                  <div className="overflow-auto flex-1 min-h-0">
                    <Table className="w-full relative">
                      <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                        <TableRow>
                          {pendingColumns
                            .filter((col) => visiblePendingColumns[col.key])
                            .map((column) => (
                              <TableHead
                                key={column.key}
                                className="bg-gray-50 font-semibold text-gray-900 px-4 py-3 whitespace-nowrap"
                                style={{
                                  minWidth: column.key === 'actions' ? '120px' :
                                    column.key === 'itemList' ? '90px' :
                                      column.key === 'timestamp' ? '130px' :
                                        column.key === 'orderNo' ? '120px' :
                                          column.key === 'crmName' ? '150px' :
                                            column.key === 'quotationNo' ? '150px' :
                                              column.key === 'companyName' ? '250px' :
                                                column.key === 'contactPersonName' ? '180px' :
                                                  column.key === 'contactNumber' ? '140px' :
                                                    column.key === 'billingAddress' ? '200px' :
                                                      column.key === 'shippingAddress' ? '200px' :
                                                        '160px',
                                }}
                              >
                                {column.label}
                              </TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingOrders.map((order, idx) => (
                          <TableRow key={order.id || order.orderId || order.orderNo || idx} className="hover:bg-gray-50">
                            {pendingColumns
                              .filter((col) => visiblePendingColumns[col.key])
                              .map((column) => (
                                <TableCell
                                  key={column.key}
                                  className="border-b px-4 py-3 align-top"
                                  style={{
                                    minWidth: column.key === 'actions' ? '120px' :
                                      column.key === 'itemList' ? '90px' :
                                        column.key === 'timestamp' ? '130px' :
                                          column.key === 'orderNo' ? '120px' :
                                            column.key === 'crmName' ? '150px' :
                                              column.key === 'quotationNo' ? '150px' :
                                                column.key === 'companyName' ? '250px' :
                                                  column.key === 'contactPersonName' ? '180px' :
                                                    column.key === 'contactNumber' ? '140px' :
                                                      column.key === 'billingAddress' ? '200px' :
                                                        column.key === 'shippingAddress' ? '200px' :
                                                          '160px',
                                  }}
                                >
                                  <div className="break-words whitespace-normal leading-relaxed">
                                    {renderCellContent(order, column.key)}
                                  </div>
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                        {pendingOrders.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={pendingColumns.filter((col) => visiblePendingColumns[col.key]).length}
                              className="text-center text-muted-foreground h-32"
                            >
                              {searchTerm
                                ? "No orders match your search criteria"
                                : "No pending orders found"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
                {processedLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading processed orders...</span>
                  </div>
                ) : (
                  <>
                    {/* Mobile */}
                    <div className="md:hidden space-y-3 overflow-y-auto flex-1">
                      {filteredProcessedOrders.map((order, idx) => (
                        <MobileRecordCard
                          key={order.id || order.orderId || order.orderNo || idx}
                          columns={historyColumns}
                          visibleColumns={visibleHistoryColumns}
                          record={order}
                          renderCellContent={renderCellContent}
                        />
                      ))}
                      {filteredProcessedOrders.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          {searchTerm ? "No orders match your search criteria" : "No history orders found"}
                        </p>
                      )}
                    </div>

                    {/* Desktop: synchronized table with flex-1 */}
                    <div className="hidden md:flex flex-col flex-1 min-h-0 border rounded-lg overflow-hidden relative">
                      <div className="overflow-auto flex-1 min-h-0">
                        <Table className="w-full relative">
                          <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                            <TableRow>
                              {historyColumns
                                .filter((col) => visibleHistoryColumns[col.key])
                                .map((column) => (
                                  <TableHead
                                    key={column.key}
                                    className="bg-gray-50 font-semibold text-gray-900 px-4 py-3 whitespace-nowrap"
                                    style={{
                                      minWidth: column.key === 'actions' ? '120px' :
                                        column.key === 'itemList' ? '90px' :
                                          column.key === 'timestamp' ? '130px' :
                                            column.key === 'orderNo' ? '120px' :
                                              column.key === 'crmName' ? '150px' :
                                                column.key === 'quotationNo' ? '150px' :
                                                  column.key === 'companyName' ? '250px' :
                                                    column.key === 'contactPersonName' ? '180px' :
                                                      column.key === 'contactNumber' ? '140px' :
                                                        column.key === 'billingAddress' ? '200px' :
                                                          column.key === 'shippingAddress' ? '200px' :
                                                            '160px',
                                    }}
                                  >
                                    {column.label}
                                  </TableHead>
                                ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredProcessedOrders.map((order, idx) => (
                              <TableRow key={order.id || order.orderId || order.orderNo || idx} className="hover:bg-gray-50">
                                {historyColumns
                                  .filter((col) => visibleHistoryColumns[col.key])
                                  .map((column) => (
                                    <TableCell
                                      key={column.key}
                                      className="border-b px-4 py-3 align-top"
                                      style={{
                                        minWidth: column.key === 'actions' ? '120px' :
                                          column.key === 'itemList' ? '90px' :
                                            column.key === 'timestamp' ? '130px' :
                                              column.key === 'orderNo' ? '120px' :
                                                column.key === 'crmName' ? '150px' :
                                                  column.key === 'quotationNo' ? '150px' :
                                                    column.key === 'companyName' ? '250px' :
                                                      column.key === 'contactPersonName' ? '180px' :
                                                        column.key === 'contactNumber' ? '140px' :
                                                          column.key === 'billingAddress' ? '200px' :
                                                            column.key === 'shippingAddress' ? '200px' :
                                                              '160px',
                                      }}
                                    >
                                      <div className="break-words whitespace-normal leading-relaxed">
                                        {renderCellContent(order, column.key)}
                                      </div>
                                    </TableCell>
                                  ))}
                              </TableRow>
                            ))}
                            {filteredProcessedOrders.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={historyColumns.filter((col) => visibleHistoryColumns[col.key]).length}
                                  className="text-center text-muted-foreground h-32"
                                >
                                  {searchTerm
                                    ? "No orders match your search criteria"
                                    : "No history orders found"}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

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
                  disabled={!isAcceptable || isSubmitting || (currentUser?.role === "user")}
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

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>View order information and processing details</DialogDescription>
            </DialogHeader>
            {viewOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Order No.</Label>
                    <p className="text-sm">{viewOrder.id}</p>
                  </div>
                  <div>
                    <Label>Company Name</Label>
                    <p className="text-sm">{viewOrder.companyName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Person</Label>
                    <p className="text-sm">{viewOrder.contactPerson}</p>
                  </div>
                  <div>
                    <Label>Contact Number</Label>
                    <p className="text-sm">{viewOrder.contactNumber}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>PO Number</Label>
                    <p className="text-sm">{viewOrder.poNumber}</p>
                  </div>
                  <div>
                    <Label>Payment Mode</Label>
                    <p className="text-sm">{viewOrder.paymentMode}</p>
                  </div>
                </div>
                {viewOrder.acceptanceData && (
                  <div>
                    <Label>Acceptance Status</Label>
                    <p className="text-sm">{viewOrder.acceptanceData.isAcceptable}</p>
                    {viewOrder.acceptanceData.remarks && (
                      <div className="mt-2">
                        <Label>Remarks</Label>
                        <p className="text-sm">{viewOrder.acceptanceData.remarks}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Item List Dialog */}
        <Dialog open={itemListDialogOpen} onOpenChange={setItemListDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Item List</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
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
                      <TableCell className="text-right">{item.quantity}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex justify-end">
              <Button onClick={() => setItemListDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}