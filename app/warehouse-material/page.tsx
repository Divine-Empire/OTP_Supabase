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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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

import { mapDispatchRowToUI } from "@/lib/otp-utils";

// Column definitions for Pending tab
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
  { key: "quotationCopy2", label: "Quotation Copy", searchable: true },
  { key: "acceptanceCopy", label: "Acceptance Copy", searchable: true },
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
  { key: "totalQty", label: "Total Qty", searchable: true },
  { key: "remarks", label: "Remarks", searchable: true },
  { key: "beforePhotoUpload", label: "Before Photo Upload", searchable: false },
  { key: "afterPhotoUpload", label: "After Photo Upload", searchable: false },
  { key: "biltyUpload", label: "Bilty Upload", searchable: false },
  { key: "transporterName", label: "Transporter/Courier/Flight-Person Name", searchable: true },
  { key: "transporterContact", label: "Transporter/Courier/Flight-Person Contact No.", searchable: true },
  { key: "biltyNumber", label: "Transporter/Courier/Flight-Bilty No./Docket No.", searchable: true },
  { key: "totalCharges", label: "Total Charges", searchable: true },
  { key: "warehouseRemarks", label: "Warehouse Remarks", searchable: true },
  { key: "dSrNumber", label: "D-Sr Number", searchable: true },
]

// Column definitions for History tab
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "materialReceivingStatus", label: "Material Receiving Status", searchable: true },
  { key: "reason", label: "Reason", searchable: true },
  { key: "installationRequiredHistory", label: "Installation Required", searchable: true },
]

