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
import { Checkbox } from "@/components/ui/checkbox"
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
import { mapProformaInvoicePendingRowToUI, mapProformaInvoiceHistoryRowToUI } from "@/lib/otp-utils"
import { MobileRecordCard } from "@/components/mobile-record-card"

// Column definitions for Pending tab
const pendingColumns = [
  { key: "actions", label: "Actions", searchable: false },
  { key: "timestamp", label: "Timestamp", searchable: true },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "quotationNo", label: "Quotation No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "contactPersonName", label: "Contact Person Name", searchable: true },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "paymentMode", label: "Payment Mode", searchable: true },
  { key: "amount", label: "Amount", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "piNumber", label: "PI Number", searchable: true },
  { key: "piAmount", label: "PI Amount", searchable: false },
  { key: "piUpload", label: "PI Upload", searchable: false },
  { key: "remark", label: "Remark", searchable: true },
  { key: "createdBy", label: "Created By", searchable: true },
]

export default function ProformaInvoicePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [processedOrders, setProcessedOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processedLoading, setProcessedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [piNumber, setPiNumber] = useState("")
  const [piAmount, setPiAmount] = useState("")
  const [piUploadFile, setPiUploadFile] = useState<File | null>(null)
  const [remark, setRemark] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemListDialogOpen, setItemListDialogOpen] = useState(false)
  const [itemListDialogItems, setItemListDialogItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )
  const { user: currentUser } = useAuth()

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/otp-supabase/proforma-invoice?status=pending")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data.map(mapProformaInvoicePendingRowToUI))
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching proforma-invoice pending queue:", err)
      setError(err.message)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProcessedOrders = async () => {
    setProcessedLoading(true)
    try {
      const response = await fetch("/api/otp-supabase/proforma-invoice?status=history")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setProcessedOrders(result.data.map(mapProformaInvoiceHistoryRowToUI))
      } else {
        setProcessedOrders([])
      }
    } catch (err) {
      console.error("Error fetching proforma-invoice history:", err)
      setProcessedOrders([])
    } finally {
      setProcessedLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleProcessedTabClick = async () => {
    await fetchProcessedOrders()
  }

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders
    return orders.filter((order) => {
      const searchableFields = pendingColumns
        .filter((col) => col.searchable)
        .map((col) => String(order[col.key] || "").toLowerCase())
      return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()))
    })
  }, [orders, searchTerm])

  const filteredProcessedOrders = useMemo(() => {
    if (!searchTerm) return processedOrders
    return processedOrders.filter((order) => {
      const searchableFields = historyColumns
        .filter((col) => col.searchable)
        .map((col) => String(order[col.key] || "").toLowerCase())
      return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()))
    })
  }, [processedOrders, searchTerm])

  const togglePendingColumn = (columnKey: string) =>
    setVisiblePendingColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  const toggleHistoryColumn = (columnKey: string) =>
    setVisibleHistoryColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  const showAllPendingColumns = () =>
    setVisiblePendingColumns(pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))
  const hideAllPendingColumns = () =>
    setVisiblePendingColumns(pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: col.key === "actions" }), {}))
  const showAllHistoryColumns = () =>
    setVisibleHistoryColumns(historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))
  const hideAllHistoryColumns = () =>
    setVisibleHistoryColumns(historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: false }), {}))

  const handleProcess = (order: any) => {
    setSelectedOrder(order)
    setPiNumber("")
    setPiAmount("")
    setPiUploadFile(null)
    setRemark("")
    setIsDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  // Submits Pro-Forma Invoice — inserts a row into otp_proforma_invoice,
  // which moves this order from Pending to History here, AND is what
  // unlocks Check Inventory's own planned date for this order (see
  // app/api/otp-supabase/proforma-invoice/route.ts POST).
  const handleSubmit = async () => {
    if (!selectedOrder) return
    if (!piNumber.trim() || !piAmount || !piUploadFile) {
      alert("PI Number, PI Amount and PI Upload are required")
      return
    }

    setIsSubmitting(true)
    try {
      let piUploadUrl = ""
      if (piUploadFile) {
        const formData = new FormData()
        formData.append("file", piUploadFile)
        formData.append("folder", "proforma-invoice")
        const uploadRes = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
        const uploadJson = await uploadRes.json()
        if (uploadJson.success) piUploadUrl = uploadJson.url
      }

      const response = await fetch("/api/otp-supabase/proforma-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.orderId || selectedOrder.id,
          piNumber: piNumber.trim(),
          piAmount,
          piUploadUrl,
          remark,
          createdBy: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsDialogOpen(false)
        setSelectedOrder(null)
        await fetchOrders()
        alert(`Order ${selectedOrder.orderNo} — Pro-Forma Invoice recorded. Check Inventory is now scheduled.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting proforma-invoice:", err)
      alert(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderCellContent = (order: any, columnKey: string) => {
    const value = order[columnKey]
    switch (columnKey) {
      case "actions":
        return (
          <Button size="sm" onClick={() => handleProcess(order)} disabled={currentUser?.role === "user"}>
            {currentUser?.role === "user" ? "View Only" : "Process"}
          </Button>
        )
      case "itemList":
        return (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
            onClick={() => handleViewItemList(order)}
          >
            <Eye className="h-3.5 w-3.5" />
            View Items
          </Button>
        )
      case "piUpload":
        return order.piUploadUrl ? (
          <a href={order.piUploadUrl} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">Link</Badge>
          </a>
        ) : (
          <Badge variant="secondary">N/A</Badge>
        )
      case "amount":
      case "piAmount":
        return value ? `₹${Number(value).toLocaleString()}` : ""
      default:
        return value || ""
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading pro-forma invoice queue...</span>
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Pro-Forma Invoice
            </h1>
            {currentUser && (
              <p className="text-sm text-muted-foreground mt-1">
                Logged in as: {currentUser.fullName} ({currentUser.role})
              </p>
            )}
          </div>
          <Button onClick={fetchOrders} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({filteredOrders.length})</TabsTrigger>
            <TabsTrigger value="history" onClick={handleProcessedTabClick}>
              History ({filteredProcessedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Pending Pro-Forma Invoice</CardTitle>
                    <CardDescription>Accepted orders paying "pi against advance"</CardDescription>
                  </div>
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
                        <Button size="sm" variant="outline" onClick={showAllPendingColumns}>
                          Show All
                        </Button>
                        <Button size="sm" variant="outline" onClick={hideAllPendingColumns}>
                          Hide All
                        </Button>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="p-2 space-y-2">
                        {pendingColumns.map((column) => (
                          <div key={column.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`pending-${column.key}`}
                              checked={visiblePendingColumns[column.key]}
                              onCheckedChange={() => togglePendingColumn(column.key)}
                            />
                            <Label htmlFor={`pending-${column.key}`} className="text-sm">
                              {column.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="md:hidden space-y-3">
                  {filteredOrders.map((order, idx) => (
                    <MobileRecordCard
                      key={order.id || idx}
                      columns={pendingColumns}
                      visibleColumns={visiblePendingColumns}
                      record={order}
                      renderCellContent={renderCellContent}
                    />
                  ))}
                  {filteredOrders.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? "No orders match your search criteria" : "No pending pro-forma invoices"}
                    </p>
                  )}
                </div>

                <div className="hidden md:block border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: "max-content" }}>
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-gray-50">
                          <TableRow>
                            {pendingColumns
                              .filter((col) => visiblePendingColumns[col.key])
                              .map((column) => (
                                <TableHead key={column.key} className="bg-gray-50 font-semibold text-gray-900 border-b-2 border-gray-200 px-4 py-3">
                                  <div className="break-words">{column.label}</div>
                                </TableHead>
                              ))}
                          </TableRow>
                        </TableHeader>
                      </Table>
                      <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
                        <Table>
                          <TableBody>
                            {filteredOrders.map((order, idx) => (
                              <TableRow key={order.id || idx} className="hover:bg-gray-50">
                                {pendingColumns
                                  .filter((col) => visiblePendingColumns[col.key])
                                  .map((column) => (
                                    <TableCell key={column.key} className="border-b px-4 py-3 align-top">
                                      <div className="break-words whitespace-normal leading-relaxed">
                                        {renderCellContent(order, column.key)}
                                      </div>
                                    </TableCell>
                                  ))}
                              </TableRow>
                            ))}
                            {filteredOrders.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={pendingColumns.filter((col) => visiblePendingColumns[col.key]).length}
                                  className="text-center text-muted-foreground h-32"
                                >
                                  {searchTerm ? "No orders match your search criteria" : "No pending pro-forma invoices"}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Pro-Forma Invoice History</CardTitle>
                    <CardDescription>Orders already pro-forma invoiced</CardDescription>
                  </div>
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
                        <Button size="sm" variant="outline" onClick={showAllHistoryColumns}>
                          Show All
                        </Button>
                        <Button size="sm" variant="outline" onClick={hideAllHistoryColumns}>
                          Hide All
                        </Button>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="p-2 space-y-2">
                        {historyColumns.map((column) => (
                          <div key={column.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`history-${column.key}`}
                              checked={visibleHistoryColumns[column.key]}
                              onCheckedChange={() => toggleHistoryColumn(column.key)}
                            />
                            <Label htmlFor={`history-${column.key}`} className="text-sm">
                              {column.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {processedLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading history...</span>
                  </div>
                ) : (
                  <>
                    <div className="md:hidden space-y-3">
                      {filteredProcessedOrders.map((order, idx) => (
                        <MobileRecordCard
                          key={order.id || idx}
                          columns={historyColumns}
                          visibleColumns={visibleHistoryColumns}
                          record={order}
                          renderCellContent={renderCellContent}
                        />
                      ))}
                      {filteredProcessedOrders.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          {searchTerm ? "No orders match your search criteria" : "No processed orders found"}
                        </p>
                      )}
                    </div>

                    <div className="hidden md:block border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <div style={{ minWidth: "max-content" }}>
                          <Table>
                            <TableHeader className="sticky top-0 z-10 bg-gray-50">
                              <TableRow>
                                {historyColumns
                                  .filter((col) => visibleHistoryColumns[col.key])
                                  .map((column) => (
                                    <TableHead key={column.key} className="bg-gray-50 font-semibold text-gray-900 border-b-2 border-gray-200 px-4 py-3">
                                      <div className="break-words">{column.label}</div>
                                    </TableHead>
                                  ))}
                              </TableRow>
                            </TableHeader>
                          </Table>
                          <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
                            <Table>
                              <TableBody>
                                {filteredProcessedOrders.map((order, idx) => (
                                  <TableRow key={order.id || idx} className="hover:bg-gray-50">
                                    {historyColumns
                                      .filter((col) => visibleHistoryColumns[col.key])
                                      .map((column) => (
                                        <TableCell key={column.key} className="border-b px-4 py-3 align-top">
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
                                      {searchTerm ? "No orders match your search criteria" : "No processed orders found"}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Process Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Process Pro-Forma Invoice</DialogTitle>
              <DialogDescription>Enter the Pro-Forma Invoice details for this order</DialogDescription>
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
                  <Label htmlFor="piNumber">PI Number *</Label>
                  <Input
                    id="piNumber"
                    value={piNumber}
                    onChange={(e) => setPiNumber(e.target.value)}
                    placeholder="Enter PI number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="piAmount">PI Amount *</Label>
                  <Input
                    id="piAmount"
                    type="number"
                    value={piAmount}
                    onChange={(e) => setPiAmount(e.target.value)}
                    placeholder="Enter PI amount"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="piUpload">PI Upload *</Label>
                <Input id="piUpload" type="file" onChange={(e) => setPiUploadFile(e.target.files?.[0] || null)} />
                {piUploadFile && <p className="text-sm text-muted-foreground">Selected: {piUploadFile.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remark">Remarks</Label>
                <Input id="remark" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Enter any remarks..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!piNumber.trim() || !piAmount || !piUploadFile || isSubmitting}
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
