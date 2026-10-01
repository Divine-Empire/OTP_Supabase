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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { RefreshCw, Search, Settings, Eye } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"
import { mapIndentCreationRowToUI } from "@/lib/otp-utils"
import { filterByCrmAccess, crmNameOptionsFrom } from "@/lib/crm-access"
import { MobileRecordCard } from "@/components/mobile-record-card"

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
  const [historyOrders, setHistoryOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [materialReceivedLoading, setMaterialReceivedLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
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

  const fetchHistoryOrders = async () => {
    setHistoryLoading(true)
    try {
      const response = await fetch("/api/otp-supabase/indent-creation?status=history")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setHistoryOrders(result.data.map(mapIndentCreationRowToUI))
      } else {
        setHistoryOrders([])
      }
    } catch (err) {
      console.error("Error fetching indent-creation history:", err)
      setHistoryOrders([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingOrders()
    fetchMaterialReceivedOrders()
  }, [])

  const filteredPendingOrders = useMemo(() => {
    let filtered = filterByCrmAccess(pendingOrders, currentUser)
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

  const crmNameOptions = useMemo(() => crmNameOptionsFrom(filterByCrmAccess(pendingOrders, currentUser)), [pendingOrders, currentUser])

  const filteredMaterialReceivedOrders = useMemo(() => {
    let filtered = filterByCrmAccess(materialReceivedOrders, currentUser)
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

  const filteredHistoryOrders = useMemo(() => {
    let filtered = filterByCrmAccess(historyOrders, currentUser)
    if (crmNameFilter !== "all") filtered = filtered.filter((order) => order.crmName === crmNameFilter)
    if (searchTerm) {
      filtered = filtered.filter((order) => {
        const searchableFields = historyColumns
          .filter((col) => col.searchable)
          .map((col) => String(order[col.key] || "").toLowerCase())
        return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()))
      })
    }
    return filtered
  }, [historyOrders, searchTerm, crmNameFilter, currentUser])

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

        alert(`Order ${selectedOrder.orderNo} — indent created, moved to Material Received.`)
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error submitting indent-creation:", err)
      alert(`Error: ${err.message}`)
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
        alert(`Order ${selectedMROrder.orderNo} — Material Received recorded. Packing List will show it again for a re-check.`)
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
          <Button size="sm" onClick={() => handleProcess(order)}>
            Process
          </Button>
        )
      case "actionsMR":
        return (
          <Button size="sm" onClick={() => handleProcessMR(order)}>
            Process
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
      case "inventoryPhoto":
        return order.inventoryPhotoUrl ? (
          <a href={order.inventoryPhotoUrl} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">Link</Badge>
          </a>
        ) : (
          <Badge variant="secondary">N/A</Badge>
        )
      case "materialReceived":
        return value ? <Badge variant={value === "Yes" ? "default" : "secondary"}>{value}</Badge> : ""
      default:
        return value ?? ""
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
            <h1 className="text-2xl font-bold text-red-600">Error Loading Data</h1>
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

  return (
    <MainLayout>
      <div className="p-2 h-[calc(100vh-5rem)] md:h-[calc(100vh-5.5rem)] flex flex-col">
        <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value)} className="flex-1 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="border-b py-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="pending">Pending ({filteredPendingOrders.length})</TabsTrigger>
                  <TabsTrigger value="material-received" onClick={fetchMaterialReceivedOrders}>
                    Material Received ({filteredMaterialReceivedOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" onClick={fetchHistoryOrders}>
                    History ({filteredHistoryOrders.length})
                  </TabsTrigger>
                </TabsList>

                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>

                <div className="flex items-center gap-2">
                  <Select value={crmNameFilter} onValueChange={setCrmNameFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All CRM Names" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All CRM Names</SelectItem>
                      {crmNameOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      fetchPendingOrders()
                      fetchMaterialReceivedOrders()
                      fetchHistoryOrders()
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                      <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="flex gap-2 p-2">
                        <Button size="sm" variant="outline" onClick={columnPanel.showAll}>
                          Show All
                        </Button>
                        <Button size="sm" variant="outline" onClick={columnPanel.hideAll}>
                          Hide All
                        </Button>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="p-2 space-y-2">
                        {columnPanel.columns.map((column) => (
                          <div key={column.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`col-${column.key}`}
                              checked={columnPanel.visible[column.key]}
                              onCheckedChange={() => columnPanel.toggle(column.key)}
                            />
                            <Label htmlFor={`col-${column.key}`} className="text-sm">
                              {column.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 min-h-0 flex flex-col">
              {(["pending", "material-received", "history"] as const).map((tabKey) => {
                const columns = tabKey === "pending" ? pendingColumns : tabKey === "material-received" ? materialReceivedColumns : historyColumns
                const visible =
                  tabKey === "pending" ? visiblePendingColumns : tabKey === "material-received" ? visibleMaterialReceivedColumns : visibleHistoryColumns
                const rows = tabKey === currentTab ? activeRows : []
                const isLoadingTab = tabKey === "material-received" ? materialReceivedLoading : tabKey === "history" ? historyLoading : false
                const emptyMessage =
                  tabKey === "pending" ? "No pending indents" : tabKey === "material-received" ? "No indents awaiting material" : "No processed indents found"

                return (
                  <TabsContent key={tabKey} value={tabKey} className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
                    {isLoadingTab ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <div className="md:hidden space-y-3 overflow-y-auto flex-1">
                          {rows.map((order, idx) => (
                            <MobileRecordCard
                              key={order.id || idx}
                              columns={columns}
                              visibleColumns={visible}
                              record={order}
                              renderCellContent={renderCellContent}
                            />
                          ))}
                          {rows.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">{searchTerm ? "No orders match your search criteria" : emptyMessage}</p>
                          )}
                        </div>

                        <div className="hidden md:flex flex-col flex-1 min-h-0 border rounded-lg overflow-hidden relative">
                          <div className="overflow-auto flex-1 min-h-0">
                            <Table className="w-full relative">
                              <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                                <TableRow>
                                  {columns
                                    .filter((col) => visible[col.key])
                                    .map((column) => (
                                      <TableHead
                                        key={column.key}
                                        className="bg-gray-50 font-semibold text-gray-900 px-4 py-3 whitespace-nowrap"
                                        style={{ minWidth: column.key.startsWith("actions") ? "120px" : "160px" }}
                                      >
                                        {column.label}
                                      </TableHead>
                                    ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rows.map((order, idx) => (
                                  <TableRow key={order.id || idx} className="hover:bg-gray-50">
                                    {columns
                                      .filter((col) => visible[col.key])
                                      .map((column) => (
                                        <TableCell
                                          key={column.key}
                                          className="border-b px-4 py-3 align-top"
                                          style={{ minWidth: column.key.startsWith("actions") ? "120px" : "160px" }}
                                        >
                                          <div className="break-words whitespace-normal leading-relaxed">{renderCellContent(order, column.key)}</div>
                                        </TableCell>
                                      ))}
                                  </TableRow>
                                ))}
                                {rows.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={columns.filter((col) => visible[col.key]).length} className="text-center text-muted-foreground h-32">
                                      {searchTerm ? "No orders match your search criteria" : emptyMessage}
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
                )
              })}
            </CardContent>
          </Card>
        </Tabs>

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
