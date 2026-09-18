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
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { RefreshCw, Search, Settings } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { mapOrderRowToUI } from "@/lib/otp-utils"

// Column definitions for Pending tab (A to AZ + BD, BE, BF + BJ, BK + BO)
const pendingColumns = [
  { key: "actions", label: "Actions", searchable: false },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "quotationNo", label: "Quotation No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "contactPersonName", label: "Contact Person Name", searchable: true },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "billingAddress", label: "Billing Address", searchable: true },
  { key: "shippingAddress", label: "Shipping Address", searchable: true },
  { key: "paymentMode", label: "Payment Mode", searchable: true },
  { key: "paymentTerms", label: "Payment Terms(In Days)", searchable: true },
  { key: "referenceName", label: "Reference Name", searchable: true },
  { key: "email", label: "Email", searchable: true },
  { key: "itemName1", label: "Item Name 1", searchable: true },
  { key: "quantity1", label: "Quantity 1", searchable: true },
  { key: "itemName2", label: "Item Name 2", searchable: true },
  { key: "quantity2", label: "Quantity 2", searchable: true },
  { key: "itemName3", label: "Item Name 3", searchable: true },
  { key: "quantity3", label: "Quantity 3", searchable: true },
  { key: "itemName4", label: "Item Name 4", searchable: true },
  { key: "quantity4", label: "Quantity 4", searchable: true },
  { key: "itemName5", label: "Item Name 5", searchable: true },
  { key: "quantity5", label: "Quantity 5", searchable: true },
  { key: "itemName6", label: "Item Name 6", searchable: true },
  { key: "quantity6", label: "Quantity 6", searchable: true },
  { key: "itemName7", label: "Item Name 7", searchable: true },
  { key: "quantity7", label: "Quantity 7", searchable: true },
  { key: "itemName8", label: "Item Name 8", searchable: true },
  { key: "quantity8", label: "Quantity 8", searchable: true },
  { key: "itemName9", label: "Item Name 9", searchable: true },
  { key: "quantity9", label: "Quantity 9", searchable: true },
  { key: "itemName10", label: "Item Name 10", searchable: true },
  { key: "quantity10", label: "Quantity 10", searchable: true },
  { key: "transportMode", label: "Transport Mode", searchable: true },
  { key: "freightType", label: "Freight Type", searchable: true },
  { key: "destination", label: "Destination", searchable: true },
  { key: "poNumber", label: "Po Number", searchable: true },
  { key: "quotationCopy", label: "Quotation Copy", searchable: true },
  { key: "acceptanceCopy", label: "Acceptance Copy", searchable: true },
  { key: "offerShow", label: "Offer Show", searchable: true },
  { key: "conveyedForRegistration", label: "Conveyed For Registration Form", searchable: true },
  { key: "totalOrderQty", label: "Total Order Qty", searchable: true },
  { key: "amount", label: "Amount", searchable: true },
  { key: "totalDispatch", label: "Total Dispatch", searchable: true },
  { key: "quantityDelivered", label: "Quantity Delivered", searchable: true },
  { key: "orderCancel", label: "Order Cancel", searchable: true },
  { key: "pendingDeliveryQty", label: "Pending Delivery Qty", searchable: true },
  { key: "pendingDispatchQty", label: "Pending Dispatch Qty", searchable: true },
  { key: "materialReturn", label: "Material Return", searchable: true },
  { key: "deliveryStatus", label: "Delivery Status", searchable: true },
  { key: "dispatchStatus", label: "Dispatch Status", searchable: true },
  { key: "dispatchCompleteDate", label: "Dispatch Complete Date", searchable: true },
  { key: "deliveryCompleteDate", label: "Delivery Complete Date", searchable: true },
  { key: "isOrderAcceptable", label: "Is Order Acceptable?", searchable: true },
  { key: "orderAcceptanceChecklist", label: "Order Acceptance Checklist", searchable: true },
  { key: "remarks", label: "Remark", searchable: true },
  { key: "availabilityStatus", label: "Availability Status", searchable: true },
  { key: "availabilityRemarks", label: "Remarks", searchable: true },
  { key: "receivedDate", label: "Received Date", searchable: true },
]

// Column definitions for History tab (includes BX, BZ columns)
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "approvalDate", label: "Approval Date", searchable: true },
  { key: "approvedBy", label: "Approved By", searchable: true },
]

