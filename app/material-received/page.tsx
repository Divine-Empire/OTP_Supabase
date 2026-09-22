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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Trash2, RefreshCw, Search, Settings, Eye, ArrowLeftRight } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { mapMaterialReceivedPendingRowToUI, mapMaterialReceivedHistoryRowToUI } from "@/lib/otp-utils"
import { QrScanner, parseItemQr } from "@/components/qr-scanner"
import { toast } from "@/components/ui/use-toast"
import { MobileRecordCard } from "@/components/mobile-record-card"

// Same shapes as check-inventory/page.tsx — this stage runs the identical
// scan -> compare -> submit flow, just against the currently outstanding
// otp_material_shortage rows for an order instead of its original item list.
interface ScanRow {
  itemName: string
  itemCode: string
  qty: string
  serials: string[]
}

interface CompareItem {
  shortageId: string
  itemCode: string
  itemName: string
  orderedQty: number
  scannedQty: number
  shortageQty: number
  serials: string[]
}

function isNumberedSerial(serialNo: string): boolean {
  const lastSegment = serialNo.split("/").pop() || ""
  return lastSegment.trim() !== ""
}

function itemMatchKey(name?: string | null) {
  return (name || "").trim().toLowerCase()
}

// Column definitions for Pending tab (order-grouped)
const pendingColumns = [
  { key: "actions", label: "Actions", searchable: false },
  { key: "timestamp", label: "Timestamp", searchable: true },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "creName", label: "CRE Name", searchable: true },
  { key: "quotationNo", label: "Quotation No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "contactPersonName", label: "Contact Person Name", searchable: true },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
]

// Column definitions for History tab (item-level — one row per past attempt)
const historyColumns = [
  { key: "timestamp", label: "Timestamp", searchable: true },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "itemName", label: "Item Name", searchable: true },
  { key: "indentedQty", label: "Indented Qty", searchable: false },
  { key: "receivedQty", label: "Received (this attempt)", searchable: false },
  { key: "remainingQty", label: "Still Short (this attempt)", searchable: false },
  { key: "pfmsIndentNo", label: "PFMS Indent No.", searchable: true },
  { key: "warehouseLocation", label: "Warehouse Location", searchable: true },
  { key: "remark", label: "Remark", searchable: true },
]

