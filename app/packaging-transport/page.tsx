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
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { RefreshCw, Search, Settings, Eye } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { mapPackagingTransportPendingRowToUI, mapPackagingTransportHistoryRowToUI } from "@/lib/otp-utils"
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
  { key: "invoiceNumber", label: "Invoice Number", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "transporterName", label: "Transporter Name", searchable: true },
  { key: "transporterContact", label: "Transporter Contact", searchable: true },
  { key: "biltyNumber", label: "Bilty/Docket No.", searchable: true },
  { key: "freightCharge", label: "Freight Charge", searchable: false },
  { key: "hamaliCharge", label: "Hamali Charge", searchable: false },
  { key: "parkingCharge", label: "Parking Charge", searchable: false },
  { key: "expenseAmount", label: "Expense Amount", searchable: false },
  { key: "beforePhoto", label: "Before Photo", searchable: false },
  { key: "afterPhoto", label: "After Photo", searchable: false },
  { key: "biltyUpload", label: "Bilty Upload", searchable: false },
  { key: "transporterRemarks", label: "Transporter Assign", searchable: true },
  { key: "dispatchStatus", label: "Dispatch Status", searchable: false },
  { key: "notOkReason", label: "Reason for Not Okay", searchable: true },
  { key: "createdBy", label: "Created By", searchable: true },
]

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
  const [processedOrders, setProcessedOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processedLoading, setProcessedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const [beforePhotoFiles, setBeforePhotoFiles] = useState<File[]>([])
  const [afterPhotoFiles, setAfterPhotoFiles] = useState<File[]>([])
  const [biltyUploadFiles, setBiltyUploadFiles] = useState<File[]>([])
  const [transporterName, setTransporterName] = useState("")
  const [transporterContact, setTransporterContact] = useState("")
  const [biltyNumber, setBiltyNumber] = useState("")
  const [freightCharge, setFreightCharge] = useState("")
  const [hamaliCharge, setHamaliCharge] = useState("")
  const [parkingCharge, setParkingCharge] = useState("")
  const [transporterRemarks, setTransporterRemarks] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [dispatchStatus, setDispatchStatus] = useState("okay")
  const [notOkReason, setNotOkReason] = useState("")

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemListDialogOpen, setItemListDialogOpen] = useState(false)
  const [itemListDialogItems, setItemListDialogItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState("pending")
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

  const fetchProcessedOrders = async () => {
    setProcessedLoading(true)
    try {
      const response = await fetch("/api/otp-supabase/packaging-transport?status=history")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setProcessedOrders(result.data.map(mapPackagingTransportHistoryRowToUI))
      } else {
        setProcessedOrders([])
      }
    } catch (err) {
      console.error("Error fetching packaging-transport history:", err)
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
    setBeforePhotoFiles([])
    setAfterPhotoFiles([])
    setBiltyUploadFiles([])
    setTransporterName("")
    setTransporterContact("")
    setBiltyNumber("")
    setFreightCharge("")
    setHamaliCharge("")
    setParkingCharge("")
    setTransporterRemarks("")
    setExpenseAmount("")
    setDispatchStatus("okay")
    setNotOkReason("")
    setIsDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  // Submits Packaging and Transport — inserts a row into
  // otp_packaging_transport (one per otp_calibration_certificate record),
  // which is what moves this order from Pending to History here.
  const handleSubmit = async () => {
    if (!selectedOrder) return

    if (beforePhotoFiles.length === 0) {
      alert("Please upload at least one Before Photo (Packing).")
      return
    }
    if (!transporterName.trim()) {
      alert("Please enter Transporter / Driver Name.")
      return
    }
    if (dispatchStatus === "notokay" && !notOkReason.trim()) {
      alert("Please provide a reason for 'Not Okay' status.")
      return
    }

    setIsSubmitting(true)
    try {
      const [beforePhotoUrls, afterPhotoUrls, biltyUploadUrls] = await Promise.all([
        uploadFiles(beforePhotoFiles, "packaging_transport/before"),
        uploadFiles(afterPhotoFiles, "packaging_transport/after"),
        uploadFiles(biltyUploadFiles, "packaging_transport/bilty"),
      ])

      const response = await fetch("/api/otp-supabase/packaging-transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          makeInvoiceId: selectedOrder.makeInvoiceId || selectedOrder.id,
          beforePhotoUrls,
          afterPhotoUrls,
          transporterName,
          transporterContact,
          biltyNumber,
          biltyUploadUrls,
          freightCharge,
          hamaliCharge,
          parkingCharge,
          transporterRemarks,
          expenseAmount,
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
        alert(`Order ${selectedOrder.orderNo} — packaging and transport recorded.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting packaging-transport:", err)
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
      case "beforePhoto":
        return order.beforePhotoUrls && order.beforePhotoUrls.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {order.beforePhotoUrls.map((url: string, idx: number) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                <Badge variant="default">{idx + 1}</Badge>
              </a>
            ))}
          </div>
        ) : (
          <Badge variant="secondary">N/A</Badge>
        )
      case "afterPhoto":
        return order.afterPhotoUrls && order.afterPhotoUrls.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {order.afterPhotoUrls.map((url: string, idx: number) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                <Badge variant="default">{idx + 1}</Badge>
              </a>
            ))}
          </div>
        ) : (
          <Badge variant="secondary">N/A</Badge>
        )
      case "biltyUpload":
        return order.biltyUploadUrls && order.biltyUploadUrls.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {order.biltyUploadUrls.map((url: string, idx: number) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                <Badge variant="default">{idx + 1}</Badge>
              </a>
            ))}
          </div>
        ) : (
          <Badge variant="secondary">N/A</Badge>
        )
      case "freightCharge":
      case "hamaliCharge":
      case "parkingCharge":
      case "expenseAmount":
        return value !== "" && value !== null && value !== undefined ? `₹${value}` : ""
      case "dispatchStatus":
        return (
          <Badge variant={value === "notokay" ? "destructive" : "default"}>
            {value === "notokay" ? "Not Okay" : "Okay"}
          </Badge>
        )
      default:
        return value || ""
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
                  <TabsTrigger value="pending">Pending ({filteredOrders.length})</TabsTrigger>
                  <TabsTrigger value="history" onClick={handleProcessedTabClick}>
                    History ({filteredProcessedOrders.length})
                  </TabsTrigger>
                </TabsList>

                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
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
                <div className="md:hidden space-y-3 overflow-y-auto flex-1">
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
                      {searchTerm ? "No orders match your search criteria" : "No pending packaging/transport records"}
                    </p>
                  )}
                </div>

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
                                style={{ minWidth: column.key === "actions" ? "120px" : "160px" }}
                              >
                                {column.label}
                              </TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order, idx) => (
                          <TableRow key={order.id || idx} className="hover:bg-gray-50">
                            {pendingColumns
                              .filter((col) => visiblePendingColumns[col.key])
                              .map((column) => (
                                <TableCell
                                  key={column.key}
                                  className="border-b px-4 py-3 align-top"
                                  style={{ minWidth: column.key === "actions" ? "120px" : "160px" }}
                                >
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
                              {searchTerm ? "No orders match your search criteria" : "No pending packaging/transport records"}
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
                    <span className="ml-2">Loading history...</span>
                  </div>
                ) : (
                  <>
                    <div className="md:hidden space-y-3 overflow-y-auto flex-1">
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
                                    style={{ minWidth: "160px" }}
                                  >
                                    {column.label}
                                  </TableHead>
                                ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredProcessedOrders.map((order, idx) => (
                              <TableRow key={order.id || idx} className="hover:bg-gray-50">
                                {historyColumns
                                  .filter((col) => visibleHistoryColumns[col.key])
                                  .map((column) => (
                                    <TableCell key={column.key} className="border-b px-4 py-3 align-top" style={{ minWidth: "160px" }}>
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
                  </>
                )}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        {/* Process Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Packaging and Transport</DialogTitle>
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
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-4">
                <h4 className="text-sm font-bold text-emerald-900">Documentation</h4>
                <div className="space-y-2">
                  <Label htmlFor="beforePhoto" className="text-emerald-700">
                    Before Photo (Packing) <span className="text-red-500 font-bold">*</span>
                  </Label>
                  <Input
                    id="beforePhoto"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setBeforePhotoFiles(Array.from(e.target.files || []))}
                  />
                  {beforePhotoFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">{beforePhotoFiles.length} file(s) selected</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="afterPhoto" className="text-emerald-700">
                    After Photo (Final Package)
                  </Label>
                  <Input
                    id="afterPhoto"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setAfterPhotoFiles(Array.from(e.target.files || []))}
                  />
                  {afterPhotoFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">{afterPhotoFiles.length} file(s) selected</p>
                  )}
                </div>
              </div>

              {/* Transportation details */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 space-y-4">
                <h4 className="text-sm font-bold text-indigo-900">Transportation Details</h4>
                <div className="space-y-2">
                  <Label htmlFor="transporterName" className="text-indigo-700">
                    Assign Driver for Material Dispatch <span className="text-red-500 font-bold">*</span>
                  </Label>
                  <Input
                    id="transporterName"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    placeholder="Enter transporter name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transporterContact" className="text-indigo-700">
                      Transporter Contact No.
                    </Label>
                    <Input
                      id="transporterContact"
                      value={transporterContact}
                      onChange={(e) => setTransporterContact(e.target.value)}
                      placeholder="Enter contact number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="biltyNumber" className="text-indigo-700">
                      Bilty No. / Docket No.
                    </Label>
                    <Input
                      id="biltyNumber"
                      value={biltyNumber}
                      onChange={(e) => setBiltyNumber(e.target.value)}
                      placeholder="Enter bilty/docket number"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="freightCharge" className="text-indigo-700">
                      Freight Charge
                    </Label>
                    <Input id="freightCharge" type="number" value={freightCharge} onChange={(e) => setFreightCharge(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hamaliCharge" className="text-indigo-700">
                      Hamali Charge
                    </Label>
                    <Input id="hamaliCharge" type="number" value={hamaliCharge} onChange={(e) => setHamaliCharge(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parkingCharge" className="text-indigo-700">
                      Parking Charge
                    </Label>
                    <Input id="parkingCharge" type="number" value={parkingCharge} onChange={(e) => setParkingCharge(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="biltyUpload" className="text-indigo-700">
                    Bilty / Docket Upload
                  </Label>
                  <Input
                    id="biltyUpload"
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={(e) => setBiltyUploadFiles(Array.from(e.target.files || []))}
                  />
                  {biltyUploadFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">{biltyUploadFiles.length} file(s) selected</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transporterRemarks" className="text-indigo-700">
                    Transporter Assign
                  </Label>
                  <Textarea
                    id="transporterRemarks"
                    value={transporterRemarks}
                    onChange={(e) => setTransporterRemarks(e.target.value)}
                    placeholder="Enter additional warehouse/dispatch remarks..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expenseAmount" className="text-indigo-700">
                    Expense Amount
                  </Label>
                  <Input id="expenseAmount" type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="Enter expense amount" />
                </div>
              </div>

              {/* Dispatch Confirmation */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">Dispatch Confirmation</h4>
                  <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setDispatchStatus("okay")}
                      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${dispatchStatus === "okay" ? "bg-green-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      OKAY
                    </button>
                    <button
                      type="button"
                      onClick={() => setDispatchStatus("notokay")}
                      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${dispatchStatus === "notokay" ? "bg-red-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      NOT OKAY
                    </button>
                  </div>
                </div>
                {dispatchStatus === "notokay" && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <Label htmlFor="notOkReason" className="text-red-700 font-semibold">
                      Reason for NOT OKAY
                    </Label>
                    <Textarea
                      id="notOkReason"
                      value={notOkReason}
                      onChange={(e) => setNotOkReason(e.target.value)}
                      placeholder="Please specify why this order is not okay for dispatch..."
                      className="border-red-100"
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
                      <TableCell className="text-right">{item.qty}</TableCell>
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
