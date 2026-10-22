import { useState, useMemo } from "react"
import { Search, Filter, Eye, EyeOff, ChevronDown } from "lucide-react"

interface Order {
  orderNo: string
  company: string
  amount: number | string
  status: string
  date: string
  // Add all the additional fields from ORDER-DISPATCH sheet
  quotationNo?: string
  contactPersonName?: string
  contactNumber?: string
  billingAddress?: string
  shippingAddress?: string
  paymentMode?: string
  paymentTerms?: string
  referenceName?: string
  email?: string
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
  transportMode?: string
  freightType?: string
  destination?: string
  poNumber?: string
  quotationCopy?: string
  acceptanceCopy?: string
  offerShow?: string
  conveyedForRegistration?: string
  totalOrderQty?: string
  totalDispatchQuantity?: string
  quantityDelivered?: string
  orderCancel?: string
  pendingDeliveryQty?: string
  pendingDispatchQty?: string
  materialReturn?: string
  deliveryStatus?: string
  dispatchStatus?: string
  dispatchCompleteDate?: string
  deliveryCompleteDate?: string
  isOrderAcceptable?: string
  orderAcceptanceChecklist?: string
  remark?: string
  availabilityStatus?: string
  remarks?: string
  customerWantsMaterial?: string
  createdBy?: string
  warehouseLocation?: string
  createIndent?: string
  lineItemNumber?: string
  totalQty?: string
  materialReceivedLeadTime?: string
  receivedDate?: string
  approvalName?: string
  revenue?: string
}

interface RecentOrdersTableProps {
  orders: Order[]
}