export default function MaterialReceivedPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [processedOrders, setProcessedOrders] = useState<any[]>([])
  const [processedLoading, setProcessedLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [dialogStep, setDialogStep] = useState<"scan" | "preview">("scan")
  const [scanRows, setScanRows] = useState<ScanRow[]>([])
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [compareItems, setCompareItems] = useState<CompareItem[]>([])
  const [computedStatus, setComputedStatus] = useState<"Fully Received" | "Not Received" | "Partial" | "">("")
  const [createdByPerson, setCreatedByPerson] = useState("")
  const [warehouseLocationValue, setWarehouseLocationValue] = useState("")
  const [remarks, setRemarks] = useState("")

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
      const response = await fetch("/api/otp-supabase/material-received?status=pending")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data.map(mapMaterialReceivedPendingRowToUI))
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching material-received pending queue:", err)
      setError(err.message)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProcessedOrders = async () => {
    setProcessedLoading(true)
    try {
      const response = await fetch("/api/otp-supabase/material-received?status=history")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setProcessedOrders(result.data.map(mapMaterialReceivedHistoryRowToUI))
      } else {
        setProcessedOrders([])
      }
    } catch (err) {
      console.error("Error fetching material-received history:", err)
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
    setDialogStep("scan")
    setScanRows([])
    setScannerError(null)
    setCompareItems([])
    setComputedStatus("")
    setCreatedByPerson(order.creName || currentUser?.fullName || currentUser?.username || "")
    setWarehouseLocationValue("")
    setRemarks("")
    setIsDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
  }

  const handleQrScan = (raw: string) => {
    const parsed = parseItemQr(raw)
    if (!parsed) {
      setScannerError(`Unrecognized QR: "${raw.slice(0, 60)}"`)
      return
    }

    const outstandingItems: any[] = selectedOrder?.rawItems || []
    const scannedKey = itemMatchKey(parsed.itemName)
    const belongsToOutstanding = outstandingItems.some((it) => itemMatchKey(it.item_name) === scannedKey)

    if (!belongsToOutstanding) {
      const message = `"${parsed.itemName}" is not part of this order's outstanding shortage items — scan rejected.`
      setScannerError(message)
      toast({ title: "Item not outstanding", description: message, variant: "destructive" })
      return
    }

    setScannerError(null)
    const key = itemMatchKey(parsed.itemName)
    const numbered = isNumberedSerial(parsed.serialNo)

    setScanRows((prev) => {
      const groupIndex = prev.findIndex((g) => itemMatchKey(g.itemName) === key)

      if (groupIndex === -1) {
        return [
          ...prev,
          {
            itemName: parsed.itemName,
            itemCode: parsed.itemCode,
            qty: numbered ? "1" : "",
            serials: numbered ? [parsed.serialNo] : [],
          },
        ]
      }

      const group = prev[groupIndex]
      if (!numbered) return prev
      if (group.serials.includes(parsed.serialNo)) return prev

      const serials = [...group.serials, parsed.serialNo]
      const next = [...prev]
      next[groupIndex] = { ...group, serials, qty: String(serials.length) }
      return next
    })
  }

  const updateScanRowQty = (index: number, qty: string) => {
    setScanRows((prev) => prev.map((r, i) => (i === index ? { ...r, qty } : r)))
  }

  const removeScanRow = (index: number) => {
    setScanRows((prev) => prev.filter((_, i) => i !== index))
  }

  const removeScanSerial = (groupIndex: number, serialIndex: number) => {
    setScanRows((prev) => {
      const group = prev[groupIndex]
      if (!group) return prev
      const serials = group.serials.filter((_, i) => i !== serialIndex)
      if (serials.length === 0) return prev.filter((_, i) => i !== groupIndex)
      const next = [...prev]
      next[groupIndex] = { ...group, serials, qty: String(serials.length) }
      return next
    })
  }

  // Compares scanned qty against each outstanding shortage row's own
  // indented_qty (not the order's original ordered_qty) — this attempt
  // only needs to close the gap that's still open, not the whole order.
  const handleCompare = () => {
    const scannedByCode = new Map<string, number>()
    for (const row of scanRows) {
      const key = itemMatchKey(row.itemName)
      scannedByCode.set(key, (scannedByCode.get(key) || 0) + (Number(row.qty) || 0))
    }

    const shortageRows: any[] = selectedOrder?.shortageRows || []
    const items: CompareItem[] = shortageRows.map((sr) => {
      const key = itemMatchKey(sr.item_name)
      const ordered = Number(sr.indented_qty) || 0
      const scanned = scannedByCode.get(key) || 0
      const scanRow = scanRows.find((r) => itemMatchKey(r.itemName) === key)
      return {
        shortageId: sr.id,
        itemCode: sr.item_code || "",
        itemName: sr.item_name,
        orderedQty: ordered,
        scannedQty: Math.min(scanned, ordered),
        shortageQty: Math.max(ordered - scanned, 0),
        serials: scanRow?.serials || [],
      }
    })

    const totalShortage = items.reduce((s, it) => s + it.shortageQty, 0)
    const totalScanned = items.reduce((s, it) => s + it.scannedQty, 0)
    const status = totalShortage === 0 ? "Fully Received" : totalScanned === 0 ? "Not Received" : "Partial"

    setCompareItems(items)
    setComputedStatus(status)
    setDialogStep("preview")
  }

  const updateCompareItemQty = (index: number, scannedQty: string) => {
    setCompareItems((prev) => {
      const updated = prev.map((it, i) => {
        if (i !== index) return it
        const scanned = Math.min(Math.max(Number(scannedQty) || 0, 0), it.orderedQty)
        return { ...it, scannedQty: scanned, shortageQty: Math.max(it.orderedQty - scanned, 0) }
      })
      const totalShortage = updated.reduce((s, it) => s + it.shortageQty, 0)
      const totalScanned = updated.reduce((s, it) => s + it.scannedQty, 0)
      setComputedStatus(totalShortage === 0 ? "Fully Received" : totalScanned === 0 ? "Not Received" : "Partial")
      return updated
    })
  }

  // Submits this receiving attempt. The still-short remainder (if any)
  // comes back as a NEW pending row for this same stage; whatever was
  // found becomes a new Pre-Invoice wave. See material-received/route.ts.
  const handleSubmit = async () => {
    if (!selectedOrder) return
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/otp-supabase/material-received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.orderId || selectedOrder.id,
          items: compareItems.map((it) => ({
            shortageId: it.shortageId,
            item_code: it.itemCode,
            item_name: it.itemName,
            scanned_qty: it.scannedQty,
            serials: it.serials,
          })),
          warehouseLocation: warehouseLocationValue || null,
          createdBy: createdByPerson || currentUser?.fullName || currentUser?.username || "Admin",
          remarks: remarks || "",
        }),
      })
      const result = await response.json()

      if (result.success) {
        setIsDialogOpen(false)
        setSelectedOrder(null)
        await fetchOrders()
        alert(
          `Order ${selectedOrder.orderNo} — ${result.foundCount} item(s) found (queued for Pre-Invoice), ${result.stillShortCount} item(s) still short (stay pending here).`
        )
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting material-received:", err)
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
      default:
        return value ?? ""
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading material-received queue...</span>
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
                      {searchTerm ? "No orders match your search criteria" : "No pending material-received items"}
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
                                style={{
                                  minWidth: column.key === 'actions' ? '120px' :
                                    column.key === 'itemList' ? '130px' :
                                      column.key === 'timestamp' ? '130px' :
                                        column.key === 'orderNo' ? '120px' :
                                          column.key === 'creName' ? '150px' :
                                            column.key === 'quotationNo' ? '150px' :
                                              column.key === 'companyName' ? '250px' :
                                                column.key === 'contactPersonName' ? '180px' :
                                                  column.key === 'contactNumber' ? '140px' :
                                                    '160px',
                                }}
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
                                  style={{
                                    minWidth: column.key === 'actions' ? '120px' :
                                      column.key === 'itemList' ? '130px' :
                                        column.key === 'timestamp' ? '130px' :
                                          column.key === 'orderNo' ? '120px' :
                                            column.key === 'creName' ? '150px' :
                                              column.key === 'quotationNo' ? '150px' :
                                                column.key === 'companyName' ? '250px' :
                                                  column.key === 'contactPersonName' ? '180px' :
                                                    column.key === 'contactNumber' ? '140px' :
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
                        {filteredOrders.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={pendingColumns.filter((col) => visiblePendingColumns[col.key]).length}
                              className="text-center text-muted-foreground h-32"
                            >
                              {searchTerm ? "No orders match your search criteria" : "No pending material-received items"}
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
                          {searchTerm ? "No orders match your search criteria" : "No processed items found"}
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
                                    style={{
                                      minWidth: column.key === 'timestamp' ? '130px' :
                                        column.key === 'orderNo' ? '120px' :
                                          column.key === 'companyName' ? '250px' :
                                            column.key === 'itemName' ? '200px' :
                                              column.key === 'indentedQty' ? '130px' :
                                                column.key === 'receivedQty' ? '130px' :
                                                  column.key === 'remainingQty' ? '130px' :
                                                    column.key === 'pfmsIndentNo' ? '150px' :
                                                      column.key === 'warehouseLocation' ? '200px' :
                                                        column.key === 'remark' ? '200px' :
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
                              <TableRow key={order.id || idx} className="hover:bg-gray-50">
                                {historyColumns
                                  .filter((col) => visibleHistoryColumns[col.key])
                                  .map((column) => (
                                    <TableCell
                                      key={column.key}
                                      className="border-b px-4 py-3 align-top"
                                      style={{
                                        minWidth: column.key === 'timestamp' ? '130px' :
                                          column.key === 'orderNo' ? '120px' :
                                            column.key === 'companyName' ? '250px' :
                                              column.key === 'itemName' ? '200px' :
                                                column.key === 'indentedQty' ? '130px' :
                                                  column.key === 'receivedQty' ? '130px' :
                                                    column.key === 'remainingQty' ? '130px' :
                                                      column.key === 'pfmsIndentNo' ? '150px' :
                                                        column.key === 'warehouseLocation' ? '200px' :
                                                          column.key === 'remark' ? '200px' :
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
                                  {searchTerm ? "No orders match your search criteria" : "No processed items found"}
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

        {/* Process Dialog — Scan -> Compare -> Submit */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{dialogStep === "scan" ? "Scan Received Items" : "Review & Confirm"}</DialogTitle>
              <DialogDescription>
                {dialogStep === "scan"
                  ? "Scan each item's QR label, then enter its qty."
                  : "Check the breakdown, edit any qty if needed, then submit."}
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

              {dialogStep === "scan" && (
                <>
                  <div className="space-y-2">
                    <Label>Outstanding Items (reference — what to pull from the warehouse)</Label>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="font-semibold">Item Name</TableHead>
                            <TableHead className="font-semibold text-right">Short Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedOrder?.rawItems || []).map((it: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{it.item_name}</TableCell>
                              <TableCell className="text-right">{it.quantity}</TableCell>
                            </TableRow>
                          ))}
                          {(selectedOrder?.rawItems || []).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center text-muted-foreground">
                                No outstanding items
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <QrScanner onScan={handleQrScan} onError={setScannerError} />
                  {scannerError && <p className="text-sm text-destructive">{scannerError}</p>}

                  <div className="space-y-2">
                    <Label>Scanned Items ({scanRows.length})</Label>
                    {scanRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No items scanned yet. Point the camera at each item's QR label.
                      </p>
                    ) : (
                      <div className="border rounded-lg divide-y">
                        {scanRows.map((row, index) => (
                          <div key={itemMatchKey(row.itemName)}>
                            <div className="flex items-center gap-2 p-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{row.itemName}</p>
                                <p className="text-xs text-muted-foreground">Code: {row.itemCode}</p>
                              </div>
                              {row.serials.length > 0 ? (
                                <span className="w-24 text-center text-sm font-medium">{row.qty} pcs</span>
                              ) : (
                                <Input
                                  type="number"
                                  className="w-24"
                                  placeholder="Qty"
                                  value={row.qty}
                                  onChange={(e) => updateScanRowQty(index, e.target.value)}
                                />
                              )}
                              <Button type="button" size="icon" variant="ghost" onClick={() => removeScanRow(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {row.serials.length > 0 && (
                              <div className="pl-6 pb-2 space-y-1">
                                {row.serials.map((serialNo, serialIndex) => (
                                  <div key={serialNo} className="flex items-center gap-2 pr-2">
                                    <p className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
                                      Serial: {serialNo}
                                    </p>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => removeScanSerial(index, serialIndex)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCompare} disabled={scanRows.length === 0} className="gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      Compare
                    </Button>
                  </div>
                </>
              )}

              {dialogStep === "preview" && (
                <>
                  <div className="flex items-center gap-2">
                    <Label>Result:</Label>
                    <Badge
                      variant={
                        computedStatus === "Fully Received" ? "default" : computedStatus === "Not Received" ? "destructive" : "secondary"
                      }
                    >
                      {computedStatus}
                    </Badge>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-center">Short Qty</TableHead>
                          <TableHead className="text-center">Received</TableHead>
                          <TableHead className="text-center">Still Short</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compareItems.map((it, index) => (
                          <TableRow key={it.shortageId}>
                            <TableCell>
                              <p className="font-medium">{it.itemName}</p>
                              <p className="text-xs text-muted-foreground">Code: {it.itemCode}</p>
                            </TableCell>
                            <TableCell className="text-center">{it.orderedQty}</TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                className="w-20 mx-auto text-center"
                                value={it.scannedQty}
                                onChange={(e) => updateCompareItemQty(index, e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={it.shortageQty > 0 ? "destructive" : "default"}>{it.shortageQty}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Received qty goes to Pre-Invoice pending under the same order number. Still-short qty stays here
                    as a new pending row.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="createdBy">Created by</Label>
                      <Input
                        id="createdBy"
                        value={createdByPerson}
                        onChange={(e) => setCreatedByPerson(e.target.value)}
                        placeholder="Enter name"
                      />
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="remarks">Remarks</Label>
                    <Input id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter any remarks..." />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogStep("scan")}>
                      Back
                    </Button>
                    <Button onClick={handleSubmit} disabled={currentUser?.role === "user" || isSubmitting}>
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
                </>
              )}
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
