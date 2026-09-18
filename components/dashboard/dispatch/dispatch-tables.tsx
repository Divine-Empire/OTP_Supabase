import { useState, useMemo } from "react"
import { Search, Filter, Eye, EyeOff, ChevronDown } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DispatchOrder {
  orderNo: string
  company: string
  amount: number | string
  status: string
  date: string
  // Add all the additional fields from DISPATCH-DELIVERY sheet
  quotationNo?: string
  contactPersonName?: string
  contactNumber?: string
  billingAddress?: string
  shippingAddress?: string
  paymentMode?: string
  quotationCopy?: string
  paymentTerms?: string
  transportMode?: string
  freightType?: string
  destination?: string
  poNumber?: string
  quotationCopyField?: string
  acceptanceCopy?: string
  offer?: string
  conveyedForRegistration?: string
  qty?: string
  approvedName?: string
  calibrationCertificateRequired?: string
  certificateCategory?: string
  installationRequired?: string
  ewayBillDetails?: string
  ewayBillAttachment?: string
  srnNumber?: string
  srnNumberAttachment?: string
  attachment?: string
  itemName1?: string
  quantity1?: string
  itemName2?: string
  quantity2?: string
  itemName3?: string
  quantity3?: string
  itemName4?: string
  quantity4?: string
  itemName5?: string
  quantity5?: string
  itemName6?: string
  quantity6?: string
  itemName7?: string
  quantity7?: string
  itemName8?: string
  quantity8?: string
  itemName9?: string
  quantity9?: string
  itemName10?: string
  quantity10?: string
  itemName11?: string
  quantity11?: string
  itemName12?: string
  quantity12?: string
  itemName13?: string
  quantity13?: string
  itemName14?: string
  quantity14?: string
  itemName15?: string
  quantity15?: string
  totalQty?: string
  remarks?: string
  invoiceNumber?: string
  invoiceUpload?: string
  ewayBillUpload?: string
  totalQtyField?: string
  totalBillAmount?: string
  beforePhotoUpload?: string
  afterPhotoUpload?: string
  biltyUpload?: string
  transporterName?: string
  transporterContact?: string
  transporterBiltyNo?: string
  totalCharges?: string
  warehouseRemarks?: string
  materialReceivingStatus?: string
  reason?: string
  installationRequiredField?: string
  labCalibrationCertificate?: string
  stCalibrationCertificate?: string
  labCalibrationDate?: string
  stCalibrationDate?: string
  labCalibrationPeriod?: string
  stCalibrationPeriod?: string
  labDueDate?: string
  stDueDate?: string
  uploadDN?: string
  dispatchStatus?: string
}

interface DispatchTablesProps {
  data: any
}

