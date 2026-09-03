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
import { Trash2, RefreshCw, Search, Settings } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { mapOrderRowToUI } from "@/lib/otp-utils"



// Column definitions for Pending tab (B to AJ + BD, BE, BF)
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
  { key: "acceptanceCopy", label: "Acceptance Copy (Purchase Order Only)", searchable: true },
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
]

// Column definitions for History tab (includes BJ, BK columns)
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "availabilityStatus", label: "Availability Status", searchable: true },
  { key: "inventoryRemarks", label: "Remarks", searchable: true },
]

export default function CheckInventoryPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [processedOrders, setProcessedOrders] = useState<any[]>([])
  const [processedLoading, setProcessedLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [availabilityStatus, setAvailabilityStatus] = useState("")
  const [remarks, setRemarks] = useState("")
  const [partialDetails, setPartialDetails] = useState<any>({})
  const [unavailableItems, setUnavailableItems] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewOrder, setViewOrder] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedColumn, setSelectedColumn] = useState("all")
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )

  const [inventoryPhotoAttachment, setInventoryPhotoAttachment] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const { user: currentUser } = useAuth()

  // Fetch pending orders from Supabase API
  const fetchOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/otp-supabase/orders?stage=check_inventory&status=pending")
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
      const response = await fetch("/api/otp-supabase/orders?stage=check_inventory&status=history")
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

    // Regular users only see data where CRE Name matches their username
    return orders.filter(order => order.creName === currentUser.username);
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

  // Filter orders based on status (pre-filtered by fetchOrders)
  const pendingOrders = filteredOrders;



  // Filter processed orders based on search term
  // Update the filteredProcessedOrders useMemo
  const filteredProcessedOrders = useMemo(() => {
    let filtered = processedOrders;

    // Apply user role-based filtering
    filtered = filterOrdersByUserRole(filtered, currentUser);

    // Apply availability filter if not "all"
    if (availabilityFilter !== "all") {
      filtered = filtered.filter(order =>
        (order.availabilityStatus || order.inventoryStatus) === availabilityFilter
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((order) => {
        if (selectedColumn === "all") {
          const searchableFields = historyColumns
            .filter((col) => col.searchable)
            .map((col) => String(order[col.key] || "").toLowerCase());
          return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()));
        } else {
          const fieldValue = String(order[selectedColumn] || "").toLowerCase();
          return fieldValue.includes(searchTerm.toLowerCase());
        }
      });
    }

    return filtered;
  }, [processedOrders, searchTerm, selectedColumn, availabilityFilter, currentUser]);

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



  // Update order status via Supabase orders API
  const updateOrderStatus = async (order: any, inventoryData: any) => {
    try {
      const orderNo = order.orderNo || order.id

      let uploadedPhotoUrl = ""
      if (inventoryPhotoAttachment) {
        try {
          const uploadFormData = new FormData()
          uploadFormData.append("file", inventoryPhotoAttachment)
          uploadFormData.append("folder", "check-inventory")

          const uploadRes = await fetch("/api/otp-supabase/attachments", {
            method: "POST",
            body: uploadFormData,
          })
          const uploadJson = await uploadRes.json()
          if (uploadJson.success) {
            uploadedPhotoUrl = uploadJson.url
          }
        } catch (uploadErr) {
          console.error("Error uploading inventory photo attachment:", uploadErr)
        }
      }

      const stageData: any = {
        availability_status: inventoryData.availabilityStatus,
        remarks: inventoryData.remarks || "",
        created_by: currentUser?.fullName || currentUser?.username || "Admin",
        actual_date: new Date().toISOString(),
      }

      if (inventoryData.availabilityStatus === "Not Available" || inventoryData.availabilityStatus === "Partial") {
        stageData.customer_wants_material_as = inventoryData.partialDetails?.customerDecision || ""
        stageData.warehouse_location = inventoryData.partialDetails?.warehouseLocation || ""
        stageData.create_indent_if_not_avail = !!inventoryData.partialDetails?.createIndent
        stageData.line_item_number = inventoryData.partialDetails?.lineItemNumber || ""
        stageData.total_qty = inventoryData.partialDetails?.totalQty ? Number(inventoryData.partialDetails.totalQty) : null
        stageData.material_received_lead_time = inventoryData.partialDetails?.leadTime ? Number(inventoryData.partialDetails.leadTime) : null
      }

      const updateResponse = await fetch("/api/otp-supabase/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo: orderNo,
          stage: "check_inventory",
          stageData,
        }),
      })

      const result = await updateResponse.json()

      if (result.success) {
        await fetchOrders()
        return { success: true, fileUrls: uploadedPhotoUrl ? [uploadedPhotoUrl] : [] }
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (err: any) {
      console.error("Error updating order:", err)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Ensure the result is a string
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const calculateTotalQty = (items: any[]) => {
    return items.reduce((total: number, item: any) => total + (Number(item.qty) || 0), 0);
  };

  const handleSubmit = async () => {
    if (!selectedOrder || !availabilityStatus) return;

    setUploading(true);
    setIsSubmitting(true);
    setError(null);

    try {
      let inventoryPhotoUrl = "";

      // Handle inventory photo upload
      if (inventoryPhotoAttachment) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", inventoryPhotoAttachment);
          uploadFormData.append("folder", "check-inventory");
          const uploadRes = await fetch("/api/otp-supabase/attachments", {
            method: "POST",
            body: uploadFormData,
          });
          const uploadJson = await uploadRes.json();
          if (uploadJson.success) inventoryPhotoUrl = uploadJson.url;
        } catch (uploadErr) {
          console.error("Error uploading inventory photo:", uploadErr);
        }
      }

      const orderNo = selectedOrder.orderNo || selectedOrder.id;

      const patchResponse = await fetch("/api/otp-supabase/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo,
          stage: "check_inventory",
          stageData: {
            availability_status: availabilityStatus,
            remarks: remarks || "",
            customer_wants_material_as: partialDetails.customerDecision || null,
            created_by: partialDetails.createdBy || currentUser?.fullName || currentUser?.username || "Admin",
            warehouse_location: partialDetails.warehouseLocation || null,
            create_indent_if_not_avail: !!partialDetails.createIndent,
            line_item_number: partialDetails.lineItemNumber || null,
            total_qty: partialDetails.totalQty ? Number(partialDetails.totalQty) : null,
            material_received_lead_time: partialDetails.leadTime ? Number(partialDetails.leadTime) : null,
            actual_date: new Date().toISOString()
          }
        }),
      });

      const result = await patchResponse.json();

      if (!result.success) {
        throw new Error(result.error || "Update failed");
      }

      // Secondary submission to Supabase (Indent Generation)
      if (availabilityStatus === "Partial" || availabilityStatus === "Not Available") {
        try {
          let filePayload = null;
          if (inventoryPhotoAttachment) {
            try {
              const base64Data = await convertFileToBase64(inventoryPhotoAttachment);
              filePayload = {
                base64: base64Data,
                name: inventoryPhotoAttachment.name,
                type: inventoryPhotoAttachment.type,
              };
            } catch (err) {
              console.error("Error preparing file base64 for Supabase upload:", err);
            }
          }

          const validItems = unavailableItems
            .filter((item) => item.name && item.name.trim() !== "")
            .map((item) => ({ name: item.name, qty: Number(item.qty) || 0 }));

          const payload = {
            items: validItems.length > 0 ? validItems : [{
              name: selectedOrder?.orderNo ? `Order ${selectedOrder.orderNo} Material` : (partialDetails.lineItemNumber ? `Line ${partialDetails.lineItemNumber}` : "Material"),
              qty: Number(partialDetails.totalQty) || 1
            }],
            totalQty: partialDetails.totalQty || "",
            createdBy: partialDetails.createdBy || "",
            warehouseLocation: partialDetails.warehouseLocation || "",
            lineItemNumber: partialDetails.lineItemNumber || "",
            leadTime: partialDetails.leadTime || "",
            remarks: remarks || "",
            file: filePayload,
          };

          const indentResponse = await fetch("/api/generate-indent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (indentResponse.ok) {
            const indentResult = await indentResponse.json();
            if (indentResult.success) {
              console.log("✅ Supabase indent records created:", indentResult.generatedIds);
            } else {
              console.warn("⚠️ Supabase indent creation warning:", indentResult.error);
            }
          } else {
            console.error("❌ Supabase indent endpoint returned status:", indentResponse.status);
          }
        } catch (indentErr) {
          console.error("❌ Error submitting to Supabase (non-blocking):", indentErr);
        }
      }

      setIsDialogOpen(false);
      setSelectedOrder(null);
      setInventoryPhotoAttachment(null);

      await fetchOrders();

      let message = `Inventory check for order ${orderNo} updated successfully`;
      if (inventoryPhotoUrl) {
        message += `\n\nPhoto uploaded: ${inventoryPhotoUrl}`;
      }
      alert(message);

    } catch (err: any) {
      console.error("Submission error:", err);
      alert(`Error: ${err.message}`)
    } finally {
      setUploading(false)
      setIsSubmitting(false)
    }
  }

  const handleProcess = (order: any) => {
    setSelectedOrder(order)
    setAvailabilityStatus("")
    setRemarks("")
    setPartialDetails({
      customerDecision: "",
      createdBy: "",
      warehouseLocation: "",
      createIndent: false,
      lineItemNumber: "",
      totalQty: "",
      leadTime: ""
    })

    // Extract items from the order data (columns M to AF) - first 10 items
    const extractedItems: Array<{ name: string; qty: number }> = []
    if (order.fullRowData) {
      for (let i = 12; i <= 31; i += 2) { // Columns M (12) to AF (31)
        const nameCol = order.fullRowData[i]
        const qtyCol = order.fullRowData[i + 1]

        if (nameCol && nameCol.v && nameCol.v.toString().trim() !== "") {
          extractedItems.push({
            name: nameCol.v.toString(),
            qty: qtyCol ? Number(qtyCol.v) || 0 : 0,
          })
        }
      }
    } else if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        extractedItems.push({
          name: item.name || item.itemName || "",
          qty: item.qty || item.quantity || 0,
        })
      })
    }

    setUnavailableItems(extractedItems)
    setIsDialogOpen(true)
  }



  const addUnavailableItem = () => {
    setUnavailableItems([...unavailableItems, { name: "", qty: 0 }])
  }

  const removeUnavailableItem = (index: number) => {
    setUnavailableItems(unavailableItems.filter((_, i) => i !== index))
  }

  const updateUnavailableItem = (index: number, field: "name" | "qty", value: string | number) => {
    const updated = [...unavailableItems];
    updated[index] = { ...updated[index], [field]: value };
    setUnavailableItems(updated);

    // Update total qty whenever quantity changes
    if (field === "qty") {
      setPartialDetails((prev: any) => ({
        ...prev,
        totalQty: calculateTotalQty(updated).toString()
      }));
    }
  };

  useEffect(() => {
    if (availabilityStatus === "Not Available" || availabilityStatus === "Partial") {
      // Calculate initial total qty from unavailable items if available
      const initialTotalQty = calculateTotalQty(unavailableItems);
      if (initialTotalQty > 0) {
        setPartialDetails((prev: any) => ({
          ...prev,
          totalQty: initialTotalQty.toString()
        }));
      }
    }
  }, [availabilityStatus, unavailableItems]);

  // const handleSubmit = async () => {
  //   if (!selectedOrder || !availabilityStatus) return

  //   setIsSubmitting(true) // Start loading

  //   const inventoryData = {
  //     availabilityStatus,
  //     remarks,
  //     partialDetails: availabilityStatus === "Partial" ? partialDetails : "",
  //     unavailableItems:
  //       availabilityStatus === "Not Available" || availabilityStatus === "Partial" ? unavailableItems : [],
  //     processedAt: new Date().toISOString(),
  //     processedBy: "Current User",
  //   }

  //   const success = await updateOrderStatus(selectedOrder, inventoryData)

  //   setIsSubmitting(false) // Stop loading regardless of outcome

  //   if (success) {
  //     setIsDialogOpen(false)
  //     setSelectedOrder(null)
  //     // Show success message
  //     alert(`Order ${selectedOrder.id} has been updated successfully.`)
  //   }
  // }

  const handleView = (order: any) => {
    setViewOrder(order)
    setViewDialogOpen(true)
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
      case "inventoryRemarks":
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
              Check Inventory
            </h1>
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
                      Previously processed inventory checks (where both BG and BH columns have data)
                    </CardDescription>
                  </div>
                  <div className="flex gap-4">
                    <Select
                      value={availabilityFilter}
                      onValueChange={setAvailabilityFilter}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Not Available">Not Available</SelectItem>
                        <SelectItem value="Partial">Partial</SelectItem>
                      </SelectContent>
                    </Select>
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

        {/* Process Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Check Inventory</DialogTitle>
              <DialogDescription>Verify item availability for the order</DialogDescription>
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
              <div className="space-y-2">
                <Label htmlFor="availability">Availability Status *</Label>
                <Select value={availabilityStatus} onValueChange={setAvailabilityStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Not Available">Not Available</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {availabilityStatus === "Available" && (
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter remarks..."
                  />
                </div>
              )}

              {(availabilityStatus === "Partial" || availabilityStatus === "Not Available") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="customerDecision">Customer wants material as</Label>
                    <Select
                      value={partialDetails.customerDecision || ""}
                      onValueChange={(value) => setPartialDetails({ ...partialDetails, customerDecision: value })}
                    >
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

                  {/* <div className="space-y-4">
  <Label>Items Not Available</Label>
  {unavailableItems.map((item, index) => (
    <div key={index} className="flex gap-2 items-end">
      <div className="flex-1">
        <Label htmlFor={`itemName-${index}`}>Item Name {index + 1}</Label>
        <Input
          id={`itemName-${index}`}
          value={item.name}
          onChange={(e) => updateUnavailableItem(index, "name", e.target.value)}
          placeholder="Enter item name"
        />
      </div>
      <div className="w-24">
        <Label htmlFor={`qty-${index}`}>QTY</Label>
        <Input
          id={`qty-${index}`}
          type="number"
          value={item.qty}
          onChange={(e) => updateUnavailableItem(index, "qty", Number.parseInt(e.target.value) || 0)}
          placeholder="0"
        />
      </div>
      <Button 
        type="button" 
        size="sm" 
        variant="outline" 
        onClick={() => removeUnavailableItem(index)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  ))}
  
  <div className="space-y-2">
    <Label htmlFor="totalQty">Total qty</Label>
    <Input
      type="number"
      id="totalQty"
      value={partialDetails.totalQty || ""}
      placeholder="Will auto-calculate"
      readOnly
    />
  </div>
</div> */}

                  <div className="space-y-2">
                    <Label htmlFor="createdBy">Created by</Label>
                    <Select
                      value={partialDetails.createdBy || ""}
                      onValueChange={(value) => setPartialDetails({ ...partialDetails, createdBy: value })}
                    >
                      <SelectTrigger id="createdBy">
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sarita Baghel">Sarita Baghel</SelectItem>
                        <SelectItem value="Khushi Khemani">Khushi Khemani</SelectItem>
                        <SelectItem value="SATYA KUMARI OGREY">SATYA KUMARI OGREY</SelectItem>
                        <SelectItem value="PRIYANKA VISHWAS">PRIYANKA VISHWAS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warehouseLocation">Warehouse location</Label>
                    <Select
                      value={partialDetails.warehouseLocation || ""}
                      onValueChange={(value) => setPartialDetails({ ...partialDetails, warehouseLocation: value })}
                    >
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
                    <Label htmlFor="inventoryPhoto">Inventory Photo</Label>
                    <Input
                      id="inventoryPhoto"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setInventoryPhotoAttachment(e.target.files?.[0] || null)}
                    />
                    {inventoryPhotoAttachment && (
                      <p className="text-sm text-muted-foreground">Selected: {inventoryPhotoAttachment.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lineItemNumber">Line item number</Label>
                    <Input
                      type="number"
                      id="lineItemNumber"
                      value={partialDetails.lineItemNumber || ""}
                      onChange={(e) => setPartialDetails({ ...partialDetails, lineItemNumber: e.target.value })}
                      placeholder="Enter line item number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalQty">Total qty</Label>
                    <Input
                      type="number"
                      id="totalQty"
                      value={partialDetails.totalQty || ""}
                      onChange={(e) => setPartialDetails({ ...partialDetails, totalQty: e.target.value })}
                      placeholder="Enter or auto-calculated"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leadTime">Material received lead time</Label>
                    <Input
                      type="number"
                      id="leadTime"
                      value={partialDetails.leadTime || ""}
                      onChange={(e) => setPartialDetails({ ...partialDetails, leadTime: e.target.value })}
                      placeholder="Enter lead time in days"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea
                      id="remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter remarks..."
                    />
                  </div>
                  <div className="space-y-4">
                    <Label>Items Not Available</Label>
                    {unavailableItems.map((item, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label htmlFor={`itemName-${index}`}>Item Name {index + 1}</Label>
                          <Input
                            id={`itemName-${index}`}
                            value={item.name}
                            onChange={(e) => updateUnavailableItem(index, "name", e.target.value)}
                            placeholder="Enter item name"
                          />
                        </div>
                        <div className="w-24">
                          <Label htmlFor={`qty-${index}`}>QTY</Label>
                          <Input
                            id={`qty-${index}`}
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateUnavailableItem(index, "qty", Number.parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => removeUnavailableItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {/* <div className="space-y-2">
    <Label htmlFor="totalQty">Total qty</Label>
    <Input
      type="number"
      id="totalQty"
      value={partialDetails.totalQty || ""}
      placeholder="Will auto-calculate"
      readOnly
    />
  </div> */}
                  </div>


                  {/* {availabilityStatus === "Partial" && (
            <div className="space-y-4">
              {unavailableItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label htmlFor={`itemName-${index}`}>Item Name</Label>
                    <Input
                      id={`itemName-${index}`}
                      value={item.name}
                      onChange={(e) => updateUnavailableItem(index, "name", e.target.value)}
                      placeholder="Enter item name"
                    />
                  </div>
                  <div className="w-24">
                    <Label htmlFor={`qty-${index}`}>QTY</Label>
                    <Input
                      id={`qty-${index}`}
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateUnavailableItem(index, "qty", Number.parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => removeUnavailableItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addUnavailableItem}>
                Add Unavailable Item
              </Button>
            </div>
          )} */}
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!availabilityStatus || currentUser?.role === "user" || isSubmitting}
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
              <DialogTitle>Inventory Check Details</DialogTitle>
              <DialogDescription>View inventory check information and results</DialogDescription>
            </DialogHeader>
            {viewOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Order No.</Label>
                    <p className="text-sm">{viewOrder.orderNo || viewOrder.id}</p>
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
                {(viewOrder.availabilityStatus || viewOrder.inventoryStatus) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Availability Status</Label>
                      <p className="text-sm">{viewOrder.availabilityStatus || viewOrder.inventoryStatus}</p>
                    </div>
                    <div>
                      <Label>Remarks</Label>
                      <p className="text-sm">{viewOrder.inventoryRemarks || "N/A"}</p>
                    </div>
                  </div>
                )}
                {(viewOrder.processedDate || viewOrder.timestamp) && (
                  <div>
                    <Label>Processed Date</Label>
                    <p className="text-sm">
                      {viewOrder.processedDate
                        ? new Date(viewOrder.processedDate).toLocaleDateString()
                        : viewOrder.timestamp}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
