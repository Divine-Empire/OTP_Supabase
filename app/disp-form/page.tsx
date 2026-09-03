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
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/components/auth-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Plus, Trash2, RefreshCw, Search, Settings, ChevronDown } from "lucide-react"

import { mapOrderRowToUI, mapDispatchRowToUI } from "@/lib/otp-utils"

// Column definitions for Pending tab (ORDER-DISPATCH sheet, columns B to BZ)
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
  { key: "seniorApproveName", label: "Senior Approval Name", searchable: true },
  { key: "itemQty", label: "Item/Qty", searchable: true },
  { key: "dispatchTotalQty", label: "Dispatch Total Qty", searchable: true },
  { key: "dispatchPendingQty", label: "Dispatch Pending Qty", searchable: true },
]

// Column definitions for History tab (DISPATCH-DELIVERY sheet, columns B to BZ)
const historyColumns = [
  { key: "dispatchNo", label: "Dispatch No.", searchable: true },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "quotationNo", label: "Quotation No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "contactPersonName", label: "Contact Person Name", searchable: true },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "billingAddress", label: "Billing Address", searchable: true },
  { key: "shippingAddress", label: "Shipping Address", searchable: true },
  { key: "paymentMode", label: "Payment Mode", searchable: true },
  { key: "quotationCopyHistory", label: "Quotation Copy", searchable: true },
  { key: "paymentTerms", label: "Payment Terms(In Days)", searchable: true },
  { key: "transportMode", label: "Transport Mode", searchable: true },
  { key: "freightType", label: "Freight Type", searchable: true },
  { key: "destination", label: "Destination", searchable: true },
  { key: "poNumber", label: "Po Number", searchable: true },
  { key: "quotationCopy", label: "Quotation Copy", searchable: true },
  { key: "acceptanceCopy", label: "Acceptance Copy (Purchase Order Only)", searchable: true },
  { key: "offer", label: "Offer", searchable: true },
  { key: "conveyedForRegistration", label: "Conveyed For Registration Form", searchable: true },
  { key: "qty", label: "Qty", searchable: true },
  { key: "amount", label: "Amount", searchable: true },
  { key: "approvedName", label: "Approved Name", searchable: true },
  { key: "calibrationRequired", label: "Calibration Certificate Required", searchable: true },
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
]

const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