// Define all available columns (excluding planned/actual columns)
const ALL_DISPATCH_COLUMNS = [
  { key: 'orderNo', label: 'Order No.', defaultVisible: true },
  { key: 'quotationNo', label: 'Quotation No.', defaultVisible: false },
  { key: 'company', label: 'Company Name', defaultVisible: true },
  { key: 'contactPersonName', label: 'Contact Person Name', defaultVisible: false },
  { key: 'contactNumber', label: 'Contact Number', defaultVisible: false },
  { key: 'billingAddress', label: 'Billing Address', defaultVisible: false },
  { key: 'shippingAddress', label: 'Shipping Address', defaultVisible: false },
  { key: 'paymentMode', label: 'Payment Mode', defaultVisible: false },
  { key: 'quotationCopy', label: 'Quotation Copy', defaultVisible: false },
  { key: 'paymentTerms', label: 'Payment Terms(In Days)', defaultVisible: false },
  { key: 'transportMode', label: 'Transport Mode', defaultVisible: false },
  { key: 'freightType', label: 'Freight Type', defaultVisible: false },
  { key: 'destination', label: 'Destination', defaultVisible: false },
  { key: 'poNumber', label: 'Po Number', defaultVisible: false },
  { key: 'quotationCopyField', label: 'Quotation Copy', defaultVisible: false },
  { key: 'acceptanceCopy', label: 'Acceptance Copy', defaultVisible: false },
  { key: 'offer', label: 'Offer', defaultVisible: false },
  { key: 'conveyedForRegistration', label: 'Conveyed For Registration Form', defaultVisible: false },
  { key: 'qty', label: 'Qty', defaultVisible: false },
  { key: 'amount', label: 'Amount', defaultVisible: true },
  { key: 'approvedName', label: 'Approved Name', defaultVisible: false },
  { key: 'calibrationCertificateRequired', label: 'Calibration Certificate Required', defaultVisible: false },
  { key: 'certificateCategory', label: 'Certificate Category', defaultVisible: false },
  { key: 'installationRequired', label: 'Installation Required', defaultVisible: false },
  { key: 'ewayBillDetails', label: 'Eway Bill Details', defaultVisible: false },
  { key: 'ewayBillAttachment', label: 'Eway Bill Attachment', defaultVisible: false },
  { key: 'srnNumber', label: 'Srn Number', defaultVisible: false },
  { key: 'srnNumberAttachment', label: 'Srn Number Attachment', defaultVisible: false },
  { key: 'attachment', label: 'Attachment', defaultVisible: false },
  { key: 'itemName1', label: 'Item Name 1', defaultVisible: false },
  { key: 'quantity1', label: 'Quantity 1', defaultVisible: false },
  { key: 'itemName2', label: 'Item Name 2', defaultVisible: false },
  { key: 'quantity2', label: 'Quantity 2', defaultVisible: false },
  { key: 'itemName3', label: 'Item Name 3', defaultVisible: false },
  { key: 'quantity3', label: 'Quantity 3', defaultVisible: false },
  { key: 'itemName4', label: 'Item Name 4', defaultVisible: false },
  { key: 'quantity4', label: 'Quantity 4', defaultVisible: false },
  { key: 'itemName5', label: 'Item Name 5', defaultVisible: false },
  { key: 'quantity5', label: 'Quantity 5', defaultVisible: false },
  { key: 'itemName6', label: 'Item Name 6', defaultVisible: false },
  { key: 'quantity6', label: 'Quantity 6', defaultVisible: false },
  { key: 'itemName7', label: 'Item Name 7', defaultVisible: false },
  { key: 'quantity7', label: 'Quantity 7', defaultVisible: false },
  { key: 'itemName8', label: 'Item Name 8', defaultVisible: false },
  { key: 'quantity8', label: 'Quantity 8', defaultVisible: false },
  { key: 'itemName9', label: 'Item Name 9', defaultVisible: false },
  { key: 'quantity9', label: 'Quantity 9', defaultVisible: false },
  { key: 'itemName10', label: 'Item Name 10', defaultVisible: false },
  { key: 'quantity10', label: 'Quantity 10', defaultVisible: false },
  { key: 'itemName11', label: 'Item Name 11', defaultVisible: false },
  { key: 'quantity11', label: 'Quantity 11', defaultVisible: false },
  { key: 'itemName12', label: 'Item Name 12', defaultVisible: false },
  { key: 'quantity12', label: 'Quantity 12', defaultVisible: false },
  { key: 'itemName13', label: 'Item Name 13', defaultVisible: false },
  { key: 'quantity13', label: 'Quantity 13', defaultVisible: false },
  { key: 'itemName14', label: 'Item Name 14', defaultVisible: false },
  { key: 'quantity14', label: 'Quantity 14', defaultVisible: false },
  { key: 'itemName15', label: 'Item Name 15', defaultVisible: false },
  { key: 'quantity15', label: 'Quantity 15', defaultVisible: false },
  { key: 'totalQty', label: 'Total Qty', defaultVisible: false },
  { key: 'remarks', label: 'Remarks', defaultVisible: false },
  { key: 'invoiceNumber', label: 'Invoice Number', defaultVisible: false },
  { key: 'invoiceUpload', label: 'Invoice Upload', defaultVisible: false },
  { key: 'ewayBillUpload', label: 'Eway Bill Upload', defaultVisible: false },
  { key: 'totalQtyField', label: 'Total Qty', defaultVisible: false },
  { key: 'totalBillAmount', label: 'Total Bill Amount', defaultVisible: false },
  { key: 'beforePhotoUpload', label: 'Before Photo Upload', defaultVisible: false },
  { key: 'afterPhotoUpload', label: 'After Photo Upload', defaultVisible: false },
  { key: 'biltyUpload', label: 'Bilty Upload', defaultVisible: false },
  { key: 'transporterName', label: 'Transporter /Courier/Flight-Person Name', defaultVisible: false },
  { key: 'transporterContact', label: 'Transporter/Courier/Flight-Person Contact No.', defaultVisible: false },
  { key: 'transporterBiltyNo', label: 'Transporter/Courier/Flight-Bilty No./Docket No.', defaultVisible: false },
  { key: 'totalCharges', label: 'Total Charges', defaultVisible: false },
  { key: 'warehouseRemarks', label: 'Warehouse Remarks', defaultVisible: false },
  { key: 'materialReceivingStatus', label: 'Material Receiving Status', defaultVisible: false },
  { key: 'reason', label: 'Reason', defaultVisible: false },
  { key: 'installationRequiredField', label: 'Installation Required', defaultVisible: false },
  { key: 'labCalibrationCertificate', label: 'Lab Calibration Certificate', defaultVisible: false },
  { key: 'stCalibrationCertificate', label: 'ST Calibration Certificate', defaultVisible: false },
  { key: 'labCalibrationDate', label: 'Lab Calibration Date', defaultVisible: false },
  { key: 'stCalibrationDate', label: 'ST Calibration Date', defaultVisible: false },
  { key: 'labCalibrationPeriod', label: 'Lab Calibration Period', defaultVisible: false },
  { key: 'stCalibrationPeriod', label: 'ST Calibration Period', defaultVisible: false },
  { key: 'labDueDate', label: 'Lab Due Date', defaultVisible: false },
  { key: 'stDueDate', label: 'ST Due Date', defaultVisible: false },
  { key: 'uploadDN', label: 'Upload DN', defaultVisible: false },
  { key: 'status', label: 'Dispatch Status', defaultVisible: true },
  { key: 'date', label: 'Date', defaultVisible: true }
]

