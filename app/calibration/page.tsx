"use client"

import { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useData } from "@/components/data-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { RefreshCw, Search, Settings } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

import { mapDispatchRowToUI } from "@/lib/otp-utils"

export default function CalibrationPage() {
  const { orders, updateOrder } = useData()
  const [selectedOrder, setSelectedOrder] = useState<string>("")
  const [activeSection, setActiveSection] = useState<"LAB" | "TOTAL STATION">("LAB")
  const [calibrationDate, setCalibrationDate] = useState("")
  const [calibrationPeriod, setCalibrationPeriod] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewOrder, setViewOrder] = useState<any>(null)
  const [certificateFile, setCertificateFile] = useState<File | null>(null)

  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [historyOrders, setHistoryOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const {user: currentUser} = useAuth();

  const fetchPendingOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/otp-supabase/dispatches?stage=calibration&status=pending")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map(mapDispatchRowToUI)
        setPendingOrders(mapped)
      } else {
        setPendingOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching pending calibration orders:", err)
      setError(err.message)
      setPendingOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchHistoryOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/otp-supabase/dispatches?stage=calibration&status=history")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map(mapDispatchRowToUI)
        setHistoryOrders(mapped)
      } else {
        setHistoryOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching history calibration orders:", err)
      setError(err.message)
      setHistoryOrders([])
    } finally {
      setLoading(false)
    }
  }

  // Column definitions for Pending tab (B to BJ plus warehouse material history headers)
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
    { key: "quotationCopy", label: "Quotation Copy", searchable: true },
    { key: "paymentTerms", label: "Payment Terms(In Days)", searchable: true },
    { key: "transportMode", label: "Transport Mode", searchable: true },
    { key: "freightType", label: "Freight Type", searchable: true },
    { key: "destination", label: "Destination", searchable: true },
    { key: "poNumber", label: "Po Number", searchable: true },
    { key: "invoiceNumber", label: "Invoice-No.", searchable: true },
    { key: "quotationCopy2", label: "Invoice Upload", searchable: true },
    { key: "acceptanceCopy", label: "Acceptance Copy (Purchase Order Only)", searchable: true },
    { key: "offer", label: "Offer", searchable: true },
    { key: "conveyedForRegistration", label: "Conveyed For Registration Form", searchable: true },
    { key: "qty", label: "Qty", searchable: true },
    { key: "amount", label: "Amount", searchable: true },
    { key: "approvedName", label: "Approved Name", searchable: true },
    { key: "calibrationCertRequired", label: "Calibration Certificate Required", searchable: true },
    { key: "certificateCategory", label: "Certificate Category", searchable: true },
    { key: "installationRequired", label: "Installation Required", searchable: true },
    { key: "ewayBillDetails", label: "Eway Bill Details", searchable: true },
    { key: "ewayBillAttachment", label: "Eway Bill Attachment", searchable: true },
    { key: "srnNumber", label: "Srn Number", searchable: true },
    { key: "srnNumberAttachment", label: "Srn Number Attachment", searchable: true },
    { key: "attachment", label: "Attachment", searchable: true },
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
    { key: "itemName11", label: "Item Name 11", searchable: true },
    { key: "quantity11", label: "Quantity 11", searchable: true },
    { key: "itemName12", label: "Item Name 12", searchable: true },
    { key: "quantity12", label: "Quantity 12", searchable: true },
    { key: "itemName13", label: "Item Name 13", searchable: true },
    { key: "quantity13", label: "Quantity 13", searchable: true },
    { key: "itemName14", label: "Item Name 14", searchable: true },
    { key: "quantity14", label: "Quantity 14", searchable: true },
    { key: "itemName15", label: "Item Name 15", searchable: true },
    { key: "quantity15", label: "Quantity 15", searchable: true },
    { key: "totalQty", label: "Total Qty", searchable: true },
    { key: "remarks", label: "Remarks", searchable: true },
    // Warehouse material history headers (BV to CC)
    { key: "beforePhotoUpload", label: "Before Photo Upload", searchable: false },
    { key: "afterPhotoUpload", label: "After Photo Upload", searchable: false },
    { key: "biltyUpload", label: "Bilty Upload", searchable: false },
    { key: "transporterName", label: "Transporter/Courier/Flight-Person Name", searchable: true },
    { key: "transporterContact", label: "Transporter/Courier/Flight-Person Contact No.", searchable: true },
    { key: "biltyNumber", label: "Transporter/Courier/Flight-Bilty No./Docket No.", searchable: true },
    { key: "totalCharges", label: "Total Charges", searchable: true },
    { key: "warehouseRemarks", label: "Warehouse Remarks", searchable: true },
    // Material receiving status (CG to CI)
    { key: "materialReceivingStatus", label: "Material Receiving Status", searchable: true },
    { key: "reason", label: "Reason", searchable: true },
    { key: "installationRequiredHistory", label: "Installation Required", searchable: true },
    { key: "dSrNumber", label: "D-Sr Number", searchable: true },
  ]

  // Column definitions for History tab (includes CM to CT)
  const historyColumns = [
    ...pendingColumns.filter((col) => col.key !== "actions"),
    // CM to CT columns
    { key: "labCalibrationCertificate", label: "Lab Calibration Certificate", searchable: false },
    { key: "stCalibrationCertificate", label: "ST Calibration Certificate", searchable: false },
    { key: "labCalibrationDate", label: "Lab Calibration Date", searchable: true },
    { key: "stCalibrationDate", label: "ST Calibration Date", searchable: true },
    { key: "labCalibrationPeriod", label: "Lab Calibration Period", searchable: true },
    { key: "stCalibrationPeriod", label: "ST Calibration Period", searchable: true },
    { key: "labDueDate", label: "Lab Due Date", searchable: true },
    { key: "stDueDate", label: "ST Due Date", searchable: true },
  ]

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedColumn, setSelectedColumn] = useState("all")
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}),
  )
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}),
  )

  const formatGoogleSheetsDate = (dateValue: any) => {
    if (!dateValue) return "";
  
    // Handle the case where date comes as "Date(2025,5,21)"
    if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
      try {
        // Extract the numbers between parentheses
        const dateParts = dateValue.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (dateParts && dateParts.length === 4) {
          const year = parseInt(dateParts[1]);
          const month = parseInt(dateParts[2]); // Note: months are 0-indexed in JS
          const day = parseInt(dateParts[3]);
          
          // Create a date object (month is 0-indexed in JS, so no need to subtract 1)
          const date = new Date(year, month, day);
          
          // Format as dd/mm/yyyy
          const formattedDay = String(date.getDate()).padStart(2, '0');
          const formattedMonth = String(date.getMonth() + 1).padStart(2, '0'); // +1 because months are 0-indexed
          const formattedYear = date.getFullYear();
          
          return `${formattedDay}/${formattedMonth}/${formattedYear}`;
        }
      } catch (e) {
        console.error("Error parsing date string:", e);
      }
    }
  
    // Handle case where date comes as a serial number or string
    try {
      // If it's a number (serial date value from Google Sheets)
      if (typeof dateValue === 'number') {
        // Google Sheets serial date starts from Dec 30, 1899
        const date = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
        const formattedDay = String(date.getDate()).padStart(2, '0');
        const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
        const formattedYear = date.getFullYear();
        
        return `${formattedDay}/${formattedMonth}/${formattedYear}`;
      }
      
      // If it's already a date string in some format
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const formattedDay = String(date.getDate()).padStart(2, '0');
        const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
        const formattedYear = date.getFullYear();
        
        return `${formattedDay}/${formattedMonth}/${formattedYear}`;
      }
    } catch (e) {
      console.error("Error parsing date value:", e);
    }
  
    // If all else fails, return the original value
    return dateValue;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A"

    // Handle Date() constructor format like "Date(2025,5,19)"
    if (dateStr.startsWith("Date(")) {
      try {
        const parts = dateStr.match(/Date$$(\d+),(\d+),(\d+)$$/)
        if (parts) {
          const year = Number.parseInt(parts[1])
          const month = Number.parseInt(parts[2])
          const day = Number.parseInt(parts[3])
          // Note: JavaScript months are 0-indexed (5 = June)
          return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`
        }
      } catch (e) {
        console.error("Error parsing Date() format:", e)
      }
    }

    // Handle ISO format like "2025-06-19"
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split("-")
      return `${day}/${month}/${year}`
    }

    // Handle other formats or return as-is if already formatted
    return dateStr
  }



  useEffect(() => {
    fetchPendingOrders()
    fetchHistoryOrders()
  }, [])

  // Filter orders based on search term and selected column
  const filterOrdersByUserRole = (orders: any[], currentUser: any) => {
    if (!currentUser) return orders;
    
    // Super admin and admin see all data
    if (currentUser.role === "super_admin" || currentUser.role === "admin") {
      return orders;
    }
    
    // If user has 'all' or this step assigned
    if (currentUser.assignedSteps?.includes("all") || currentUser.assignedSteps?.includes("calibration")) {
      return orders;
    }
    
    // Regular users only see data where CRE Name matches their username or full name
    return orders.filter(order => 
      !order.creName || 
      order.creName.toLowerCase() === (currentUser.username || "").toLowerCase() ||
      (currentUser.fullName && order.creName.toLowerCase() === currentUser.fullName.toLowerCase())
    );
  };

// Update the filteredPendingOrders useMemo to include role-based filtering
const filteredPendingOrders = useMemo(() => {
  let filtered = pendingOrders;

  // Apply user role-based filtering
  filtered = filterOrdersByUserRole(filtered, currentUser);

  if (searchTerm) {
    filtered = filtered.filter((order) => {
      if (selectedColumn === "all") {
        const searchableFields = pendingColumns
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
}, [pendingOrders, searchTerm, selectedColumn, currentUser]);

// Update the filteredHistoryOrders useMemo to include role-based filtering
const filteredHistoryOrders = useMemo(() => {
  let filtered = historyOrders;

  // Apply user role-based filtering
  filtered = filterOrdersByUserRole(filtered, currentUser);

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
}, [historyOrders, searchTerm, selectedColumn, currentUser]);

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

  // Legacy orders from useData hook (keep for backward compatibility)
  const legacyPendingOrders = orders.filter(
    (order) => order.status === "material-received" && order.dispatchData?.calibrationRequired === "YES",
  )
  const legacyProcessedOrders = orders.filter((order) => order.calibrationData)

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

const updateOrderStatus = async (order: any) => {
  try {
    setUploading(true)

    let certUrl = "";
    if (certificateFile) {
      try {
        const uploadFormData = new FormData();
        uploadFormData.append("file", certificateFile);
        uploadFormData.append("folder", "calibration");
        const uploadRes = await fetch("/api/otp-supabase/attachments", {
          method: "POST",
          body: uploadFormData,
        });
        const uploadJson = await uploadRes.json();
        if (uploadJson.success) certUrl = uploadJson.url;
      } catch (uploadErr) {
        console.error("Error uploading certificate:", uploadErr);
      }
    }

    const dispatchNo = order.dispatchNo || order.dSrNumber || order.id;

    const dueDate = calculateDueDate(calibrationDate, calibrationPeriod);

    const updateResponse = await fetch("/api/otp-supabase/dispatches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dispatchNo,
        stage: "calibration",
        stageData: {
          calibration_type: activeSection,
          certificate_upload: certUrl,
          calibration_date: calibrationDate || null,
          calibration_period: calibrationPeriod,
          due_date: dueDate || null,
          created_by: currentUser?.fullName || currentUser?.username || "Admin",
          actual_date: new Date().toISOString(),
        },
      }),
    });

    const result = await updateResponse.json();

    if (result.success) {
      await fetchPendingOrders()
      await fetchHistoryOrders()
      return { success: true, fileUrls: { certificateUrl: certUrl } }
    } else {
      throw new Error(result.error || "Update failed")
    }
  } catch (err: any) {
    console.error("Error updating dispatch:", err)
    setError(err.message)
    return { success: false, error: err.message }
  } finally {
    setUploading(false)
  }
}

  const handleProcess = (orderId: string, section: "LAB" | "TOTAL STATION") => {
    setSelectedOrder(orderId)
    setActiveSection(section)
    setCalibrationDate("")
    setCalibrationPeriod(section === "LAB" ? "" : "12") // Auto-set period for TOTAL STATION
    setCertificateFile(null)
    setIsDialogOpen(true)
  }

  const calculateDueDate = (calibrationDate: string, period: string) => {
    if (!calibrationDate || !period) return ""
    const date = new Date(calibrationDate)
    date.setMonth(date.getMonth() + Number.parseInt(period))
    return date.toISOString().split("T")[0]
  }

  const handleSubmit = async () => {
    if (!selectedOrder || !calibrationDate || !calibrationPeriod) return

    const order = pendingOrders.find((o) => o.id === selectedOrder)
    if (!order) {
      // Fallback to legacy orders
      const dueDate = calculateDueDate(calibrationDate, calibrationPeriod)

      const calibrationData = {
        section: activeSection,
        calibrationDate,
        calibrationPeriod: Number.parseInt(calibrationPeriod),
        dueDate,
        processedAt: new Date().toISOString(),
        processedBy: "Current User",
      }

      updateOrder(selectedOrder, {
        status: "calibration-completed",
        calibrationData,
      })

      setIsDialogOpen(false)
      setSelectedOrder("")
      return
    }

    const result = await updateOrderStatus(order)

    if (result.success) {
      setIsDialogOpen(false)
      setSelectedOrder("")
      let message = `Calibration processing for order ${selectedOrder} has been completed successfully`
      if (result.fileUrls && result.fileUrls.certificateUrl) {
        message += "\n\nCertificate uploaded to Google Drive"
      }
      alert(message)
    } else {
      alert(`Error processing calibration: ${result.error}`)
    }
  }

  const handleView = (order: any) => {
    setViewOrder(order)
    setViewDialogOpen(true)
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
            <Button
              onClick={() => {
                fetchPendingOrders()
                fetchHistoryOrders()
              }}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchPendingOrders(), fetchHistoryOrders()])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderCellContent = (order: any, columnKey: string) => {
    const value = order[columnKey]

    switch (columnKey) {
      case "actions":
        return (
          <Button size="sm" onClick={() => handleProcess(order.id, order.calibrationType)}>
            Process
          </Button>
        )
      case "quotationCopy":
      case "quotationCopy2":
      //   return <Badge variant={value === "" ? "default" : ""}>{value || ""}</Badge>
      case "acceptanceCopy":
        return value && typeof value === "string" && (value.startsWith("http") || value.startsWith("https")) ? (
          <a href={value} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">Link</Badge>
          </a>
        ) : (
          <Badge variant="secondary">{value || ""}</Badge>
        )
      case "calibrationCertRequired":
      case "installationRequired":
      case "installationRequiredHistory":
        return <Badge variant={value === "Yes" || value === "YES" ? "default" : "secondary"}>{value || "N/A"}</Badge>
      case "billingAddress":
      case "shippingAddress":
      case "remarks":
      case "warehouseRemarks":
      case "reason":
        return <div className="max-w-[200px] whitespace-normal break-words">{value || ""}</div>
        case "acceptanceCopy":
    case "ewayBillAttachment":
    case "srnNumberAttachment":
    case "attachment":
    case "invoiceUpload":
    case "ewayBillUpload":
      case "beforePhotoUpload":
      case "afterPhotoUpload":
      case "biltyUpload":
      case "labCalibrationCertificate":
      case "stCalibrationCertificate":
        return value && typeof value === "string" && (value.startsWith("http") || value.startsWith("https")) ? (
          <a href={value} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">View</Badge>
          </a>
        ) : (
          <Badge variant="secondary">N/A</Badge>
        )
      case "materialReceivingStatus":
        return <Badge variant={value === "yes" ? "default" : "secondary"}>{value || "N/A"}</Badge>
      case "labCalibrationDate":
      case "stCalibrationDate":
      case "labDueDate":
      case "stDueDate":
        return formatDate(value)
      default:
        return value || ""
    }
  }

  const renderTable = (title: string, description: string, section: "LAB" | "TOTAL STATION") => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {pendingColumns
                  .filter((col) => visiblePendingColumns[col.key])
                  .map((column) => (
                    <TableHead key={column.key}>{column.label}</TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPendingOrders
                .filter((order) => {
                  const type = String(order.calibrationType || order.certificateCategory || "LAB").toUpperCase().trim()
                  return section === "TOTAL STATION" ? type.includes("TOTAL") : !type.includes("TOTAL")
                })
                .map((order, idx) => (
                  <TableRow key={order.id || order.orderId || order.orderNo || idx}>
                    {pendingColumns
                      .filter((col) => visiblePendingColumns[col.key])
                      .map((column) => (
                        <TableCell key={column.key}>{renderCellContent(order, column.key)}</TableCell>
                      ))}
                  </TableRow>
                ))}
              {filteredPendingOrders.filter((order) => {
                const type = String(order.calibrationType || order.certificateCategory || "LAB").toUpperCase().trim()
                return section === "TOTAL STATION" ? type.includes("TOTAL") : !type.includes("TOTAL")
              }).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={pendingColumns.filter((col) => visiblePendingColumns[col.key]).length}
                    className="text-center text-muted-foreground"
                  >
                    {searchTerm ? "No orders match your search criteria" : `No pending ${section} orders found`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  const renderHistoryTable = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Calibration History</CardTitle>
            <CardDescription>All completed calibration certificates</CardDescription>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {historyColumns
                  .filter((col) => visibleHistoryColumns[col.key])
                  .map((column) => (
                    <TableHead key={column.key}>{column.label}</TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistoryOrders.map((order, idx) => (
                <TableRow key={order.id || order.orderId || order.orderNo || idx}>
                  {historyColumns
                    .filter((col) => visibleHistoryColumns[col.key])
                    .map((column) => (
                      <TableCell key={column.key}>{renderCellContent(order, column.key)}</TableCell>
                    ))}
                </TableRow>
              ))}
              {filteredHistoryOrders.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={historyColumns.filter((col) => visibleHistoryColumns[col.key]).length}
                    className="text-center text-muted-foreground"
                  >
                    {searchTerm ? "No orders match your search criteria" : "No history orders found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <MainLayout>
      <div className="space-y-6">
       <div className="flex justify-between items-center">
  <div>
    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
      Calibration Certificate Required
    </h1>
    {currentUser && (
      <p className="text-sm text-muted-foreground mt-1">
        Logged in as: {currentUser.fullName} ({currentUser.role})
      </p>
    )}
  </div>
  <Button onClick={handleRefresh} variant="outline">
    <RefreshCw className="h-4 w-4 mr-2" />
    Refresh
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
          <Select value={selectedColumn} onValueChange={setSelectedColumn}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Columns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Columns</SelectItem>
              {pendingColumns
                .filter((col) => col.searchable)
                .map((col) => (
                  <SelectItem key={col.key} value={col.key}>
                    {col.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({filteredPendingOrders.length})</TabsTrigger>
            <TabsTrigger value="history">History ({filteredHistoryOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
         <Tabs defaultValue="LAB" className="space-y-4">
  <TabsList>
    <TabsTrigger value="LAB">
      LAB ({filteredPendingOrders.filter(order => !String(order.calibrationType || order.certificateCategory || "").toUpperCase().includes("TOTAL")).length})
    </TabsTrigger>
    <TabsTrigger value="TOTAL STATION">
      TOTAL STATION ({filteredPendingOrders.filter(order => String(order.calibrationType || order.certificateCategory || "").toUpperCase().includes("TOTAL")).length})
    </TabsTrigger>
  </TabsList>

  <TabsContent value="LAB">
    {renderTable("LAB Calibration", "Pending LAB calibration certificates", "LAB")}
  </TabsContent>

  <TabsContent value="TOTAL STATION">
    {renderTable(
      "TOTAL STATION Calibration",
      "Pending TOTAL STATION calibration certificates",
      "TOTAL STATION",
    )}
  </TabsContent>
</Tabs>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {renderHistoryTable()}
          </TabsContent>
        </Tabs>

        {/* Process Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload {activeSection} Calibration Certificate</DialogTitle>
              <DialogDescription>Upload calibration certificate with details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input id="orderNumber" value={selectedOrder} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input id="section" value={activeSection} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="certificate">Certificate Attachment</Label>
                <Input
                  id="certificate"
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                />
                {certificateFile && <p className="text-sm text-muted-foreground">Selected: {certificateFile.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="calibrationDate">Calibration Date</Label>
                <Input
                  id="calibrationDate"
                  type="date"
                  value={calibrationDate}
                  onChange={(e) => setCalibrationDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calibrationPeriod">Calibration Period (Months)</Label>
                {activeSection === "LAB" ? (
                  <Select value={calibrationPeriod} onValueChange={setCalibrationPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input id="calibrationPeriod" value="12 Months" disabled />
                )}
              </div>
              {calibrationDate && calibrationPeriod && (
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date (Auto-calculated)</Label>
                  <Input id="dueDate" value={calculateDueDate(calibrationDate, calibrationPeriod)} disabled />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
               <Button 
  onClick={handleSubmit} 
  disabled={!calibrationDate || !calibrationPeriod || uploading || currentUser?.role === "user"}
>
  {uploading ? (
    <>
      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      Uploading...
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
              <DialogTitle>Calibration Certificate Details</DialogTitle>
              <DialogDescription>View calibration certificate information</DialogDescription>
            </DialogHeader>
            {viewOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Order Number</Label>
                    <p className="text-sm">{viewOrder.id}</p>
                  </div>
                  <div>
                    <Label>Company Name</Label>
                    <p className="text-sm">{viewOrder.companyName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bill Number</Label>
                    <p className="text-sm">{viewOrder.invoiceNumber || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Transport Mode</Label>
                    <p className="text-sm">{viewOrder.transportMode}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Processed Date</Label>
                    <p className="text-sm">{viewOrder.calibrationProcessedDate || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Destination</Label>
                    <p className="text-sm">{viewOrder.destination}</p>
                  </div>
                </div>
                {viewOrder.calibrationData && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Section</Label>
                        <p className="text-sm">{viewOrder.calibrationData.section}</p>
                      </div>
                      <div>
                        <Label>Calibration Period</Label>
                        <p className="text-sm">{viewOrder.calibrationData.calibrationPeriod} Months</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Calibration Date</Label>
                        <p className="text-sm">
                          {viewOrder.calibrationData.calibrationDate
                            ? new Date(viewOrder.calibrationData.calibrationDate).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label>Due Date</Label>
                        <p className="text-sm">
                          {viewOrder.calibrationData.dueDate
                            ? new Date(viewOrder.calibrationData.dueDate).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