export default function SeniorApprovalPage() {
  const [selectedOrder, setSelectedOrder] = useState<string>("")
  const [approvalStatus, setApprovalStatus] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewOrder, setViewOrder] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedColumn, setSelectedColumn] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )

  const [orders, setOrders] = useState<any[]>([])
  const [processedOrders, setProcessedOrders] = useState<any[]>([])
  const [processedLoading, setProcessedLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user: currentUser } = useAuth()

  // Fetch pending orders from Supabase API
  const fetchOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/otp-supabase/orders?stage=senior_approval&status=pending")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        const ordersData = result.data.map(mapOrderRowToUI)
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

  // Fetch processed history orders from Supabase API
  const fetchProcessedOrders = async () => {
    try {
      const response = await fetch("/api/otp-supabase/orders?stage=senior_approval&status=history")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        return result.data.map(mapOrderRowToUI)
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

  // Filter orders based on search term and selected column
  // Add this function after the useAuth hook
  const filterOrdersByUserRole = (orders: any[], currentUser: any) => {
    if (!currentUser) return orders;
    
    // Super admin and admin see all data
    if (currentUser.role === "super_admin" || currentUser.role === "admin") {
      return orders;
    }
    
    // If user has 'all' or this step assigned
    if (currentUser.assignedSteps?.includes("all") || currentUser.assignedSteps?.includes("senior-approval")) {
      return orders;
    }
    
    // Regular users only see data where CRE Name matches their username or full name
    return orders.filter(order => 
      !order.creName || 
      order.creName.toLowerCase() === (currentUser.username || "").toLowerCase() ||
      (currentUser.fullName && order.creName.toLowerCase() === currentUser.fullName.toLowerCase())
    );
  };

// Update the filteredOrders useMemo to include role-based filtering
const filteredOrders = useMemo(() => {
  let filtered = orders;

  // Apply user role-based filtering
  filtered = filterOrdersByUserRole(filtered, currentUser);

  if (searchTerm) {
    filtered = filtered.filter((order) => {
      if (selectedColumn === "all") {
        const searchableFields = pendingColumns
          .filter((col) => col.searchable)
          .map((col) => String(order[col.key] || "").toLowerCase())
        return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()))
      } else {
        const fieldValue = String(order[selectedColumn] || "").toLowerCase()
        return fieldValue.includes(searchTerm.toLowerCase())
      }
    })
  }

  return filtered
}, [orders, searchTerm, selectedColumn, currentUser])

  // Filter orders based on status
  const pendingOrders = filteredOrders



  // Filter processed orders based on search term
