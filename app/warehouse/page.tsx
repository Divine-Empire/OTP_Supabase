"use client";

import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useData } from "@/components/data-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, Search, Settings } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const parseDynamicItems = (itemStr: string, quantityStr: string, startIndex: number = 15) => {
  const defaultReturn = {
    [`itemName${startIndex}`]: itemStr || "",
    [`quantity${startIndex}`]: quantityStr || ""
  };
  
  try {
    if (!itemStr) return defaultReturn;
    
    // Check if it looks like JSON array
    if (typeof itemStr === 'string' && itemStr.trim().startsWith('[')) {
      const items = JSON.parse(itemStr);
      if (Array.isArray(items)) {
        if (items.length === 0) return defaultReturn;
        
        const result: Record<string, string> = {};
        items.forEach((item, index) => {
          const idx = startIndex + index;
          result[`itemName${idx}`] = item.name || "";
          result[`quantity${idx}`] = item.quantity || item.qty || "";
        });
        return result;
      }
    }
    
    return defaultReturn;
  } catch (e) {
    console.error("Error parsing items JSON:", e);
    return defaultReturn;
  }
};

import { mapDispatchRowToUI } from "@/lib/otp-utils";

export default function WarehousePage() {
  const { orders, updateOrder } = useData();
  // const [selectedOrder, setSelectedOrder] = useState<string>("")
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const { user: currentUser } = useAuth();



  // Column definitions for Pending tab (B to BJ)
  const pendingColumns = [
    { key: "actions", label: "Actions", searchable: false },
    { key: "orderNo", label: "Order No.", searchable: true },
    { key: "quotationNo", label: "Quotation No.", searchable: true },
    { key: "companyName", label: "Company Name", searchable: true },
    {
      key: "contactPersonName",
      label: "Contact Person Name",
      searchable: true,
    },
    { key: "contactNumber", label: "Contact Number", searchable: true },
    { key: "billingAddress", label: "Billing Address", searchable: true },
    { key: "shippingAddress", label: "Shipping Address", searchable: true },
    { key: "paymentMode", label: "Payment Mode", searchable: true },
    { key: "quotationCopy", label: "Quotation Copy", searchable: true },
    { key: "paymentTerms", label: "Payment Terms(In Days)", searchable: true },
    { key: "transportMode", label: "Transport Mode", searchable: true },
    { key: "transportid", label: "Transport ID", searchable: true },
    { key: "freightType", label: "Freight Type", searchable: true },
    { key: "destination", label: "Destination", searchable: true },
    { key: "poNumber", label: "Po Number", searchable: true },
    { key: "quotationCopy2", label: "Quotation Copy", searchable: true },
    {
      key: "acceptanceCopy",
      label: "Acceptance Copy (Purchase Order Only)",
      searchable: true,
    },
    { key: "offer", label: "Offer", searchable: true },
    {
      key: "conveyedForRegistration",
      label: "Conveyed For Registration Form",
      searchable: true,
    },
    { key: "qty", label: "Qty", searchable: true },
    { key: "amount", label: "Amount", searchable: true },
    { key: "approvedName", label: "Approved Name", searchable: true },
    {
      key: "calibrationCertRequired",
      label: "Calibration Certificate Required",
      searchable: true,
    },
    {
      key: "certificateCategory",
      label: "Certificate Category",
      searchable: true,
    },
    {
      key: "installationRequired",
      label: "Installation Required",
      searchable: true,
    },
    { key: "ewayBillDetails", label: "Eway Bill Details", searchable: true },
    {
      key: "ewayBillAttachment",
      label: "Eway Bill Attachment",
      searchable: true,
    },
    { key: "srnNumber", label: "Srn Number", searchable: true },
    {
      key: "srnNumberAttachment",
      label: "Srn Number Attachment",
      searchable: true,
    },
    { key: "attachment", label: "Attachment", searchable: true },
    { key: "vehicleNo", label: "Vehicle No.", searchable: true },

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
    { key: "invoiceNumber", label: "Invoice Number", searchable: true },
    { key: "invoiceUpload", label: "Invoice Upload", searchable: true },
    { key: "ewayBillUpload", label: "Eway Bill Upload", searchable: true },
    { key: "totalQtyHistory", label: "Total Qty", searchable: true },
    { key: "totalBillAmount", label: "Total Bill Amount", searchable: true },
    { key: "dSrNumber", label: "D-Sr Number", searchable: true },
  ];

  // Column definitions for History tab (includes BN to BR and BV to CC)
  const historyColumns = [
    ...pendingColumns.filter((col) => col.key !== "actions"),
    // BV to CC columns
    { key: "transporterName", label: "Transporter Name", searchable: true },
    {
      key: "transporterContact",
      label: "Transporter Contact",
      searchable: true,
    },
    { key: "biltyNumber", label: "Bilty Number", searchable: true },
    { key: "totalCharges", label: "Total Charges", searchable: true },
    { key: "warehouseRemarks", label: "Warehouse Remarks", searchable: true },
    { key: "beforePhoto", label: "Before Photo", searchable: false },
    { key: "afterPhoto", label: "After Photo", searchable: false },
    { key: "biltyUpload", label: "Bilty Upload", searchable: false },
  ];

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("all");
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [biltyUpload, setBiltyUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // New form fields
  const [transporterName, setTransporterName] = useState<string>("");
  const [transporterContact, setTransporterContact] = useState<string>("");
  const [biltyNumber, setBiltyNumber] = useState<string>("");
  const [totalCharges, setTotalCharges] = useState<string>("");
  const [warehouseRemarks, setWarehouseRemarks] = useState<string>("");

  const fetchPendingOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/otp-supabase/dispatches?stage=warehouse&status=pending");
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map(mapDispatchRowToUI);
        setPendingOrders(mapped);
      } else {
        setPendingOrders([]);
      }
    } catch (err: any) {
      console.error("Error fetching pending warehouse dispatches:", err);
      setError(err.message);
      setPendingOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/otp-supabase/dispatches?stage=warehouse&status=history");
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map(mapDispatchRowToUI);
        setHistoryOrders(mapped);
      } else {
        setHistoryOrders([]);
      }
    } catch (err: any) {
      console.error("Error fetching history warehouse dispatches:", err);
      setError(err.message);
      setHistoryOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
    fetchHistoryOrders();
  }, []);

  // Add this function after the useAuth hook
  const filterOrdersByUserRole = (orders: any[], currentUser: any) => {
    if (!currentUser) return orders;

    // Super admin and admin see all data
    if (currentUser.role === "super_admin" || currentUser.role === "admin") {
      return orders;
    }

    // If user has 'all' or this step assigned
    if (currentUser.assignedSteps?.includes("all") || currentUser.assignedSteps?.includes("warehouse") || currentUser.assignedSteps?.includes("warehouse-material")) {
      return orders;
    }

    // Regular users only see data where CRE Name matches their username or full name
    return orders.filter((order) => 
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
          return searchableFields.some((field) =>
            field.includes(searchTerm.toLowerCase())
          );
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
          return searchableFields.some((field) =>
            field.includes(searchTerm.toLowerCase())
          );
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
    }));
  };

  const toggleHistoryColumn = (columnKey: string) => {
    setVisibleHistoryColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const showAllPendingColumns = () => {
    setVisiblePendingColumns(
      pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
    );
  };

  const hideAllPendingColumns = () => {
    setVisiblePendingColumns(
      pendingColumns.reduce(
        (acc, col) => ({ ...acc, [col.key]: col.key === "actions" }),
        {}
      )
    );
  };

  const showAllHistoryColumns = () => {
    setVisibleHistoryColumns(
      historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
    );
  };

  const hideAllHistoryColumns = () => {
    setVisibleHistoryColumns(
      historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: false }), {})
    );
  };

  // Legacy orders from useData hook
  const legacyPendingOrders = orders.filter(
    (order) => order.status === "pi-created"
  );
  const legacyProcessedOrders = orders.filter((order) => order.warehouseData);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const updateOrderStatus = async (order: any) => {
    try {
      setUploading(true);

      let beforePhotoUrl: string = "";
      let afterPhotoUrl: string = "";
      let biltyUrl: string = "";

      if (beforePhoto) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", beforePhoto);
          uploadFormData.append("folder", "warehouse-before");
          const uploadRes = await fetch("/api/otp-supabase/attachments", {
            method: "POST",
            body: uploadFormData,
          });
          const uploadJson = await uploadRes.json();
          if (uploadJson.success) beforePhotoUrl = uploadJson.url;
        } catch (error) {
          console.error("Error uploading before photo:", error);
        }
      }

      if (afterPhoto) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", afterPhoto);
          uploadFormData.append("folder", "warehouse-after");
          const uploadRes = await fetch("/api/otp-supabase/attachments", {
            method: "POST",
            body: uploadFormData,
          });
          const uploadJson = await uploadRes.json();
          if (uploadJson.success) afterPhotoUrl = uploadJson.url;
        } catch (error) {
          console.error("Error uploading after photo:", error);
        }
      }

      if (biltyUpload) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", biltyUpload);
          uploadFormData.append("folder", "warehouse-bilty");
          const uploadRes = await fetch("/api/otp-supabase/attachments", {
            method: "POST",
            body: uploadFormData,
          });
          const uploadJson = await uploadRes.json();
          if (uploadJson.success) biltyUrl = uploadJson.url;
        } catch (error) {
          console.error("Error uploading bilty file:", error);
        }
      }

      const dispatchNo = order.dispatchNo || order.dSrNumber || order.id;

      const updateResponse = await fetch("/api/otp-supabase/dispatches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchNo,
          stage: "warehouse",
          stageData: {
            before_photo_upload: beforePhotoUrl,
            after_photo_upload: afterPhotoUrl,
            bilty_upload: biltyUrl,
            transporter_name: transporterName,
            transporter_contact: transporterContact,
            bilty_number: biltyNumber,
            total_charges: Number(totalCharges) || 0,
            warehouse_remarks: warehouseRemarks || "",
            created_by: currentUser?.fullName || currentUser?.username || "Admin",
            actual_date: new Date().toISOString(),
          },
        }),
      });

      const result = await updateResponse.json();

      if (result.success) {
        await fetchPendingOrders();
        await fetchHistoryOrders();
        return {
          success: true,
          fileUrls: {
            beforePhotoUrl,
            afterPhotoUrl,
            biltyUrl,
          },
        };
      } else {
        throw new Error(result.error || "Update failed");
      }
    } catch (err: any) {
      console.error("Error updating dispatch:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = (orderId: string) => {
    const order = pendingOrders.find((o) => o.id === orderId);

    // Add this debug check:
    if (!order || !order.dSrNumber) {
      alert(
        `Error: D-Sr Number not found for order ${orderId}. Please ensure column DB has a value.`
      );
      return;
    }

    // setSelectedOrder(orderId)
    setSelectedOrder(order);
    setBeforePhoto(null);
    setAfterPhoto(null);
    setBiltyUpload(null);
    // Reset new form fields
    setTransporterName("");
    setTransporterContact("");
    setBiltyNumber("");
    setTotalCharges("");
    setWarehouseRemarks("");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedOrder) return;

    const order = pendingOrders.find((o) => o.id === selectedOrder.id);
    if (!order) {
      // Fallback to legacy orders
      const warehouseData = {
        processedAt: new Date().toISOString(),
        processedBy: "Current User",
      };

      updateOrder(selectedOrder, {
        status: "warehouse-processed",
        warehouseData,
      });

      setIsDialogOpen(false);
      setSelectedOrder(null);
      return;
    }

    const result = await updateOrderStatus(order);

    if (result.success) {
      console.log("Successfully processed D-Sr Number:", order.dSrNumber);
      setIsDialogOpen(false);
      setSelectedOrder("");
      let message = `Warehouse processing for order ${selectedOrder} has been completed successfully`;
      if (result.fileUrls) {
        message += "\n\nFiles uploaded to Google Drive:";
        if (result.fileUrls.beforePhotoUrl) message += "\n- Before photo";
        if (result.fileUrls.afterPhotoUrl) message += "\n- After photo";
        if (result.fileUrls.biltyUrl) message += "\n- Bilty document";
      }
      alert(message);
    } else {
      alert(`Error processing warehouse operation: ${result.error}`);
    }
  };

  const handleView = (order: any) => {
    setViewOrder(order);
    setViewDialogOpen(true);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading orders from Google Sheets...</span>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">
              Error Loading Data
            </h1>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button
              onClick={() => {
                fetchPendingOrders();
                fetchHistoryOrders();
              }}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPendingOrders(), fetchHistoryOrders()]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCellContent = (order: any, columnKey: string) => {
    const value = order[columnKey];
    // Handle Google Sheets API response format where value might be {v: actualValue}
    const actualValue =
      value && typeof value === "object" && "v" in value ? value.v : value;

    switch (columnKey) {
      case "actions":
        return (
          <Button size="sm" onClick={() => handleProcess(order.id)}>
            Process
          </Button>
        );
      case "quotationCopy":
      case "quotationCopy2":
      // return <Badge variant={actualValue === "" ? "default" : ""}>{actualValue || ""}</Badge>
      case "acceptanceCopy":
      case "ewayBillAttachment":
      case "srnNumberAttachment":
      case "attachment":
      case "invoiceUpload":
      case "ewayBillUpload":
      case "beforePhoto":
      case "afterPhoto":
      case "biltyUpload":
        return actualValue &&
          (actualValue.startsWith("http") ||
            actualValue.startsWith("https")) ? (
          <a href={actualValue} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">View Attachment</Badge>
          </a>
        ) : (
          <Badge variant="secondary">{actualValue || "N/A"}</Badge>
        );
      case "calibrationCertRequired":
      case "installationRequired":
        return (
          <Badge variant={actualValue === "Yes" ? "default" : "secondary"}>
            {actualValue || "N/A"}
          </Badge>
        );
      case "billingAddress":
      case "shippingAddress":
      case "remarks":
        return (
          <div className="max-w-[200px] whitespace-normal break-words">
            {actualValue || ""}
          </div>
        );
      case "paymentMode":
        return (
          <div className="flex items-center gap-2">
            {actualValue}
            {actualValue === "Advance" && (
              <Badge variant="secondary">Required</Badge>
            )}
          </div>
        );
      case "amount":
      case "totalBillAmount":
        return actualValue ? `₹${Number(actualValue).toLocaleString()}` : "";
      default:
        return actualValue || "";
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Warehouse
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
            <TabsTrigger value="pending">
              Pending ({filteredPendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              History ({filteredHistoryOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Pending Warehouse Operations</CardTitle>
                    <CardDescription>
                      Orders waiting for warehouse processing
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={showAllPendingColumns}
                        >
                          Show All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={hideAllPendingColumns}
                        >
                          Hide All
                        </Button>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="p-2 space-y-2">
                        {pendingColumns.map((column) => (
                          <div
                            key={column.key}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`pending-${column.key}`}
                              checked={visiblePendingColumns[column.key]}
                              onCheckedChange={() =>
                                togglePendingColumn(column.key)
                              }
                            />
                            <Label
                              htmlFor={`pending-${column.key}`}
                              className="text-sm"
                            >
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
                    <div style={{ minWidth: "max-content" }}>
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
                                    width:
                                      column.key === "actions"
                                        ? "120px"
                                        : column.key === "orderNo"
                                        ? "120px"
                                        : column.key === "quotationNo"
                                        ? "150px"
                                        : column.key === "companyName"
                                        ? "250px"
                                        : column.key === "contactPersonName"
                                        ? "180px"
                                        : column.key === "contactNumber"
                                        ? "140px"
                                        : column.key === "billingAddress"
                                        ? "200px"
                                        : column.key === "shippingAddress"
                                        ? "200px"
                                        : column.key === "isOrderAcceptable"
                                        ? "150px"
                                        : column.key ===
                                          "orderAcceptanceChecklist"
                                        ? "250px"
                                        : column.key === "remarks"
                                        ? "200px"
                                        : "160px",
                                    minWidth:
                                      column.key === "actions"
                                        ? "120px"
                                        : column.key === "orderNo"
                                        ? "120px"
                                        : column.key === "quotationNo"
                                        ? "150px"
                                        : column.key === "companyName"
                                        ? "250px"
                                        : column.key === "contactPersonName"
                                        ? "180px"
                                        : column.key === "contactNumber"
                                        ? "140px"
                                        : column.key === "billingAddress"
                                        ? "200px"
                                        : column.key === "shippingAddress"
                                        ? "200px"
                                        : column.key === "isOrderAcceptable"
                                        ? "150px"
                                        : column.key ===
                                          "orderAcceptanceChecklist"
                                        ? "250px"
                                        : column.key === "remarks"
                                        ? "200px"
                                        : "160px",
                                    maxWidth:
                                      column.key === "actions"
                                        ? "120px"
                                        : column.key === "orderNo"
                                        ? "120px"
                                        : column.key === "quotationNo"
                                        ? "150px"
                                        : column.key === "companyName"
                                        ? "250px"
                                        : column.key === "contactPersonName"
                                        ? "180px"
                                        : column.key === "contactNumber"
                                        ? "140px"
                                        : column.key === "billingAddress"
                                        ? "200px"
                                        : column.key === "shippingAddress"
                                        ? "200px"
                                        : column.key === "isOrderAcceptable"
                                        ? "150px"
                                        : column.key ===
                                          "orderAcceptanceChecklist"
                                        ? "250px"
                                        : column.key === "remarks"
                                        ? "200px"
                                        : "160px",
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

                      <div
                        className="overflow-y-auto"
                        style={{ maxHeight: "500px" }}
                      >
                        <Table>
                          <TableBody>
                            {filteredPendingOrders.map((order, idx) => (
                              <TableRow
                                key={order.id || order.dispatchId || order.dispatchNo || idx}
                                className="hover:bg-gray-50"
                              >
                                {pendingColumns
                                  .filter(
                                    (col) => visiblePendingColumns[col.key]
                                  )
                                  .map((column) => (
                                    <TableCell
                                      key={column.key}
                                      className="border-b px-4 py-3 align-top"
                                      style={{
                                        width:
                                          column.key === "actions"
                                            ? "120px"
                                            : column.key === "orderNo"
                                            ? "120px"
                                            : column.key === "quotationNo"
                                            ? "150px"
                                            : column.key === "companyName"
                                            ? "250px"
                                            : column.key === "contactPersonName"
                                            ? "180px"
                                            : column.key === "contactNumber"
                                            ? "140px"
                                            : column.key === "billingAddress"
                                            ? "200px"
                                            : column.key === "shippingAddress"
                                            ? "200px"
                                            : column.key === "isOrderAcceptable"
                                            ? "150px"
                                            : column.key ===
                                              "orderAcceptanceChecklist"
                                            ? "250px"
                                            : column.key === "remarks"
                                            ? "200px"
                                            : "160px",
                                        minWidth:
                                          column.key === "actions"
                                            ? "120px"
                                            : column.key === "orderNo"
                                            ? "120px"
                                            : column.key === "quotationNo"
                                            ? "150px"
                                            : column.key === "companyName"
                                            ? "250px"
                                            : column.key === "contactPersonName"
                                            ? "180px"
                                            : column.key === "contactNumber"
                                            ? "140px"
                                            : column.key === "billingAddress"
                                            ? "200px"
                                            : column.key === "shippingAddress"
                                            ? "200px"
                                            : column.key === "isOrderAcceptable"
                                            ? "150px"
                                            : column.key ===
                                              "orderAcceptanceChecklist"
                                            ? "250px"
                                            : column.key === "remarks"
                                            ? "200px"
                                            : "160px",
                                        maxWidth:
                                          column.key === "actions"
                                            ? "120px"
                                            : column.key === "orderNo"
                                            ? "120px"
                                            : column.key === "quotationNo"
                                            ? "150px"
                                            : column.key === "companyName"
                                            ? "250px"
                                            : column.key === "contactPersonName"
                                            ? "180px"
                                            : column.key === "contactNumber"
                                            ? "140px"
                                            : column.key === "billingAddress"
                                            ? "200px"
                                            : column.key === "shippingAddress"
                                            ? "200px"
                                            : column.key === "isOrderAcceptable"
                                            ? "150px"
                                            : column.key ===
                                              "orderAcceptanceChecklist"
                                            ? "250px"
                                            : column.key === "remarks"
                                            ? "200px"
                                            : "160px",
                                      }}
                                    >
                                      <div className="break-words whitespace-normal leading-relaxed">
                                        {renderCellContent(order, column.key)}
                                      </div>
                                    </TableCell>
                                  ))}
                              </TableRow>
                            ))}
                            {filteredPendingOrders.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={
                                    pendingColumns.filter(
                                      (col) => visiblePendingColumns[col.key]
                                    ).length
                                  }
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
                    <CardTitle>Warehouse History</CardTitle>
                    <CardDescription>
                      Previously processed warehouse operations
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={showAllHistoryColumns}
                        >
                          Show All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={hideAllHistoryColumns}
                        >
                          Hide All
                        </Button>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="p-2 space-y-2">
                        {historyColumns.map((column) => (
                          <div
                            key={column.key}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`history-${column.key}`}
                              checked={visibleHistoryColumns[column.key]}
                              onCheckedChange={() =>
                                toggleHistoryColumn(column.key)
                              }
                            />
                            <Label
                              htmlFor={`history-${column.key}`}
                              className="text-sm"
                            >
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
                    <div style={{ minWidth: "max-content" }}>
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
                                    width:
                                      column.key === "orderNo"
                                        ? "120px"
                                        : column.key === "quotationNo"
                                        ? "150px"
                                        : column.key === "companyName"
                                        ? "250px"
                                        : column.key === "contactPersonName"
                                        ? "180px"
                                        : column.key === "contactNumber"
                                        ? "140px"
                                        : column.key === "billingAddress"
                                        ? "200px"
                                        : column.key === "shippingAddress"
                                        ? "200px"
                                        : column.key === "isOrderAcceptable"
                                        ? "150px"
                                        : column.key ===
                                          "orderAcceptanceChecklist"
                                        ? "250px"
                                        : column.key === "remarks"
                                        ? "200px"
                                        : column.key === "availabilityStatus"
                                        ? "150px"
                                        : column.key === "inventoryRemarks"
                                        ? "200px"
                                        : "160px",
                                    minWidth:
                                      column.key === "orderNo"
                                        ? "120px"
                                        : column.key === "quotationNo"
                                        ? "150px"
                                        : column.key === "companyName"
                                        ? "250px"
                                        : column.key === "contactPersonName"
                                        ? "180px"
                                        : column.key === "contactNumber"
                                        ? "140px"
                                        : column.key === "billingAddress"
                                        ? "200px"
                                        : column.key === "shippingAddress"
                                        ? "200px"
                                        : column.key === "isOrderAcceptable"
                                        ? "150px"
                                        : column.key ===
                                          "orderAcceptanceChecklist"
                                        ? "250px"
                                        : column.key === "remarks"
                                        ? "200px"
                                        : column.key === "availabilityStatus"
                                        ? "150px"
                                        : column.key === "inventoryRemarks"
                                        ? "200px"
                                        : "160px",
                                    maxWidth:
                                      column.key === "orderNo"
                                        ? "120px"
                                        : column.key === "quotationNo"
                                        ? "150px"
                                        : column.key === "companyName"
                                        ? "250px"
                                        : column.key === "contactPersonName"
                                        ? "180px"
                                        : column.key === "contactNumber"
                                        ? "140px"
                                        : column.key === "billingAddress"
                                        ? "200px"
                                        : column.key === "shippingAddress"
                                        ? "200px"
                                        : column.key === "isOrderAcceptable"
                                        ? "150px"
                                        : column.key ===
                                          "orderAcceptanceChecklist"
                                        ? "250px"
                                        : column.key === "remarks"
                                        ? "200px"
                                        : column.key === "availabilityStatus"
                                        ? "150px"
                                        : column.key === "inventoryRemarks"
                                        ? "200px"
                                        : "160px",
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

                      <div
                        className="overflow-y-auto"
                        style={{ maxHeight: "500px" }}
                      >
                        <Table>
                          <TableBody>
                            {filteredHistoryOrders.map((order, idx) => (
                              <TableRow
                                key={order.id || order.dispatchId || order.dispatchNo || idx}
                                className="hover:bg-gray-50"
                              >
                                {historyColumns
                                  .filter(
                                    (col) => visibleHistoryColumns[col.key]
                                  )
                                  .map((column) => (
                                    <TableCell
                                      key={column.key}
                                      className="border-b px-4 py-3 align-top"
                                      style={{
                                        width:
                                          column.key === "orderNo"
                                            ? "120px"
                                            : column.key === "quotationNo"
                                            ? "150px"
                                            : column.key === "companyName"
                                            ? "250px"
                                            : column.key === "contactPersonName"
                                            ? "180px"
                                            : column.key === "contactNumber"
                                            ? "140px"
                                            : column.key === "billingAddress"
                                            ? "200px"
                                            : column.key === "shippingAddress"
                                            ? "200px"
                                            : column.key === "isOrderAcceptable"
                                            ? "150px"
                                            : column.key ===
                                              "orderAcceptanceChecklist"
                                            ? "250px"
                                            : column.key === "remarks"
                                            ? "200px"
                                            : column.key ===
                                              "availabilityStatus"
                                            ? "150px"
                                            : column.key === "inventoryRemarks"
                                            ? "200px"
                                            : "160px",
                                        minWidth:
                                          column.key === "orderNo"
                                            ? "120px"
                                            : column.key === "quotationNo"
                                            ? "150px"
                                            : column.key === "companyName"
                                            ? "250px"
                                            : column.key === "contactPersonName"
                                            ? "180px"
                                            : column.key === "contactNumber"
                                            ? "140px"
                                            : column.key === "billingAddress"
                                            ? "200px"
                                            : column.key === "shippingAddress"
                                            ? "200px"
                                            : column.key === "isOrderAcceptable"
                                            ? "150px"
                                            : column.key ===
                                              "orderAcceptanceChecklist"
                                            ? "250px"
                                            : column.key === "remarks"
                                            ? "200px"
                                            : column.key ===
                                              "availabilityStatus"
                                            ? "150px"
                                            : column.key === "inventoryRemarks"
                                            ? "200px"
                                            : "160px",
                                        maxWidth:
                                          column.key === "orderNo"
                                            ? "120px"
                                            : column.key === "quotationNo"
                                            ? "150px"
                                            : column.key === "companyName"
                                            ? "250px"
                                            : column.key === "contactPersonName"
                                            ? "180px"
                                            : column.key === "contactNumber"
                                            ? "140px"
                                            : column.key === "billingAddress"
                                            ? "200px"
                                            : column.key === "shippingAddress"
                                            ? "200px"
                                            : column.key === "isOrderAcceptable"
                                            ? "150px"
                                            : column.key ===
                                              "orderAcceptanceChecklist"
                                            ? "250px"
                                            : column.key === "remarks"
                                            ? "200px"
                                            : column.key ===
                                              "availabilityStatus"
                                            ? "150px"
                                            : column.key === "inventoryRemarks"
                                            ? "200px"
                                            : "160px",
                                      }}
                                    >
                                      <div className="break-words whitespace-normal leading-relaxed">
                                        {renderCellContent(order, column.key)}
                                      </div>
                                    </TableCell>
                                  ))}
                              </TableRow>
                            ))}
                            {filteredHistoryOrders.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={
                                    historyColumns.filter(
                                      (col) => visibleHistoryColumns[col.key]
                                    ).length
                                  }
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Process Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Warehouse Processing</DialogTitle>
              <DialogDescription>
                Upload warehouse documentation and enter processing details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    className="font-bold"
                    value={selectedOrder?.orderNo}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quotation No.</Label>
                  <Input className="font-bold" value={selectedOrder?.quotationNo || ""} disabled />
                </div>
              </div>

              {/* Items Section */}
              <div className="mt-4">
                <h5 className="font-medium mb-2">Items</h5>
                <div className="space-y-2">
                  {Object.keys(selectedOrder || {})
                    .filter((key) => key.startsWith("itemName"))
                    .map((key) => {
                      const numMatch = key.match(/\d+$/);
                      return numMatch ? parseInt(numMatch[0]) : null;
                    })
                    .filter((num) => num !== null)
                    .sort((a, b) => (a as number) - (b as number))
                    .map((num) => {
                      const itemName = selectedOrder?.[`itemName${num}`];
                      const quantity = selectedOrder?.[`quantity${num}`];
                      
                      return (
                        <div key={num} className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Item Name {num}</Label>
                            <Input className="font-bold" value={itemName || ""} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Quantity {num}</Label>
                            <Input className="font-bold" value={quantity || ""} disabled />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="mt-4">
                <h5 className="font-medium mb-2">Attachments</h5>
                <div className="grid grid-cols-2 gap-4">
                  {/* {selectedOrder?.quotationCopy && (
                    <div className="space-y-2">
                      <Label>Quotation Copy</Label>
                      <div>
                        <a
                          href={selectedOrder.quotationCopy}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedOrder?.quotationCopy2 && (
                    <div className="space-y-2">
                      <Label>Quotation Copy 2</Label>
                      <div>
                        <a
                          href={selectedOrder.quotationCopy2}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedOrder?.acceptanceCopy && (
                    <div className="space-y-2">
                      <Label>Acceptance Copy</Label>
                      <div>
                        <a
                          href={selectedOrder.acceptanceCopy}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedOrder?.ewayBillAttachment && (
                    <div className="space-y-2">
                      <Label>Eway Bill Attachment</Label>
                      <div>
                        <a
                          href={selectedOrder.ewayBillAttachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedOrder?.srnNumberAttachment && (
                    <div className="space-y-2">
                      <Label>SRN Number Attachment</Label>
                      <div>
                        <a
                          href={selectedOrder.srnNumberAttachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedOrder?.attachment && (
                    <div className="space-y-2">
                      <Label>Other Attachment</Label>
                      <div>
                        <a
                          href={selectedOrder.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  )} */}

                  {selectedOrder?.invoiceUpload && (
                    <div className="space-y-2">
                      <Label>Invoice Upload</Label>
                      <div>
                        <a
                          href={selectedOrder.invoiceUpload}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  )}
                  {/* {selectedOrder?.ewayBillUpload && (
                    <div className="space-y-2">
                      <Label>Eway Bill Upload</Label>
                      <div>
                        <a
                          href={selectedOrder.ewayBillUpload}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  )} */}
                </div>
              </div>

              {/* New Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transporterName">
                    Transporter/Courier/Flight-Person Name
                  </Label>
                  <Input
                    id="transporterName"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    placeholder="Enter transporter name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transporterContact">
                    Transporter/Courier/Flight-Person Contact No.
                  </Label>
                  <Input
                    id="transporterContact"
                    value={transporterContact}
                    onChange={(e) => setTransporterContact(e.target.value)}
                    placeholder="Enter contact number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="biltyNumber">
                    Transporter/Courier/Flight-Bilty No./Docket No.
                  </Label>
                  <Input
                    id="biltyNumber"
                    value={biltyNumber}
                    onChange={(e) => setBiltyNumber(e.target.value)}
                    placeholder="Enter bilty/docket number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalCharges">Total Charges</Label>
                  <Input
                    id="totalCharges"
                    value={totalCharges}
                    onChange={(e) => setTotalCharges(e.target.value)}
                    placeholder="Enter total charges"
                    type="number"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouseRemarks">Warehouse Remarks</Label>
                <Textarea
                  id="warehouseRemarks"
                  value={warehouseRemarks}
                  onChange={(e) => setWarehouseRemarks(e.target.value)}
                  placeholder="Enter warehouse remarks"
                  rows={3}
                />
              </div>

              {/* File Upload Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">File Uploads</h4>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="beforePhoto">Before Photo Upload</Label>
                    <Input
                      id="beforePhoto"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setBeforePhoto(e.target.files?.[0] || null)
                      }
                    />
                    {beforePhoto && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {beforePhoto.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="afterPhoto">After Photo Upload</Label>
                    <Input
                      id="afterPhoto"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setAfterPhoto(e.target.files?.[0] || null)
                      }
                    />
                    {afterPhoto && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {afterPhoto.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="biltyUpload">Bilty Upload</Label>
                    <Input
                      id="biltyUpload"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) =>
                        setBiltyUpload(e.target.files?.[0] || null)
                      }
                    />
                    {biltyUpload && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {biltyUpload.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={uploading || currentUser?.role === "user"}
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
              <DialogTitle>Warehouse Details</DialogTitle>
              <DialogDescription>
                View warehouse operation details
              </DialogDescription>
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
                    <p className="text-sm">
                      {viewOrder.invoiceNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label>Transport Mode</Label>
                    <p className="text-sm">{viewOrder.transportMode}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Processed Date</Label>
                    <p className="text-sm">
                      {viewOrder.warehouseProcessedDate || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label>Destination</Label>
                    <p className="text-sm">{viewOrder.destination}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
