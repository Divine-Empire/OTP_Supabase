"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface Order {
  id: string
  companyName: string
  contactPerson: string
  contactNumber: string
  poNumber: string
  paymentMode: string
  paymentTerms: string
  quantity: number
  transportMode: string
  destination: string
  amount: number
  status: string
  billingAddress?: string
  shippingAddress?: string
  freightType?: string
  quotationCopy?: string
  acceptanceCopy?: string
  conveyedForRegistration?: string
  ewayBillNumber?: string
  srnNumber?: string
  items?: Array<{ name: string; qty: number }>
  acceptanceData?: any
  inventoryData?: any
  approvalData?: any
  dispatchData?: any
  invoiceData?: any
  piData?: any
  warehouseData?: any
  materialRcvdData?: any
  calibrationData?: any
  serviceData?: any
  createdAt: string
  updatedAt: string
}

interface DataContextType {
  orders: Order[]
  addOrder: (order: Omit<Order, "id" | "createdAt" | "updatedAt">) => void
  updateOrder: (id: string, updates: Partial<Order>) => void
  getOrder: (id: string) => Order | undefined
  getOrdersByStatus: (status: string) => Order[]
  clearCache: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

const sampleOrders: Order[] = [
  {
    id: "ORD001",
    companyName: "Tech Solutions Ltd",
    contactPerson: "John Doe",
    contactNumber: "+91 9876543210",
    poNumber: "PO2024001",
    paymentMode: "Credit",
    paymentTerms: "30 Days",
    quantity: 5,
    transportMode: "Road",
    destination: "Mumbai",
    amount: 150000,
    status: "pending",
    billingAddress: "123 Tech Street, Andheri West, Mumbai - 400058, Maharashtra",
    shippingAddress: "123 Tech Street, Andheri West, Mumbai - 400058, Maharashtra",
    freightType: "Paid",
    quotationCopy: "Available",
    acceptanceCopy: "Available",
    conveyedForRegistration: "Yes",
    ewayBillNumber: "EWB001234567890",
    srnNumber: "SRN2024001",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ORD002",
    companyName: "Industrial Corp",
    contactPerson: "Jane Smith",
    contactNumber: "+91 9876543211",
    poNumber: "PO2024002",
    paymentMode: "Advance",
    paymentTerms: "15 Days",
    quantity: 3,
    transportMode: "Air",
    destination: "Delhi",
    amount: 200000,
    status: "accepted",
    billingAddress: "456 Industrial Area, Sector 18, Gurgaon - 122015, Haryana",
    shippingAddress: "789 Warehouse Complex, Sector 25, Gurgaon - 122022, Haryana",
    freightType: "To Pay",
    quotationCopy: "Available",
    acceptanceCopy: "Available",
    conveyedForRegistration: "No",
    ewayBillNumber: "EWB001234567891",
    srnNumber: "SRN2024002",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ORD003",
    companyName: "Engineering Solutions",
    contactPerson: "Mike Johnson",
    contactNumber: "+91 9876543212",
    poNumber: "PO2024003",
    paymentMode: "Credit",
    paymentTerms: "45 Days",
    quantity: 8,
    transportMode: "Road",
    destination: "Bangalore",
    amount: 350000,
    status: "inventory-checked",
    billingAddress: "789 Engineering Hub, Electronic City Phase 1, Bangalore - 560100, Karnataka",
    shippingAddress: "789 Engineering Hub, Electronic City Phase 1, Bangalore - 560100, Karnataka",
    freightType: "Paid",
    quotationCopy: "Available",
    acceptanceCopy: "Pending",
    conveyedForRegistration: "Yes",
    ewayBillNumber: "EWB001234567892",
    srnNumber: "SRN2024003",
    inventoryData: {
      availabilityStatus: "Available",
      remarks: "All items available in stock",
      processedAt: new Date().toISOString(),
      processedBy: "Inventory Manager",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ORD004",
    companyName: "Construction Ltd",
    contactPerson: "Sarah Wilson",
    contactNumber: "+91 9876543213",
    poNumber: "PO2024004",
    paymentMode: "Advance",
    paymentTerms: "Immediate",
    quantity: 12,
    transportMode: "Road",
    destination: "Pune",
    amount: 480000,
    status: "senior-approved",
    billingAddress: "321 Construction Plaza, Hinjewadi Phase 2, Pune - 411057, Maharashtra",
    shippingAddress: "654 Site Office, Wakad, Pune - 411057, Maharashtra",
    freightType: "To Pay",
    quotationCopy: "Available",
    acceptanceCopy: "Available",
    conveyedForRegistration: "Yes",
    ewayBillNumber: "EWB001234567893",
    srnNumber: "SRN2024004",
    inventoryData: {
      availabilityStatus: "Partial",
      partialDetails: "8 out of 12 items available",
      processedAt: new Date().toISOString(),
      processedBy: "Inventory Manager",
    },
    approvalData: {
      approvedBy: "Senior Manager",
      approvalDate: new Date().toISOString(),
      remarks: "Approved with conditions",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ORD005",
    companyName: "Precision Instruments",
    contactPerson: "David Brown",
    contactNumber: "+91 9876543214",
    poNumber: "PO2024005",
    paymentMode: "Credit",
    paymentTerms: "60 Days",
    quantity: 2,
    transportMode: "Air",
    destination: "Chennai",
    amount: 750000,
    status: "dispatch-processed",
    billingAddress: "555 Precision Park, OMR, Chennai - 600096, Tamil Nadu",
    shippingAddress: "555 Precision Park, OMR, Chennai - 600096, Tamil Nadu",
    freightType: "Paid",
    quotationCopy: "Available",
    acceptanceCopy: "Available",
    conveyedForRegistration: "Yes",
    ewayBillNumber: "EWB001234567894",
    srnNumber: "SRN2024005",
    dispatchData: {
      calibrationRequired: "YES",
      calibrationType: "LAB",
      installationRequired: "YES",
      items: [
        { name: "Precision Scale", qty: 1 },
        { name: "Calibration Kit", qty: 1 },
      ],
      processedAt: new Date().toISOString(),
      processedBy: "Dispatch Manager",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // Add new orders for calibration and service testing
  {
    id: "ORD006",
    companyName: "Lab Equipment Co",
    contactPerson: "Dr. Smith",
    contactNumber: "+91 9876543215",
    poNumber: "PO2024006",
    paymentMode: "Credit",
    paymentTerms: "30 Days",
    quantity: 1,
    transportMode: "Road",
    destination: "Hyderabad",
    amount: 450000,
    status: "material-received",
    billingAddress: "123 Lab Street, Hitech City, Hyderabad - 500081, Telangana",
    shippingAddress: "123 Lab Street, Hitech City, Hyderabad - 500081, Telangana",
    freightType: "Paid",
    quotationCopy: "Available",
    acceptanceCopy: "Available",
    conveyedForRegistration: "Yes",
    ewayBillNumber: "EWB001234567895",
    srnNumber: "SRN2024006",
    dispatchData: {
      calibrationRequired: "YES",
      calibrationType: "LAB",
      installationRequired: "YES",
      items: [{ name: "Laboratory Balance", qty: 1 }],
      processedAt: new Date().toISOString(),
      processedBy: "Dispatch Manager",
    },
    invoiceData: {
      invoiceNumber: "INV2024006",
      qty: 1,
      processedAt: new Date().toISOString(),
      processedBy: "Accounts",
    },
    piData: {
      piNumber: "PI2024006",
      processedAt: new Date().toISOString(),
      processedBy: "PI Manager",
    },
    warehouseData: {
      processedAt: new Date().toISOString(),
      processedBy: "Warehouse Manager",
    },
    materialRcvdData: {
      materialReceived: "yes",
      installationRequired: "YES",
      transporterFollowup: "Material delivered successfully",
      processedAt: new Date().toISOString(),
      processedBy: "Warehouse Staff",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ORD007",
    companyName: "Survey Solutions",
    contactPerson: "Engineer Patel",
    contactNumber: "+91 9876543216",
    poNumber: "PO2024007",
    paymentMode: "Advance",
    paymentTerms: "15 Days",
    quantity: 1,
    transportMode: "Road",
    destination: "Ahmedabad",
    amount: 850000,
    status: "material-received",
    billingAddress: "456 Survey Plaza, SG Highway, Ahmedabad - 380015, Gujarat",
    shippingAddress: "456 Survey Plaza, SG Highway, Ahmedabad - 380015, Gujarat",
    freightType: "Paid",
    quotationCopy: "Available",
    acceptanceCopy: "Available",
    conveyedForRegistration: "Yes",
    ewayBillNumber: "EWB001234567896",
    srnNumber: "SRN2024007",
    dispatchData: {
      calibrationRequired: "YES",
      calibrationType: "TOTAL STATION",
      installationRequired: "YES",
      items: [{ name: "Total Station Equipment", qty: 1 }],
      processedAt: new Date().toISOString(),
      processedBy: "Dispatch Manager",
    },
    invoiceData: {
      invoiceNumber: "INV2024007",
      qty: 1,
      processedAt: new Date().toISOString(),
      processedBy: "Accounts",
    },
    piData: {
      piNumber: "PI2024007",
      processedAt: new Date().toISOString(),
      processedBy: "PI Manager",
    },
    warehouseData: {
      processedAt: new Date().toISOString(),
      processedBy: "Warehouse Manager",
    },
    materialRcvdData: {
      materialReceived: "yes",
      installationRequired: "YES",
      transporterFollowup: "Equipment delivered and checked",
      processedAt: new Date().toISOString(),
      processedBy: "Warehouse Staff",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ORD008",
    companyName: "Construction Surveying Ltd",
    contactPerson: "Site Manager",
    contactNumber: "+91 9876543217",
    poNumber: "PO2024008",
    paymentMode: "Credit",
    paymentTerms: "45 Days",
    quantity: 2,
    transportMode: "Road",
    destination: "Kolkata",
    amount: 320000,
    status: "material-received",
    billingAddress: "789 Construction Hub, Salt Lake, Kolkata - 700091, West Bengal",
    shippingAddress: "789 Construction Hub, Salt Lake, Kolkata - 700091, West Bengal",
    freightType: "To Pay",
    quotationCopy: "Available",
    acceptanceCopy: "Available",
    conveyedForRegistration: "Yes",
    ewayBillNumber: "EWB001234567897",
    srnNumber: "SRN2024008",
    dispatchData: {
      calibrationRequired: "YES",
      calibrationType: "AUTOLEVEL",
      installationRequired: "NO",
      items: [{ name: "Auto Level Equipment", qty: 2 }],
      processedAt: new Date().toISOString(),
      processedBy: "Dispatch Manager",
    },
    invoiceData: {
      invoiceNumber: "INV2024008",
      qty: 2,
      processedAt: new Date().toISOString(),
      processedBy: "Accounts",
    },
    piData: {
      piNumber: "PI2024008",
      processedAt: new Date().toISOString(),
      processedBy: "PI Manager",
    },
    warehouseData: {
      processedAt: new Date().toISOString(),
      processedBy: "Warehouse Manager",
    },
    materialRcvdData: {
      materialReceived: "yes",
      installationRequired: "NO",
      transporterFollowup: "Equipment delivered successfully",
      processedAt: new Date().toISOString(),
      processedBy: "Warehouse Staff",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // Add order for Service Intimation testing
  {
    id: "ORD009",
    companyName: "Research Institute",
    contactPerson: "Dr. Kumar",
    contactNumber: "+91 9876543218",
    poNumber: "PO2024009",
    paymentMode: "Credit",
    paymentTerms: "30 Days",
    quantity: 1,
    transportMode: "Air",
    destination: "Bangalore",
    amount: 950000,
    status: "calibration-completed",
    billingAddress: "321 Research Park, Whitefield, Bangalore - 560066, Karnataka",
    shippingAddress: "321 Research Park, Whitefield, Bangalore - 560066, Karnataka",
    freightType: "Paid",
    quotationCopy: "Available",
    acceptanceCopy: "Available",
    conveyedForRegistration: "Yes",
    ewayBillNumber: "EWB001234567898",
    srnNumber: "SRN2024009",
    dispatchData: {
      calibrationRequired: "YES",
      calibrationType: "LAB",
      installationRequired: "YES",
      items: [{ name: "High Precision Scale", qty: 1 }],
      processedAt: new Date().toISOString(),
      processedBy: "Dispatch Manager",
    },
    invoiceData: {
      invoiceNumber: "INV2024009",
      qty: 1,
      processedAt: new Date().toISOString(),
      processedBy: "Accounts",
    },
    piData: {
      piNumber: "PI2024009",
      processedAt: new Date().toISOString(),
      processedBy: "PI Manager",
    },
    warehouseData: {
      processedAt: new Date().toISOString(),
      processedBy: "Warehouse Manager",
    },
    materialRcvdData: {
      materialReceived: "yes",
      installationRequired: "YES",
      transporterFollowup: "Equipment delivered and verified",
      processedAt: new Date().toISOString(),
      processedBy: "Warehouse Staff",
    },
    calibrationData: {
      section: "LAB",
      calibrationDate: "2024-01-15",
      calibrationPeriod: 12,
      dueDate: "2025-01-15",
      processedAt: new Date().toISOString(),
      processedBy: "Calibration Team",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ORD010",
    companyName: "Geodetic Surveys",
    contactPerson: "Survey Head",
    contactNumber: "+91 9876543219",
    poNumber: "PO2024010",
    paymentMode: "Advance",
    paymentTerms: "Immediate",
    quantity: 1,
    transportMode: "Road",
    destination: "Jaipur",
    amount: 720000,
    status: "calibration-completed",
    billingAddress: "654 Survey Center, Malviya Nagar, Jaipur - 302017, Rajasthan",
    shippingAddress: "654 Survey Center, Malviya Nagar, Jaipur - 302017, Rajasthan",
    freightType: "Paid",
    quotationCopy: "Available",
    acceptanceCopy: "Available",
    conveyedForRegistration: "Yes",
    ewayBillNumber: "EWB001234567899",
    srnNumber: "SRN2024010",
    dispatchData: {
      calibrationRequired: "YES",
      calibrationType: "TOTAL STATION",
      installationRequired: "YES",
      items: [{ name: "Advanced Total Station", qty: 1 }],
      processedAt: new Date().toISOString(),
      processedBy: "Dispatch Manager",
    },
    invoiceData: {
      invoiceNumber: "INV2024010",
      qty: 1,
      processedAt: new Date().toISOString(),
      processedBy: "Accounts",
    },
    piData: {
      piNumber: "PI2024010",
      processedAt: new Date().toISOString(),
      processedBy: "PI Manager",
    },
    warehouseData: {
      processedAt: new Date().toISOString(),
      processedBy: "Warehouse Manager",
    },
    materialRcvdData: {
      materialReceived: "yes",
      installationRequired: "YES",
      transporterFollowup: "Equipment delivered and inspected",
      processedAt: new Date().toISOString(),
      processedBy: "Warehouse Staff",
    },
    calibrationData: {
      section: "TOTAL STATION",
      calibrationDate: "2024-01-20",
      calibrationPeriod: 12,
      dueDate: "2025-01-20",
      processedAt: new Date().toISOString(),
      processedBy: "Calibration Team",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    const savedOrders = localStorage.getItem("otp-orders")
    if (savedOrders) {
      setOrders(JSON.parse(savedOrders))
    } else {
      setOrders(sampleOrders)
      localStorage.setItem("otp-orders", JSON.stringify(sampleOrders))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("otp-orders", JSON.stringify(orders))
  }, [orders])

  const addOrder = (orderData: Omit<Order, "id" | "createdAt" | "updatedAt">) => {
    const newOrder: Order = {
      ...orderData,
      id: `ORD${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setOrders((prev) => [...prev, newOrder])
  }

  const updateOrder = (id: string, updates: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === id ? { ...order, ...updates, updatedAt: new Date().toISOString() } : order)),
    )
  }

  const getOrder = (id: string) => {
    return orders.find((order) => order.id === id)
  }

  const getOrdersByStatus = (status: string) => {
    return orders.filter((order) => order.status === status)
  }

  const clearCache = () => {
    localStorage.removeItem("otp-orders")
    localStorage.removeItem("otp-cache")
    setOrders([])
  }

  return (
    <DataContext.Provider
      value={{
        orders,
        addOrder,
        updateOrder,
        getOrder,
        getOrdersByStatus,
        clearCache,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