// Update the filteredProcessedOrders useMemo
const filteredProcessedOrders = useMemo(() => {
  let filtered = processedOrders;

  // Apply user role-based filtering
  filtered = filterOrdersByUserRole(filtered, currentUser);

  if (!searchTerm) return filtered

  return filtered.filter((order) => {
    if (selectedColumn === "all") {
      const searchableFields = historyColumns
        .filter((col) => col.searchable)
        .map((col) => String(order[col.key] || "").toLowerCase())
      return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()))
    } else {
      const fieldValue = String(order[selectedColumn] || "").toLowerCase()
      return fieldValue.includes(searchTerm.toLowerCase())
    }
  })
}, [processedOrders, searchTerm, selectedColumn, currentUser])

  const handleProcessedTabClick = async () => {
    setProcessedLoading(true)
    const processed = await fetchProcessedOrders()
    setProcessedOrders(processed)
    setProcessedLoading(false)
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



  const updateOrderStatus = async (order: any, approvalData: any) => {
    try {
      const orderNo = order.orderNo || order.id

      const updateResponse = await fetch("/api/otp-supabase/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo: orderNo,
          stage: "senior_approval",
          stageData: {
            approval_name: approvalData.approvedBy,
            created_by: currentUser?.fullName || currentUser?.username || "Admin",
            actual_date: new Date().toISOString(),
          },
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

  const handleProcess = (orderId: string) => {
    setSelectedOrder(orderId)
    setApprovalStatus("")
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedOrder || !approvalStatus) return

    setIsSubmitting(true) // Start loading

    const order = orders.find((o) => o.id === selectedOrder)
    if (!order) return

    const approvalData = {
      approvedBy: approvalStatus,
      approvalDate: new Date().toISOString(),
    }

    const success = await updateOrderStatus(order, approvalData)

    setIsSubmitting(false) // Stop loading regardless of outcome

    if (success) {
      setIsDialogOpen(false)
      setSelectedOrder("")
      // Show success message
      alert(`Order ${selectedOrder} has been approved successfully.`)
    }
  }

  const handleView = (order: any) => {
    console.log("View order:", order)
  }

  const renderCellContent = (order: any, columnKey: string) => {
    const value = order[columnKey]

    switch (columnKey) {
      case "actions":
        return (
          <Button size="sm" onClick={() => handleProcess(order.id)}>
            Process
          </Button>
        )
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
      case "isOrderAcceptable":
        return <Badge variant={value === "Yes" ? "default" : "destructive"}>{value || "N/A"}</Badge>
      case "availabilityStatus":
        return (
          <Badge variant={value === "Available" ? "default" : value === "Not Available" ? "destructive" : "secondary"}>
            {value || "N/A"}
          </Badge>
        )
      case "billingAddress":
      case "shippingAddress":
      case "orderAcceptanceChecklist":
      case "remarks":
      case "availabilityRemarks":
        return <div className="max-w-[200px] whitespace-normal break-words">{value}</div>
      default:
        return value || ""
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading orders from Google Sheets...</span>
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
      Senior Approval
    </h1>
    <p className="text-muted-foreground">Review and approve orders after inventory check</p>
    {currentUser && (
      <p className="text-sm text-muted-foreground mt-1">
        Logged in as: {currentUser.fullName} ({currentUser.role})
      </p>
    )}
  </div>
  <Button onClick={fetchOrders} variant="outline">
    <RefreshCw className="h-4 w-4 mr-2" />
    Refresh from Sheets
  </Button>
</div>

        {/* Search and Filter Controls */}
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
          {/* <Select value={selectedColumn} onValueChange={setSelectedColumn}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Columns</SelectItem>
              {pendingColumns
                .filter((col) => col.searchable)
                .map((column) => (
                  <SelectItem key={column.key} value={column.key}>
                    {column.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select> */}
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
            <TabsTrigger value="history" onClick={handleProcessedTabClick}>
              History ({filteredProcessedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <div>
          <CardTitle>Pending Inventory Check</CardTitle>
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
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: 'max-content' }}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-gray-50">
                <TableRow>
                  {pendingColumns
                    .filter((col) => visiblePendingColumns[col.key])
                    .map((column) => (
                      <TableHead 
                        key={column.key}
                        className="bg-gray-50 font-semibold text-gray-900 border-b-2 border-gray-200 px-4 py-3"
                        style={{ 
                          width: column.key === 'actions' ? '120px' : 
                                 column.key === 'orderNo' ? '120px' :
                                 column.key === 'quotationNo' ? '150px' :
                                 column.key === 'companyName' ? '250px' :
                                 column.key === 'contactPersonName' ? '180px' :
                                 column.key === 'contactNumber' ? '140px' :
                                 column.key === 'billingAddress' ? '200px' :
                                 column.key === 'shippingAddress' ? '200px' :
                                 column.key === 'isOrderAcceptable' ? '150px' :
                                 column.key === 'orderAcceptanceChecklist' ? '250px' :
                                 column.key === 'remarks' ? '200px' :
                                 '160px',
                          minWidth: column.key === 'actions' ? '120px' : 
                                   column.key === 'orderNo' ? '120px' :
                                   column.key === 'quotationNo' ? '150px' :
                                   column.key === 'companyName' ? '250px' :
                                   column.key === 'contactPersonName' ? '180px' :
                                   column.key === 'contactNumber' ? '140px' :
                                   column.key === 'billingAddress' ? '200px' :
                                   column.key === 'shippingAddress' ? '200px' :
                                   column.key === 'isOrderAcceptable' ? '150px' :
                                   column.key === 'orderAcceptanceChecklist' ? '250px' :
                                   column.key === 'remarks' ? '200px' :
                                   '160px',
                          maxWidth: column.key === 'actions' ? '120px' : 
                                   column.key === 'orderNo' ? '120px' :
                                   column.key === 'quotationNo' ? '150px' :
                                   column.key === 'companyName' ? '250px' :
                                   column.key === 'contactPersonName' ? '180px' :
                                   column.key === 'contactNumber' ? '140px' :
                                   column.key === 'billingAddress' ? '200px' :
                                   column.key === 'shippingAddress' ? '200px' :
                                   column.key === 'isOrderAcceptable' ? '150px' :
                                   column.key === 'orderAcceptanceChecklist' ? '250px' :
                                   column.key === 'remarks' ? '200px' :
                                   '160px'
                        }}
                      >
                        <div className="break-words">
                          {column.label}
                        </div>
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
            </Table>
            
            <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
              <Table>
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
                              width: column.key === 'actions' ? '120px' : 
                                     column.key === 'orderNo' ? '120px' :
                                     column.key === 'quotationNo' ? '150px' :
                                     column.key === 'companyName' ? '250px' :
                                     column.key === 'contactPersonName' ? '180px' :
                                     column.key === 'contactNumber' ? '140px' :
                                     column.key === 'billingAddress' ? '200px' :
                                     column.key === 'shippingAddress' ? '200px' :
                                     column.key === 'isOrderAcceptable' ? '150px' :
                                     column.key === 'orderAcceptanceChecklist' ? '250px' :
                                     column.key === 'remarks' ? '200px' :
                                     '160px',
                              minWidth: column.key === 'actions' ? '120px' : 
                                       column.key === 'orderNo' ? '120px' :
                                       column.key === 'quotationNo' ? '150px' :
                                       column.key === 'companyName' ? '250px' :
                                       column.key === 'contactPersonName' ? '180px' :
                                       column.key === 'contactNumber' ? '140px' :
                                       column.key === 'billingAddress' ? '200px' :
                                       column.key === 'shippingAddress' ? '200px' :
                                       column.key === 'isOrderAcceptable' ? '150px' :
                                       column.key === 'orderAcceptanceChecklist' ? '250px' :
                                       column.key === 'remarks' ? '200px' :
                                       '160px',
                              maxWidth: column.key === 'actions' ? '120px' : 
                                       column.key === 'orderNo' ? '120px' :
                                       column.key === 'quotationNo' ? '150px' :
                                       column.key === 'companyName' ? '250px' :
                                       column.key === 'contactPersonName' ? '180px' :
                                       column.key === 'contactNumber' ? '140px' :
                                       column.key === 'billingAddress' ? '200px' :
                                       column.key === 'shippingAddress' ? '200px' :
                                       column.key === 'isOrderAcceptable' ? '150px' :
                                       column.key === 'orderAcceptanceChecklist' ? '250px' :
                                       column.key === 'remarks' ? '200px' :
                                       '160px'
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
                          : "No pending orders found in Google Sheets"}
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
          <CardTitle>Inventory Check History</CardTitle>
          <CardDescription>
            Previously processed inventory checks
          </CardDescription>
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
          <span className="ml-2">Loading processed orders...</span>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 'max-content' }}>
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-gray-50">
                  <TableRow>
                    {historyColumns
                      .filter((col) => visibleHistoryColumns[col.key])
                      .map((column) => (
                        <TableHead 
                          key={column.key}
                          className="bg-gray-50 font-semibold text-gray-900 border-b-2 border-gray-200 px-4 py-3"
                          style={{ 
                            width: column.key === 'orderNo' ? '120px' :
                                   column.key === 'quotationNo' ? '150px' :
                                   column.key === 'companyName' ? '250px' :
                                   column.key === 'contactPersonName' ? '180px' :
                                   column.key === 'contactNumber' ? '140px' :
                                   column.key === 'billingAddress' ? '200px' :
                                   column.key === 'shippingAddress' ? '200px' :
                                   column.key === 'isOrderAcceptable' ? '150px' :
                                   column.key === 'orderAcceptanceChecklist' ? '250px' :
                                   column.key === 'remarks' ? '200px' :
                                   column.key === 'availabilityStatus' ? '150px' :
                                   column.key === 'inventoryRemarks' ? '200px' :
                                   '160px',
                            minWidth: column.key === 'orderNo' ? '120px' :
                                     column.key === 'quotationNo' ? '150px' :
                                     column.key === 'companyName' ? '250px' :
                                     column.key === 'contactPersonName' ? '180px' :
                                     column.key === 'contactNumber' ? '140px' :
                                     column.key === 'billingAddress' ? '200px' :
                                     column.key === 'shippingAddress' ? '200px' :
                                     column.key === 'isOrderAcceptable' ? '150px' :
                                     column.key === 'orderAcceptanceChecklist' ? '250px' :
                                     column.key === 'remarks' ? '200px' :
                                     column.key === 'availabilityStatus' ? '150px' :
                                     column.key === 'inventoryRemarks' ? '200px' :
                                     '160px',
                            maxWidth: column.key === 'orderNo' ? '120px' :
                                     column.key === 'quotationNo' ? '150px' :
                                     column.key === 'companyName' ? '250px' :
                                     column.key === 'contactPersonName' ? '180px' :
                                     column.key === 'contactNumber' ? '140px' :
                                     column.key === 'billingAddress' ? '200px' :
                                     column.key === 'shippingAddress' ? '200px' :
                                     column.key === 'isOrderAcceptable' ? '150px' :
                                     column.key === 'orderAcceptanceChecklist' ? '250px' :
                                     column.key === 'remarks' ? '200px' :
                                     column.key === 'availabilityStatus' ? '150px' :
                                     column.key === 'inventoryRemarks' ? '200px' :
                                     '160px'
                          }}
                        >
                          <div className="break-words">
                            {column.label}
                          </div>
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
              </Table>
              
              <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
                <Table>
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
                                width: column.key === 'orderNo' ? '120px' :
                                       column.key === 'quotationNo' ? '150px' :
                                       column.key === 'companyName' ? '250px' :
                                       column.key === 'contactPersonName' ? '180px' :
                                       column.key === 'contactNumber' ? '140px' :
                                       column.key === 'billingAddress' ? '200px' :
                                       column.key === 'shippingAddress' ? '200px' :
                                       column.key === 'isOrderAcceptable' ? '150px' :
                                       column.key === 'orderAcceptanceChecklist' ? '250px' :
                                       column.key === 'remarks' ? '200px' :
                                       column.key === 'availabilityStatus' ? '150px' :
                                       column.key === 'inventoryRemarks' ? '200px' :
                                       '160px',
                                minWidth: column.key === 'orderNo' ? '120px' :
                                         column.key === 'quotationNo' ? '150px' :
                                         column.key === 'companyName' ? '250px' :
                                         column.key === 'contactPersonName' ? '180px' :
                                         column.key === 'contactNumber' ? '140px' :
                                         column.key === 'billingAddress' ? '200px' :
                                         column.key === 'shippingAddress' ? '200px' :
                                         column.key === 'isOrderAcceptable' ? '150px' :
                                         column.key === 'orderAcceptanceChecklist' ? '250px' :
                                         column.key === 'remarks' ? '200px' :
                                         column.key === 'availabilityStatus' ? '150px' :
                                         column.key === 'inventoryRemarks' ? '200px' :
                                         '160px',
                                maxWidth: column.key === 'orderNo' ? '120px' :
                                         column.key === 'quotationNo' ? '150px' :
                                         column.key === 'companyName' ? '250px' :
                                         column.key === 'contactPersonName' ? '180px' :
                                         column.key === 'contactNumber' ? '140px' :
                                         column.key === 'billingAddress' ? '200px' :
                                         column.key === 'shippingAddress' ? '200px' :
                                         column.key === 'isOrderAcceptable' ? '150px' :
                                         column.key === 'orderAcceptanceChecklist' ? '250px' :
                                         column.key === 'remarks' ? '200px' :
                                         column.key === 'availabilityStatus' ? '150px' :
                                         column.key === 'inventoryRemarks' ? '200px' :
                                         '160px'
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
      )}
    </CardContent>
  </Card>
</TabsContent>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Senior Approval</DialogTitle>
              <DialogDescription>Review and approve the order</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNo">Order No.</Label>
                <Input id="orderNo" value={selectedOrder} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="approval">Approval Status *</Label>
                <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Approver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KISHAN PATEL">KISHAN PATEL</SelectItem>
                    <SelectItem value="SHASHANK SIR">SHASHANK SIR</SelectItem>
                    <SelectItem value="NEERAJ SIR">NEERAJ SIR</SelectItem>
                    <SelectItem value="PRASANNA SIR">PRASANNA SIR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!approvalStatus || currentUser?.role === "user" || isSubmitting}
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
      </div>
    </MainLayout>
  )
}