export default function WarehouseMaterialPage() {
  const { orders, updateOrder } = useData();
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [materialReceived, setMaterialReceived] = useState<string>("");
  const [installationRequired, setInstallationRequired] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [transporterFollowup, setTransporterFollowup] = useState<string>("");

  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dropdownData, setDropdownData] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("all");
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  const {user: currentUser} = useAuth();

  const fetchPendingOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/otp-supabase/dispatches?stage=material_receiving&status=pending");
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map(mapDispatchRowToUI);
        setPendingOrders(mapped);
      } else {
        setPendingOrders([]);
      }
    } catch (err: any) {
      console.error("Error fetching pending material receiving:", err);
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
      const response = await fetch("/api/otp-supabase/dispatches?stage=material_receiving&status=history");
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map(mapDispatchRowToUI);
        setHistoryOrders(mapped);
      } else {
        setHistoryOrders([]);
      }
    } catch (err: any) {
      console.error("Error fetching history material receiving:", err);
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
    if (currentUser.assignedSteps?.includes("all") || currentUser.assignedSteps?.includes("warehouse-material")) {
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

  // Legacy orders from useData hook (keep for backward compatibility)
  const legacyPendingOrders = orders.filter(
    (order) => order.status === "warehouse-processed"
  );
  const legacyProcessedOrders = orders.filter(
    (order) => order.materialRcvdData
  );

  const updateOrderStatus = async (order: any) => {
    try {
      setUploading(true);

      const dispatchNo = order.dispatchNo || order.dSrNumber || order.id;

      const updateResponse = await fetch("/api/otp-supabase/dispatches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchNo,
          stage: "material_receiving",
          stageData: {
            material_received: materialReceived,
            transporter_followup: transporterFollowup,
            installation_required: installationRequired === "Yes",
            created_by: currentUser?.fullName || currentUser?.username || "Admin",
            actual_date: new Date().toISOString(),
          },
        }),
      });

      const result = await updateResponse.json();

      if (result.success) {
        await fetchPendingOrders();
        await fetchHistoryOrders();
        return { success: true };
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
    setSelectedOrder(orderId);
    setMaterialReceived("");
    setInstallationRequired("");
    setTransporterFollowup("");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedOrder || !materialReceived || !installationRequired) return;

    const order = pendingOrders.find((o) => o.id === selectedOrder);
    if (!order) {
      // Fallback to legacy orders
      const materialRcvdData = {
        materialReceived,
        installationRequired,
        processedAt: new Date().toISOString(),
        processedBy: "Current User",
        transporterFollowup,
      };

      updateOrder(selectedOrder, {
        status: "material-received",
        materialRcvdData,
      });

      setIsDialogOpen(false);
      setSelectedOrder("");
      return;
    }

    // Check if D-Sr Number exists
    if (!order.dSrNumber) {
      alert("D-Sr Number not found for this order. Cannot process.");
      return;
    }

    const result = await updateOrderStatus(order);

    if (result.success) {
      setIsDialogOpen(false);
      setSelectedOrder("");
      alert(
        `Material receipt processing for D-Sr Number ${order.dSrNumber} has been completed successfully`
      );
    } else {
      alert(`Error processing material receipt: ${result.error}`);
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

    switch (columnKey) {
      // In the actions column renderer, update the Process button:
case "actions":
  return (
    <Button 
      size="sm" 
      onClick={() => handleProcess(order.id)}
      disabled={currentUser?.role === "user"}
    >
      Process
    </Button>
  );
      case "quotationCopy":
      case "quotationCopy2":
      //   return <Badge variant={value === "" ? "default" : ""}>{value || ""}</Badge>
      case "acceptanceCopy":
        return value &&
          typeof value === "string" &&
          (value.startsWith("http") || value.startsWith("https")) ? (
          <a href={value} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">View</Badge>
          </a>
        ) : (
          <Badge variant="secondary">{value || ""}</Badge>
        );
      case "calibrationCertRequired":
      case "installationRequired":
      case "installationRequiredHistory":
        return (
          <Badge
            variant={
              value === "Yes" || value === "YES" ? "default" : "secondary"
            }
          >
            {value || "N/A"}
          </Badge>
        );
      case "billingAddress":
      case "shippingAddress":
      case "remarks":
      case "warehouseRemarks":
      case "reason":
        return (
          <div className="max-w-[200px] whitespace-normal break-words">
            {value || ""}
          </div>
        );
      case "beforePhotoUpload":
      case "afterPhotoUpload":
      case "biltyUpload":
      case "ewayBillAttachment":
      case "srnNumberAttachment":
      case "attachment":
        return value &&
          typeof value === "string" &&
          (value.startsWith("http") || value.startsWith("https")) ? (
          <a href={value} target="_blank" rel="noopener noreferrer">
            <Badge variant="default">View</Badge>
          </a>
        ) : (
          <Badge variant="secondary">N/A</Badge>
        );
      case "materialReceivingStatus":
        return (
          <Badge variant={value === "yes" ? "default" : "secondary"}>
            {value || "N/A"}
          </Badge>
        );
      default:
        return value || "";
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
     
<div className="flex justify-between items-center">
  <div>
    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
      Warehouse (Material RCVD)
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
                    <CardTitle>Pending Material Receipt</CardTitle>
                    <CardDescription>
                      Orders waiting for material receipt confirmation
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
                                        : column.key === "invoiceNumber"
                                        ? "150px"
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
                                        : column.key === "invoiceNumber"
                                        ? "150px"
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
                                        : column.key === "invoiceNumber"
                                        ? "150px"
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
                            {filteredPendingOrders.map((order) => (
                              <TableRow
                                key={order.id}
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
                    <CardTitle>Material Receipt History</CardTitle>
                    <CardDescription>
                      Previously processed material receipts
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
                            {filteredHistoryOrders.map((order) => (
                              <TableRow
                                key={order.id}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Material Receipt Confirmation</DialogTitle>
              <DialogDescription>
                Confirm material receipt and installation requirements
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input id="orderNumber" value={selectedOrder} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialRcvd">Material RCVD</Label>
                <Select
                  value={materialReceived}
                  onValueChange={setMaterialReceived}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="installation">Site Person Name</Label>
                <Input
                  id="installation"
                  placeholder="Enter Name"
                  value={installationRequired}
                  onChange={(e) => setInstallationRequired(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transporterFollowup">Site Person Contact No.</Label>
                <Input
                  id="transporterFollowup"
                  placeholder="Enter Contact No."
                  value={transporterFollowup}
                  onChange={(e) => setTransporterFollowup(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
               
<Button
  onClick={handleSubmit}
  disabled={
    !materialReceived || 
    !installationRequired || 
    uploading ||
    currentUser?.role === "user"
  }
>
  {uploading ? (
    <>
      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      Submitting...
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
              <DialogTitle>Material Receipt Details</DialogTitle>
              <DialogDescription>
                View material receipt information
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
                      {viewOrder.materialProcessedDate || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label>Destination</Label>
                    <p className="text-sm">{viewOrder.destination}</p>
                  </div>
                </div>
                {viewOrder.materialRcvdData && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Material Received</Label>
                      <p className="text-sm">
                        {viewOrder.materialRcvdData.materialReceived}
                      </p>
                    </div>
                    <div>
                      <Label>Installation Required</Label>
                      <p className="text-sm">
                        {viewOrder.materialRcvdData.installationRequired}
                      </p>
                    </div>
                    <div>
                      <Label>Reason</Label>
                      <p className="text-sm">
                        {viewOrder.materialRcvdData.transporterFollowup ||
                          "N/A"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