export default function DispFormPage() {
  const [selectedOrder, setSelectedOrder] = useState<string>("")
  const [calibrationRequired, setCalibrationRequired] = useState<string>("")
  const [calibrationType, setCalibrationType] = useState<string>("")
  const [installationRequired, setInstallationRequired] = useState<string>("")
  const [items, setItems] = useState<Array<{ name: string; qty: number; serialNo?: string; installation?: string }>>([])
  const [imsData, setImsData] = useState<Record<string, string[]>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewOrder, setViewOrder] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [processedOrders, setProcessedOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processedLoading, setProcessedLoading] = useState(false)
  const [ewayBillDetails, setEwayBillDetails] = useState<string>("")
  const [ewayBillAttachment, setEwayBillAttachment] = useState<File | null>(null)
  const [srnNumber, setSrnNumber] = useState<string>("")
  const [srnNumberAttachment, setSrnNumberAttachment] = useState<File | null>(null)
  const [paymentAttachment, setPaymentAttachment] = useState<File | null>(null)
  const [gstNumber, setGstNumber] = useState<string>("")
  const [vehicleNumber, setVehicleNumber] = useState<string>("")
  const [dispatchLocation, setDispatchLocation] = useState<string>("")
  const [openSNoIndex, setOpenSNoIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [directDispatch, setDirectDispatch] = useState<string>("")
  const [remarks, setRemarks] = useState<string>("")
  const [additionalItemsJson, setAdditionalItemsJson] = useState("")

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedColumn, setSelectedColumn] = useState("all")
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  )

  const { user: currentUser } = useAuth()

  const INSTALLATION_SCRIPT_URL = process.env.INSTALLATION_SCRIPT_URL
  const INSTALLATION_SHEET_NAME = "Service-Installation"
  const INSTALLATION_SHEET_ID = process.env.INSTALLATION_SHEET_ID
  const IMS_SCRIPT_URL = process.env.IMS_SCRIPT_URL

  const fetchPendingOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/otp-supabase/orders?stage=disp_form&status=pending")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map(mapOrderRowToUI)
        setOrders(mapped)
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching pending orders:", err)
      setError(err.message)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProcessedOrders = async () => {
    try {
      const response = await fetch("/api/otp-supabase/dispatches?status=history")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map(mapDispatchRowToUI)
        setProcessedOrders(mapped)
        return mapped
      }
      setProcessedOrders([])
      return []
    } catch (err) {
      console.error("Error fetching processed dispatches:", err)
      setProcessedOrders([])
      return []
    }
  }

  const handleProcessedTabClick = async () => {
    await fetchProcessedOrders()
  }

  useEffect(() => {
    fetchPendingOrders()
    fetchProcessedOrders()
  }, [])

  const formatGoogleSheetsDate = (dateValue: any) => {
    if (!dateValue) return ""
    if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
      try {
        const dateParts = dateValue.match(/Date$$(\d+),(\d+),(\d+)$$/)
        if (dateParts && dateParts.length === 4) {
          const year = Number.parseInt(dateParts[1])
          const month = Number.parseInt(dateParts[2])
          const day = Number.parseInt(dateParts[3])
          const date = new Date(year, month, day)
          const formattedDay = String(date.getDate()).padStart(2, "0")
          const formattedMonth = String(date.getMonth() + 1).padStart(2, "0")
          const formattedYear = date.getFullYear()
          return `${formattedDay}/${formattedMonth}/${formattedYear}`
        }
      } catch (e) {
        console.error("Error parsing date string:", e)
      }
    }
    return String(dateValue)
  }


  // Add this function after the useAuth hook
  const filterOrdersByUserRole = (orders: any[], currentUser: any) => {
    if (!currentUser) return orders;

    // Super admin and admin see all data
    if (currentUser.role === "super_admin" || currentUser.role === "admin") {
      return orders;
    }

    // If user has 'all' or this step assigned
    if (currentUser.assignedSteps?.includes("all") || currentUser.assignedSteps?.includes("disp-form")) {
      return orders;
    }

    // Regular users only see data where CRE Name matches their username or full name
    return orders.filter(order => 
      !order.creName || 
      order.creName.toLowerCase() === (currentUser.username || "").toLowerCase() ||
      (currentUser.fullName && order.creName.toLowerCase() === currentUser.fullName.toLowerCase())
    );
  };
  // Filter orders based on search term and selected column
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

  // Filter processed orders based on search term
  const filteredProcessedOrders = useMemo(() => {
    let filtered = processedOrders;

    // Apply user role-based filtering
    filtered = filterOrdersByUserRole(filtered, currentUser);

    if (searchTerm) {
      filtered = filtered.filter((order) => {
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
    }

    return filtered
  }, [processedOrders, searchTerm, selectedColumn, currentUser])

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

  const fetchImsData = async () => {
    try {
      const response = await fetch(`${IMS_SCRIPT_URL}?sheet=IMS`)
      const result = await response.json()
      if (result.success && result.data) {
        const mapping: Record<string, string[]> = {}
        // result.data is from sheet.getDataRange().getValues()
        const rows = result.data.slice(1); // Skip header row
        rows.forEach((row: any[]) => {
          const itemName = row[3]; // Column D (index 3)
          const serials = row[76]; // Column BY (index 76)
          const dates = row[77];   // Column BZ (index 77)
          const locations = row[78]; // Column CA (index 78)

          if (itemName) {
            const sList = String(serials || "").split(",").map(s => s.trim());
            const dList = String(dates || "").split(",").map(d => d.trim());
            const lList = String(locations || "").split(",").map(l => l.trim());

            const maxLength = Math.max(sList.length, dList.length, lList.length);
            const combined: string[] = [];

            for (let i = 0; i < maxLength; i++) {
              const s = sList[i] || "";
              const d = dList[i] || "";
              const l = lList[i] || "";
              if (s || d || l) {
                combined.push(`${s}-${d}-${l}`);
              }
            }
            mapping[itemName] = combined;
          }
        });
        setImsData(mapping);
      }
    } catch (error) {
      console.error("Error fetching IMS data:", error);
    }
  }

  const handleProcess = (orderId: string) => {
    const order = orders.find((o: any) => o.id === orderId || o.orderNo === orderId)
    if (!order) return

    setSelectedOrder(orderId)
    setCalibrationRequired("")
    setCalibrationType("")
    setInstallationRequired("")

    // Extract items from order
    const extractedItems: Array<{ name: string; qty: number; serialNo?: string; installation?: string }> = []
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      order.items.forEach((item: any) => {
        if (item.name || item.item_name) {
          extractedItems.push({
            name: item.name || item.item_name,
            qty: Number(item.quantity || item.qty) || 0,
            serialNo: item.serialNo || item.serial_no || "",
            installation: "No"
          })
        }
      })
    } else {
      for (let i = 1; i <= 10; i++) {
        const name = order[`itemName${i}`]
        const qty = Number(order[`quantity${i}`]) || 0
        if (name) {
          extractedItems.push({
            name,
            qty,
            serialNo: "",
            installation: "No"
          })
        }
      }
    }

    setItems(extractedItems)
    setAdditionalItemsJson("")
    setEwayBillDetails("")
    setEwayBillAttachment(null)
    setSrnNumber("")
    setSrnNumberAttachment(null)
    setPaymentAttachment(null)
    setGstNumber("")
    setVehicleNumber("")
    setDispatchLocation("")
    setDirectDispatch("")
    setIsDialogOpen(true)
    setRemarks("")
  }

  const addItem = () => {
    setItems([...items, { name: "", qty: 0, installation: "No" }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: "name" | "qty" | "serialNo" | "installation", value: string | number) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value } as any
    setItems(updated)
  }

  const handleSubmit = async () => {
    if (!selectedOrder || !calibrationRequired || !installationRequired || !dispatchLocation) return;

    const order = orders.find((o: any) => o.id === selectedOrder || o.orderNo === selectedOrder);
    if (!order) return;

    const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

    const serials: string[] = [];
    const dates: string[] = [];
    const locations: string[] = [];
    const installationStatuses: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.installation === "Yes" && !item.serialNo) {
        alert(`S-Code is mandatory for item "${item.name || `at row ${i + 1}`}" because Installation is set to Yes.`);
        return;
      }

      installationStatuses.push(item.installation || "No");

      const snVal = item.serialNo || "";
      if (snVal && snVal.includes("-")) {
        const parts = snVal.split("-");
        serials.push(parts[0] || "");
        dates.push(parts[1] || "");
        locations.push(parts[2] || "");
      } else {
        serials.push(snVal);
        dates.push("");
        locations.push("");
      }
    }

    const dispatchData = {
      calibrationRequired,
      calibrationType: calibrationRequired === "YES" || calibrationRequired === "Yes" ? calibrationType : "",
      installationRequired,
      items,
      ewayBillDetails,
      gstNumber,
      vehicleNumber,
      dispatchLocation,
      directDispatch,
      srnNumber,
      remarks,
      totalQty,
      processedAt: new Date().toISOString(),
      serialNos: serials.join(", "),
      serialDates: dates.join(", "),
      serialLocations: locations.join(", "),
      installationStatuses: installationStatuses.join(", ")
    };

    const result = await updateOrderStatus(order, dispatchData);

    if (result.success) {
      setIsDialogOpen(false);
      setSelectedOrder("");
      let message = `Order ${selectedOrder} dispatch form has been processed successfully`;
      if (result.fileUrls) {
        message += "\n\nFiles uploaded to Storage:";
        if (result.fileUrls.ewayBillUrl) message += "\n- Eway Bill attachment";
        if (result.fileUrls.srnUrl) message += "\n- SRN Number attachment";
        if (result.fileUrls.paymentUrl) message += "\n- Payment attachment";
      }

      // Secondary submission for items requiring installation into Supabase
      const installationItems = items.filter(item => item.installation === "Yes");
      if (installationItems.length > 0) {
        try {
          const dispatchTimestamp = result.data?.timestamp || new Date().toISOString();

          const siPayload = {
            orderNo: order.orderNo || order.id,
            companyName: order.companyName || "",
            contactPersonName: order.contactPersonName || "",
            contactPersonNo: order.contactNumber || "",
            dispatchTimestamp,
            items: installationItems.map(item => ({
              itemName: item.name || "",
              qty: Number(item.qty) || 0,
              serial: item.serialNo || "",
            })),
          };

          const siRes = await fetch("/api/otp-supabase/service-installation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(siPayload),
          });
          const siResult = await siRes.json();
          if (siResult.success) {
            message += `\n\n✅ ${installationItems.length} item(s) logged in Service Installation (Supabase).`;
          } else {
            message += `\n\n⚠️ Failed to log items in Service Installation: ${siResult.error}`;
          }
        } catch (err) {
          console.error("Error submitting to service-installation:", err);
          message += "\n\n⚠️ Failed to log items in Service Installation system.";
        }
      }

      alert(message);
    } else {
      alert(`Error processing order: ${result.error}`);
    }
  };

  const updateOrderStatus = async (order: any, dispatchData: any) => {
    try {
      setUploading(true);

      let ewayBillUrl = "";
      let srnUrl = "";
      let paymentUrl = "";

      if (ewayBillAttachment) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", ewayBillAttachment);
          uploadFormData.append("folder", "dispatch-eway");
          const uploadRes = await fetch("/api/otp-supabase/attachments", {
            method: "POST",
            body: uploadFormData,
          });
          const uploadJson = await uploadRes.json();
          if (uploadJson.success) ewayBillUrl = uploadJson.url;
        } catch (uploadErr) {
          console.error("Error uploading eway bill attachment:", uploadErr);
        }
      }

      if (srnNumberAttachment) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", srnNumberAttachment);
          uploadFormData.append("folder", "dispatch-srn");
          const uploadRes = await fetch("/api/otp-supabase/attachments", {
            method: "POST",
            body: uploadFormData,
          });
          const uploadJson = await uploadRes.json();
          if (uploadJson.success) srnUrl = uploadJson.url;
        } catch (uploadErr) {
          console.error("Error uploading SRN attachment:", uploadErr);
        }
      }

      if (paymentAttachment) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", paymentAttachment);
          uploadFormData.append("folder", "dispatch-payment");
          const uploadRes = await fetch("/api/otp-supabase/attachments", {
            method: "POST",
            body: uploadFormData,
          });
          const uploadJson = await uploadRes.json();
          if (uploadJson.success) paymentUrl = uploadJson.url;
        } catch (uploadErr) {
          console.error("Error uploading payment attachment:", uploadErr);
        }
      }

      const postBody = {
        order_id: order.id || order.orderId,
        orderId: order.id || order.orderId,
        order_no: order.orderNo || order.id,
        orderNo: order.orderNo || order.id,
        calibration_required: dispatchData.calibrationRequired === "Yes" || dispatchData.calibrationRequired === "YES",
        certificate_category: dispatchData.calibrationType || "",
        installation_required: dispatchData.installationRequired === "Yes" || dispatchData.installationRequired === "YES",
        eway_bill_details: dispatchData.ewayBillDetails || "",
        eway_bill_attachment: ewayBillUrl,
        srn_number: dispatchData.srnNumber || "",
        srn_number_attachment: srnUrl,
        attachment: paymentUrl,
        gst_number: dispatchData.gstNumber || "",
        vehicle_number: dispatchData.vehicleNumber || "",
        dispatch_location: dispatchData.dispatchLocation || "",
        direct_dispatch: dispatchData.directDispatch || "",
        remarks: dispatchData.remarks || "",
        created_by: currentUser?.fullName || currentUser?.username || "Admin",
        items: (dispatchData.items || []).map((item: any) => ({
          item_name: item.name,
          quantity: Number(item.qty) || 0,
          serial_no: item.serialNo || "",
          installation: item.installation || "No",
        })),
      };

      const response = await fetch("/api/otp-supabase/dispatches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postBody),
      });

      const result = await response.json();

      if (result.success) {
        await fetchPendingOrders();
        await fetchProcessedOrders();
        return {
          success: true,
          data: result.data,
          fileUrls: {
            ewayBillUrl,
            srnUrl,
            paymentUrl,
          },
        };
      } else {
        throw new Error(result.error || "Failed to create dispatch");
      }
    } catch (err: any) {
      console.error("Error updating order:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  };

  const handleView = (order: any) => {
    setViewOrder(order)
    setViewDialogOpen(true)
  }

  const handleRefresh = async () => {
    setLoading(true)
    setProcessedLoading(true)
    await fetchPendingOrders()
    await fetchProcessedOrders()
    setLoading(false)
    setProcessedLoading(false)
  }

  // Update the renderCellContent function to handle these fields as hyperlinks
  const renderCellContent = (order: any, columnKey: string) => {
    const value = order[columnKey]

    switch (columnKey) {
      case "actions":
        return (
          <Button
            size="sm"
            onClick={() => handleProcess(order.id)}
            disabled={currentUser?.role === "user"}
          >
            {currentUser?.role === "user" ? "View Only" : "Process"}
          </Button>
        )
      case "quotationCopy":
      case "quotationCopyHistory":
      // return <Badge variant={value === "Available" ? "default" : "secondary"}>{value || "N/A"}</Badge>
      case "acceptanceCopy":
      case "ewayBillAttachment":
      case "srnNumberAttachment":
      case "attachment":
        return value && (value.startsWith("http") || value.startsWith("https")) ? (
          <a href={value} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">View Attachment</Badge>
          </a>
        ) : (
          <Badge variant="secondary">{value || "N/A"}</Badge>
        )
      case "calibrationRequired":
      case "installationRequired":
        return <Badge variant={value === "YES" ? "default" : "destructive"}>{value || "N/A"}</Badge>
      case "billingAddress":
      case "shippingAddress":
      case "remarks":
        return <div className="max-w-[200px] whitespace-normal break-words">{value}</div>
      case "amount":
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
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Pre Invoice Form
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
                    <CardTitle>Pending Pre Invoice Forms</CardTitle>
                    <CardDescription>Orders waiting for dispatch form processing</CardDescription>
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
                            {filteredOrders.map((order) => (
                              <TableRow key={order.id} className="hover:bg-gray-50">
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
                            {filteredOrders.length === 0 && (
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
                    <CardTitle>DISP Form History</CardTitle>
                    <CardDescription>Previously processed dispatch forms</CardDescription>
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
                                <TableRow key={order.id || order.dispatchId || order.dispatchNo || idx} className="hover:bg-gray-50">
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Process DISP Form</DialogTitle>
              <DialogDescription>Process dispatch form for the order</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNo">Order No.</Label>
                <Input id="orderNo" value={selectedOrder} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calibration">CALIBRATION CERTIFICATE REQUIRED</Label>
                <Select value={calibrationRequired} onValueChange={setCalibrationRequired} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {calibrationRequired === "YES" && (
                <div className="space-y-2">
                  <Label htmlFor="calibrationType">Calibration Type</Label>
                  <Select value={calibrationType} onValueChange={setCalibrationType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select calibration type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LAB">LAB</SelectItem>
                      <SelectItem value="Surevey Instruments">Survey Instruments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="installation">INSTALLATION REQUIRED</Label>
                <Select value={installationRequired} onValueChange={setInstallationRequired}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Eway Bill Details */}
              <div className="space-y-2">
                <Label htmlFor="ewayBill">Transport Id/Name</Label>
                <Input
                  id="ewayBill"
                  value={ewayBillDetails}
                  onChange={(e) => setEwayBillDetails(e.target.value)}
                  placeholder="Enter Eway Bill details"
                />
              </div>

              {/* Remove Eway Bill Attachment and add new fields */}
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="Enter GST Number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="Enter Vehicle Number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dispatchLocation">Dispatch Location <span className="text-red-500">*</span></Label>
                <Select value={dispatchLocation} onValueChange={setDispatchLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dispatch location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="By C.G.Warehouse">By C.G.Warehouse</SelectItem>
                    <SelectItem value="By Head office">By Head office</SelectItem>
                    <SelectItem value="By N.E Warehouse">By N.E Warehouse</SelectItem>
                    <SelectItem value="Direct Dispatch">Direct Dispatch</SelectItem>
                    <SelectItem value="Maniquip store">Maniquip store</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Direct Dispatch Input */}
              <div className="space-y-2">
                <Label htmlFor="directDispatch">Direct Dispatch Details</Label>
                <Input
                  id="directDispatch"
                  value={directDispatch}
                  onChange={(e) => setDirectDispatch(e.target.value)}
                  placeholder="Enter direct dispatch details"
                />
              </div>

              {/* SRN Number */}
              <div className="space-y-2">
                <Label htmlFor="srnNumber">SRN Number</Label>
                <Input
                  id="srnNumber"
                  value={srnNumber}
                  onChange={(e) => setSrnNumber(e.target.value)}
                  placeholder="Enter SRN Number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="srnNumberAttachment">SRN Number Attachment</Label>
                <Input
                  id="srnNumberAttachment"
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={(e) => setSrnNumberAttachment(e.target.files?.[0] || null)}
                />
                {srnNumberAttachment && (
                  <p className="text-sm text-muted-foreground">Selected: {srnNumberAttachment.name}</p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Items (Total: {items.length})</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[35%] font-semibold">Item Name</TableHead>
                        <TableHead className="w-[25%] font-semibold">S-Code</TableHead>
                        <TableHead className="w-[10%] font-semibold text-center">Qty</TableHead>
                        <TableHead className="w-[20%] font-semibold text-center">Installation</TableHead>
                        <TableHead className="w-[10%] font-semibold text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/30">
                          <TableCell className="p-2">
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(index, "name", e.target.value)}
                              placeholder="Enter item name"
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <div className="relative">
                              <Popover
                                open={openSNoIndex === index}
                                onOpenChange={(open) => {
                                  if (!open) setOpenSNoIndex(null);
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <div className="relative">
                                    <Input
                                      value={item.serialNo || ""}
                                      onChange={(e) => updateItem(index, "serialNo", e.target.value)}
                                      onFocus={() => setOpenSNoIndex(index)}
                                      onClick={() => setOpenSNoIndex(index)}
                                      placeholder="SN-Dt-Loc"
                                      className={`h-9 text-xs pr-8 ${item.installation === "Yes" && !item.serialNo ? "border-red-500 ring-red-500" : ""}`}
                                    />
                                    {imsData[item.name] && imsData[item.name].length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-9 w-8 p-0 hover:bg-transparent"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenSNoIndex(openSNoIndex === index ? null : index);
                                        }}
                                      >
                                        <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${openSNoIndex === index ? "rotate-180" : ""}`} />
                                      </Button>
                                    )}
                                  </div>
                                </PopoverTrigger>
                                {imsData[item.name] && imsData[item.name].length > 0 && (
                                  <PopoverContent
                                    className="w-[300px] p-0"
                                    align="start"
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                  >
                                    <Command>
                                      <CommandList>
                                        <CommandEmpty>No matching S-Code found</CommandEmpty>
                                        <CommandGroup>
                                          {imsData[item.name]
                                            .filter(sn =>
                                              !item.serialNo ||
                                              sn.toLowerCase().includes(item.serialNo.toLowerCase())
                                            )
                                            .map((sn, i) => (
                                              <CommandItem
                                                key={i}
                                                value={sn}
                                                onSelect={(val) => {
                                                  updateItem(index, "serialNo", val)
                                                  setOpenSNoIndex(null)
                                                }}
                                                className="text-xs"
                                              >
                                                {sn}
                                              </CommandItem>
                                            ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                )}
                              </Popover>
                            </div>
                          </TableCell>
                          <TableCell className="p-2 text-center">
                            <Input
                              type="number"
                              value={item.qty}
                              onChange={(e) => updateItem(index, "qty", Number.parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="h-9 text-center w-full min-w-[60px]"
                            />
                          </TableCell>
                          <TableCell className="p-2 text-center">
                            <Select
                              value={item.installation || "No"}
                              onValueChange={(val) => updateItem(index, "installation", val)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="No" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-2 text-center">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeItem(index)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {items.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground border border-dashed rounded-md">
                    No items added. Click "Add Item" to begin.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDetails">Payment Details (Attachment) - In case of Advance</Label>
                <Input
                  id="paymentDetails"
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={(e) => setPaymentAttachment(e.target.files?.[0] || null)}
                />
                {paymentAttachment && (
                  <p className="text-sm text-muted-foreground">Selected: {paymentAttachment.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter any additional remarks"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!calibrationRequired || !installationRequired || !dispatchLocation || uploading || currentUser?.role === "user"}
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    currentUser?.role === "user" ? "View Only" : "Submit"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>DISP Form Details</DialogTitle>
              <DialogDescription>View dispatch form details</DialogDescription>
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
                {viewOrder.dispatchData && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Calibration Required</Label>
                        <p className="text-sm">{viewOrder.dispatchData.calibrationRequired}</p>
                      </div>
                      <div>
                        <Label>Calibration Type</Label>
                        <p className="text-sm">{viewOrder.dispatchData.calibrationType || "N/A"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Installation Required</Label>
                        <p className="text-sm">{viewOrder.dispatchData.installationRequired}</p>
                      </div>
                    </div>
                    {viewOrder.dispatchData.items?.length > 0 && (
                      <div>
                        <Label>Items</Label>
                        <div className="mt-2 space-y-2">
                          {viewOrder.dispatchData.items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm border-b pb-1">
                              <span>{item.name}</span>
                              <span>Qty: {item.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {viewOrder.dispatchData.remarks && (
                      <div>
                        <Label>Remarks</Label>
                        <p className="text-sm">{viewOrder.dispatchData.remarks}</p>
                      </div>
                    )}
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