// Define all available columns
const ALL_COLUMNS = [
  { key: 'orderNo', label: 'Order No.', defaultVisible: true },
  { key: 'quotationNo', label: 'Quotation No.', defaultVisible: false },
  { key: 'company', label: 'Company Name', defaultVisible: true },
  { key: 'contactPersonName', label: 'Contact Person Name', defaultVisible: false },
  { key: 'contactNumber', label: 'Contact Number', defaultVisible: false },
  { key: 'billingAddress', label: 'Billing Address', defaultVisible: false },
  { key: 'shippingAddress', label: 'Shipping Address', defaultVisible: false },
  { key: 'paymentMode', label: 'Payment Mode', defaultVisible: false },
  { key: 'paymentTerms', label: 'Payment Terms(In Days)', defaultVisible: false },
  { key: 'referenceName', label: 'Reference Name', defaultVisible: false },
  { key: 'email', label: 'Email', defaultVisible: false },
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
  { key: 'transportMode', label: 'Transport Mode', defaultVisible: false },
  { key: 'freightType', label: 'Freight Type', defaultVisible: false },
  { key: 'destination', label: 'Destination', defaultVisible: false },
  { key: 'poNumber', label: 'Po Number', defaultVisible: false },
  { key: 'quotationCopy', label: 'Quotation Copy', defaultVisible: false },
  { key: 'acceptanceCopy', label: 'Acceptance Copy', defaultVisible: false },
  { key: 'offerShow', label: 'Offer Show', defaultVisible: false },
  { key: 'conveyedForRegistration', label: 'Conveyed For Registration Form', defaultVisible: false },
  { key: 'totalOrderQty', label: 'Total Order Qty', defaultVisible: false },
  { key: 'amount', label: 'Amount **', defaultVisible: true },
  { key: 'totalDispatchQuantity', label: 'Total Dispatch', defaultVisible: false },
  { key: 'quantityDelivered', label: 'Quantity Delivered', defaultVisible: false },
  { key: 'orderCancel', label: 'Order Cancel', defaultVisible: false },
  { key: 'pendingDeliveryQty', label: 'Pending Delivery Qty', defaultVisible: false },
  { key: 'pendingDispatchQty', label: 'Pending Dispatch Qty', defaultVisible: false },
  { key: 'materialReturn', label: 'Material Return', defaultVisible: false },
  { key: 'deliveryStatus', label: 'Delivery Status', defaultVisible: false },
  { key: 'dispatchStatus', label: 'Dispatch Status', defaultVisible: false },
  { key: 'dispatchCompleteDate', label: 'Dispatch Complete Date', defaultVisible: false },
  { key: 'deliveryCompleteDate', label: 'Delivery Complete Date**', defaultVisible: false },
  { key: 'isOrderAcceptable', label: 'Is Order Acceptable?', defaultVisible: false },
  { key: 'orderAcceptanceChecklist', label: 'Order Acceptance Checklist', defaultVisible: false },
  { key: 'remark', label: 'Remark', defaultVisible: false },
  { key: 'availabilityStatus', label: 'Availability Status', defaultVisible: false },
  { key: 'remarks', label: 'Remarks', defaultVisible: false },
  { key: 'customerWantsMaterial', label: 'customer wants material as', defaultVisible: false },
  { key: 'createdBy', label: 'Created by', defaultVisible: false },
  { key: 'warehouseLocation', label: 'warehouse location', defaultVisible: false },
  { key: 'createIndent', label: 'create indent if not available', defaultVisible: false },
  { key: 'lineItemNumber', label: 'line item number', defaultVisible: false },
  { key: 'totalQty', label: 'total qty', defaultVisible: false },
  { key: 'materialReceivedLeadTime', label: 'Material received lead time', defaultVisible: false },
  { key: 'receivedDate', label: 'Received Date', defaultVisible: false },
  { key: 'approvalName', label: 'Approval Name', defaultVisible: false },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'date', label: 'Date', defaultVisible: true },
  { key: 'revenue', label: 'Revenue', defaultVisible: false }
]

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showColumnDropdown, setShowColumnDropdown] = useState(false)
  
  // Initialize visible columns with default visible ones
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaultVisible = ALL_COLUMNS.filter(col => col.defaultVisible).map(col => col.key)
    return new Set(defaultVisible)
  })

  // Function to normalize status for display and filtering
  const normalizeStatus = (status: string) => {
    if (!status) return "pending"
    const normalizedStatus = status.toLowerCase().trim()
    
    if (normalizedStatus === "complete" || normalizedStatus === "completed") {
      return "complete"
    } else if (normalizedStatus === "cancel" || normalizedStatus === "cancelled" || normalizedStatus === "order cancel") {
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
        return "bg-success/10 text-success border-success/30"
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/30"
      default:
        return "bg-warning/15 text-warning-foreground border-warning/30"
    }
  }

  // Function to get display text for status
  const getStatusDisplay = (status: string) => {
    const normalized = normalizeStatus(status)
    switch (normalized) {
      case "complete":
        return "Completed"
      case "cancelled":
        return "Cancelled"
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
    return ALL_COLUMNS.filter(col => visibleColumns.has(col.key))
  }, [visibleColumns])

  // Filtered and searched orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
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
  }, [orders, searchTerm, statusFilter])

  // Format amount
  const formatAmount = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount
    return isNaN(numAmount) ? '0' : numAmount.toLocaleString()
  }

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString()
    } catch {
      return 'Invalid Date'
    }
  }

  // Get cell value for any column
  const getCellValue = (order: Order, columnKey: string) => {
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
      default:
        return (order as any)[columnKey] || '-'
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-xs">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">All Orders</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Latest order activities ({filteredOrders.length} of {orders.length} orders)
        </p>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search by order number, company, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-sm border border-input rounded-md bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-sm border border-input rounded-md bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="complete">Completed</option>
            </select>
          </div>

          {/* Column Visibility Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="flex items-center gap-2 h-9 px-3 border border-input rounded-md text-sm text-foreground bg-card hover:bg-muted/40 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span>Columns</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            
            {showColumnDropdown && (
              <div className="absolute right-0 mt-1 w-80 bg-card border border-border rounded-md shadow-md z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Show/Hide Columns</h3>
                  <p className="text-xs text-muted-foreground mt-1">Select which columns to display in the table</p>
                </div>
                <div className="p-2">
                  {ALL_COLUMNS.map((column) => (
                    <label
                      key={column.key}
                      className="flex items-center gap-2 p-2 hover:bg-muted/40 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(column.key)}
                        onChange={() => toggleColumnVisibility(column.key)}
                        className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
                      />
                      <span className="text-sm text-foreground flex-1">{column.label}</span>
                      {visibleColumns.has(column.key) ? (
                        <Eye className="h-3 w-3 text-success" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </label>
                  ))}
                </div>
                <div className="p-3 border-t border-border bg-muted/40">
                  <div className="text-xs text-muted-foreground">
                    {visibleColumns.size} of {ALL_COLUMNS.length} columns visible
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/40">
            <tr>
              {visibleColumnsList.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnsList.length} className="px-6 py-8 text-center text-muted-foreground text-sm">
                  {orders.length === 0 ? "No orders found" : "No orders match your search criteria"}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order, index) => (
                <tr key={`${order.orderNo}-${index}`} className="hover:bg-muted/30">
                  {visibleColumnsList.map((column) => (
                    <td
                      key={column.key}
                      className="px-6 py-4 whitespace-nowrap text-sm text-foreground"
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
      
      {/* Results summary */}
      {(searchTerm || statusFilter !== "all") && (
        <div className="px-6 py-3 bg-muted/40 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {filteredOrders.length} of {orders.length} orders
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter !== "all" && ` with status "${statusFilter}"`}
          </p>
        </div>
      )}

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