export function DispatchTables({ data }: DispatchTablesProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showColumnDropdown, setShowColumnDropdown] = useState(false)
  
  // Initialize visible columns with default visible ones
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaultVisible = ALL_DISPATCH_COLUMNS.filter(col => col.defaultVisible).map(col => col.key)
    return new Set(defaultVisible)
  })

  // Function to normalize status for display and filtering
  const normalizeStatus = (status: string): string => {
    if (!status) return "pending"
    const normalizedStatus = status.toLowerCase().trim()
    
    if (normalizedStatus === "complete" || normalizedStatus === "completed" || normalizedStatus === "yes") {
      return "complete"
    } else if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
      return "cancelled"
    } else {
      return "pending"
    }
  }

  // Function to get badge styles based on status
  const getBadgeStyles = (status: string) => {
    const normalized = normalizeStatus(status)
    switch (normalized) {
      case "complete":
        return "bg-green-100 text-green-800 border-green-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }
  }

  // Function to get display text for status
  const getStatusDisplay = (status: string) => {
    const normalized = normalizeStatus(status)
    switch (normalized) {
      case "complete":
        return "Complete"
      case "pending":
        return "Pending"
      default:
        return "Pending"
    }
  }

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey)
      } else {
        newSet.add(columnKey)
      }
      return newSet
    })
  }

  // Get visible columns list
  const visibleColumnsList = useMemo(() => {
    return ALL_DISPATCH_COLUMNS.filter(col => visibleColumns.has(col.key))
  }, [visibleColumns])

  // Get dispatch orders from the data
  const dispatchOrders = data.allDispatchOrders || []

  // Filtered and searched orders
  const filteredOrders = useMemo(() => {
    return dispatchOrders.filter((order: DispatchOrder) => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.amount.toString().toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      const orderStatus = normalizeStatus(order.status)
      const matchesStatus = statusFilter === "all" || orderStatus === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [dispatchOrders, searchTerm, statusFilter])

  // Separate orders by status for summary
  const completeOrders = filteredOrders.filter((order: DispatchOrder) => normalizeStatus(order.status) === "complete")
  const pendingOrders = filteredOrders.filter((order: DispatchOrder) => normalizeStatus(order.status) === "pending")

  // Format amount
  const formatAmount = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount
    return isNaN(numAmount) ? '0' : numAmount.toLocaleString()
  }

  // Format date with better error handling - DD/MM/YYYY format
  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === "") return "N/A"
    
    try {
      let date: Date | null = null
      
      // Handle Google Sheets Date format like "Date(2025,5,7,0,0,0)"
      if (typeof dateStr === "string" && dateStr.includes("Date(")) {
        const match = dateStr.match(/Date\((\d+),(\d+),(\d+)/)
        if (match) {
          const year = parseInt(match[1])
          const month = parseInt(match[2]) // Google Sheets months are 0-indexed
          const day = parseInt(match[3])
          date = new Date(year, month, day)
        }
      }
      // Handle dates like "6/21/2025 12:19:24" or "6/21/2025"
      else if (typeof dateStr === "string" && dateStr.includes('/')) {
        // Split by space to remove time part if present
        const datePart = dateStr.split(' ')[0]
        
        // Parse the date part (format: M/D/YYYY or MM/DD/YYYY)
        const parts = datePart.split('/')
        if (parts.length === 3) {
          const month = parseInt(parts[0])
          const day = parseInt(parts[1])
          const year = parseInt(parts[2])
          
          // Create date
          date = new Date(year, month - 1, day) // month is 0-indexed
        }
      }
      // Try parsing as regular date
      else {
        date = new Date(dateStr)
      }
      
      // If we have a valid date, format it as DD/MM/YYYY
      if (date && !isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
      }
      
      // If parsing fails, return the original string
      return dateStr
    } catch (error) {
      console.error("Date formatting error:", error, "for dateStr:", dateStr)
      return dateStr || "Invalid Date"
    }
  }

  // Get cell value for any column
  const getCellValue = (order: DispatchOrder, columnKey: string) => {
    switch (columnKey) {
      case 'amount':
        return `₹${formatAmount(order.amount)}`
      case 'status':
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getBadgeStyles(order.status)}`}>
            {getStatusDisplay(order.status)}
          </span>
        )
      case 'date':
        return formatDate(order.date)
      case 'totalBillAmount':
        return `₹${formatAmount((order as any)[columnKey] || 0)}`
      case 'totalCharges':
        return `₹${formatAmount((order as any)[columnKey] || 0)}`
      default:
        const value = (order as any)[columnKey]
        return value !== undefined && value !== null && value !== "" ? value : '-'
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Orders</CardTitle>
          <CardDescription>
            Manage and view dispatch orders from DISPATCH-DELIVERY sheet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by order number, company, or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="complete">Complete</option>
              </select>
            </div>

            {/* Column Visibility Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white hover:bg-gray-50"
              >
                <Eye className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Columns</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              
              {showColumnDropdown && (
                <div className="absolute right-0 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900">Show/Hide Columns</h4>
                    <p className="text-xs text-gray-500 mt-1">Select which columns to display in the table</p>
                  </div>
                  <div className="p-2">
                    {ALL_DISPATCH_COLUMNS.map((column) => (
                      <label
                        key={column.key}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(column.key)}
                          onChange={() => toggleColumnVisibility(column.key)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700 flex-1">{column.label}</span>
                        {visibleColumns.has(column.key) ? (
                          <Eye className="h-3 w-3 text-green-500" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-gray-400" />
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <div className="text-xs text-gray-600">
                      {visibleColumns.size} of {ALL_DISPATCH_COLUMNS.length} columns visible
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Results summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              Showing {filteredOrders.length} of {dispatchOrders.length} dispatch orders
              {searchTerm && ` matching "${searchTerm}"`}
              {statusFilter !== "all" && ` with status "${statusFilter}"`}
            </p>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>Complete: {completeOrders.length}</span>
              <span>Pending: {pendingOrders.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Dispatch Table with Column Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>All Dispatch Orders</CardTitle>
          <CardDescription>
            All dispatch orders with their current status ({filteredOrders.length} orders)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {visibleColumnsList.map((column) => (
                    <th
                      key={column.key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumnsList.length} className="px-6 py-8 text-center text-gray-500">
                      {dispatchOrders.length === 0 ? "No dispatch orders found" : "No orders match your search criteria"}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order: any, index: number) => (
                    <tr key={`${order.orderNo}-${index}`} className="hover:bg-gray-50">
                      {visibleColumnsList.map((column) => (
                        <td
                          key={column.key}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {getCellValue(order, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Click outside to close dropdown */}
      {showColumnDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowColumnDropdown(false)}
        />
      )}
    </div>
  )
}