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
import { Trash2, RefreshCw, Search, Settings, Eye, ScanLine, ArrowLeftRight } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { mapCheckInventoryRowToUI } from "@/lib/otp-utils"
import { filterByCrmAccess, crmNameOptionsFrom } from "@/lib/crm-access"
import { QrScanner, parseItemQr } from "@/components/qr-scanner"
import { toast } from "@/components/ui/use-toast"
import { checkSerialWithIms } from "@/lib/ims"
import { MobileRecordCard } from "@/components/mobile-record-card"

// One row per distinct item (grouped by itemMatchKey), not per QR scan.
// Purchase-FMS-Supabase's serial format is "SN-<vendorCode>/<encodedDate>/<seq>"
// (see qr-scanner.tsx) — items that get an individually-numbered label (seq
// present, e.g. ".../001", ".../002") are usually countable physical units:
// each distinct serial scanned becomes its own sub-row under the item, and
// qty defaults to the count of those sub-rows. But Purchase-FMS-Supabase's
// Serial Generation also has a "No" (bulk) toggle that still stamps a
// numbered label (seq present) while that ONE label actually stands in for
// the whole lift's quantity (N units, one shared serial) — indistinguishable
// from a real per-unit serial by the label alone. So qty here is hand-editable
// for numbered items too (same as bulk), defaulting to the sub-row count;
// removing a sub-row (a bad scan) still recomputes it back to that count.
// Items whose label has no per-unit sequence (seq empty, e.g. ".../BF0GAF/")
// aren't individually serialized — re-scanning the same label just
// re-confirms the same item, so there are no sub-rows and qty is filled in
// by hand from the start.
interface ScanRow {
  itemName: string
  itemCode: string
  qty: string
  serials: string[] // numbered sub-rows for this item; empty for a non-serialized (bulk) item
}

// Accessories aren't part of the order's own item list -- they're
// Purchase-FMS-Supabase items too (same QR format/QrScanner), just scanned
// separately and kept as a summary count only (name + qty, no serial
// traceability -- see OTP_Supabase/Database/48_item_description_and_accessories_column.sql).
interface AccessoryScanRow {
  itemName: string
  itemCode: string
  qty: number
}

// The trailing segment of the serial (after the last "/") is the per-unit
// sequence number. Present -> this label uniquely identifies one physical
// unit. Empty -> the label is shared across the whole batch/bulk item.
function isNumberedSerial(serialNo: string): boolean {
  const lastSegment = serialNo.split("/").pop() || ""
  return lastSegment.trim() !== ""
}

// Per-item compare result: order's expected qty vs what got scanned+entered.
interface CompareItem {
  itemCode: string
  itemName: string
  orderedQty: number
  scannedQty: number
  shortageQty: number
  serials: string[] // carried through from the matching ScanRow, for traceability in otp_check_inventory.items
  shortageLedgerId?: string // present only on a "repeat" scan — which otp_check_inventory_shortage row this item addresses
  // Cross-order qty another order's Pre-Invoice step freed up for this same
  // item name (see Database/55_otp_released_stock.sql) — informational only,
  // never auto-added to scannedQty or subtracted from shortageQty.
  releasedStockAvailable?: { qty: number; fromOrderNo: string }[]
}

// Shared key for matching a scanned item against an order's item list.
//
// item_code is NOT a reliable match key here, even when it looks present
// and valid on both sides: otp_orders.items.item_code is resolved from
// lto_items (Lead-To-Order's own catalog), while the QR's item_code comes
// from Purchase-FMS-Supabase's separate, unsynced item master — two
// independent catalogs that don't share codes for the same physical item
// (confirmed: lto_items has "ManiQuip-BAR BENDING MACHINE MQB-52 PRO" as
// BTH12553, while Purchase-FMS-Supabase has no code for it at all, so its
// QR carries the literal placeholder "N/A" — see qr-scanner.tsx). Matching
// by code was previously the default, with a fallback to name only when
// one side's code was missing/"N/A" — but that still fails the moment
// exactly one side happens to have a real (just different-system) code,
// which is the common case, not the exception.
//
// item_name is the only field both systems populate consistently for the
// same item, so it's the sole match key. Used by both the scan-time
// belongs-to-this-order check and the compare-time qty grouping so they
// can't drift apart again.
function itemMatchKey(name?: string | null) {
  return (name || "").trim().toLowerCase()
}

// Scan-in-progress draft persistence — so an accidental tab close/browser
// crash mid-scan doesn't force starting over from zero. Keyed by order +
// username (not just order) so a shared warehouse PC doesn't leak one
// user's in-progress scan into another's session. Device/browser-local
// only, by design — there's no server-side draft table, nothing to clean
// up there, and switching devices simply starts fresh (acceptable: the
// alternative, a synced server draft, is a much bigger feature for a
// problem this already fully solves).
const DRAFT_TTL_MS = 48 * 60 * 60 * 1000 // 48h — old enough to be stale, not so old it surprises someone
function draftKey(orderId: string, username: string) {
  return `packing-list-draft:${orderId}:${username}`
}
function saveDraft(orderId: string, username: string, scanRows: ScanRow[], accessoryScanRows: AccessoryScanRow[]) {
  try {
    if (scanRows.length === 0 && accessoryScanRows.length === 0) {
      localStorage.removeItem(draftKey(orderId, username))
      return
    }
    localStorage.setItem(
      draftKey(orderId, username),
      JSON.stringify({ savedAt: Date.now(), scanRows, accessoryScanRows })
    )
  } catch {
    // Storage full/unavailable (private browsing etc.) — the scan itself
    // still works, it just won't survive a crash. Not worth surfacing.
  }
}
function loadDraft(orderId: string, username: string): { scanRows: ScanRow[]; accessoryScanRows: AccessoryScanRow[] } | null {
  try {
    const raw = localStorage.getItem(draftKey(orderId, username))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(draftKey(orderId, username))
      return null
    }
    return { scanRows: parsed.scanRows || [], accessoryScanRows: parsed.accessoryScanRows || [] }
  } catch {
    return null
  }
}
function clearDraft(orderId: string, username: string) {
  try {
    localStorage.removeItem(draftKey(orderId, username))
  } catch {
    // ignore
  }
}



// Column definitions for Pending tab — same base columns as Order Acceptable
// (stage-1-specific columns like isOrderAcceptable/orderAcceptanceChecklist/
// remarks and the never-implemented dispatch/delivery columns are dropped;
// this stage's own outcome columns are added in historyColumns below).
const pendingColumns = [
  { key: "actions", label: "Actions", searchable: false },
  { key: "status", label: "Status", searchable: true },
  { key: "timestamp", label: "Timestamp", searchable: true },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "crmName", label: "CRM Name", searchable: true },
  { key: "quotationNo", label: "Quotation No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "contactPersonName", label: "Contact Person Name", searchable: true },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "billingAddress", label: "Billing Address", searchable: true },
  { key: "shippingAddress", label: "Shipping Address", searchable: true },
  { key: "paymentMode", label: "Payment Mode", searchable: true },
  { key: "paymentTerms", label: "Payment Terms(In Days)", searchable: true },
  { key: "itemList", label: "Item List", searchable: false },
  { key: "transportMode", label: "Transport Mode", searchable: true },
  { key: "destination", label: "Destination", searchable: true },
  { key: "poNumber", label: "Po Number", searchable: true },
  { key: "quotationCopy", label: "Quotation Copy", searchable: true },
  { key: "acceptanceCopy", label: "Acceptance Copy", searchable: true },
  { key: "offerShow", label: "Offer Show", searchable: true },
  { key: "conveyedForRegistration", label: "Conveyed For Registration Form", searchable: true },
  { key: "totalOrderQty", label: "Total Order Qty", searchable: true },
  { key: "amount", label: "Amount", searchable: true },
  { key: "planned", label: "Planned", searchable: true },
]

// Column definitions for History tab — base columns + this stage's own outcome
const historyColumns = [
  ...pendingColumns.filter((col) => col.key !== "actions"),
  { key: "availabilityStatus", label: "Availability Status", searchable: true },
  { key: "inventoryRemarks", label: "Remarks", searchable: true },
  { key: "accessories", label: "Accessories", searchable: true },
  { key: "actual", label: "Actual", searchable: true },
  { key: "overResolvedItems", label: "Quotation Mismatch", searchable: false },
]

export default function CheckInventoryPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [processedOrders, setProcessedOrders] = useState<any[]>([])
  const [processedLoading, setProcessedLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Scan -> Compare -> Preview flow
  const [dialogStep, setDialogStep] = useState<"scan" | "preview">("scan")
  const [scanRows, setScanRows] = useState<ScanRow[]>([])
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [accessoryScanRows, setAccessoryScanRows] = useState<AccessoryScanRow[]>([])
  const [accessoryScannerError, setAccessoryScannerError] = useState<string | null>(null)
  const [compareItems, setCompareItems] = useState<CompareItem[]>([])

  // Manual Entry States
  const [manualEntryMode, setManualEntryMode] = useState<"item" | "accessory" | null>(null)
  const [manualSearchQuery, setManualSearchQuery] = useState("")
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([])
  const [manualSearchOpen, setManualSearchOpen] = useState(false)
  const [manualSelectedName, setManualSelectedName] = useState("")
  // Only ever populated by clicking a search-result row (not free typing) —
  // used for accessories, which have no order-item record to look a code up
  // from. Order items resolve their own code from the order's own item
  // list instead (see handleAddManualItem), since that's already more
  // reliable (resolved server-side via lto_items in enrichOrderItemsWithCode).
  const [manualSelectedItemCode, setManualSelectedItemCode] = useState("")
  const [manualHasSerial, setManualHasSerial] = useState(false)
  const [manualQty, setManualQty] = useState("1")
  const [manualSerials, setManualSerials] = useState<string[]>([""])

  useEffect(() => {
    if (!manualSearchQuery) {
      setManualSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/otp-supabase/lto-items?search=${encodeURIComponent(manualSearchQuery)}`)
        const data = await res.json()
        if (data.success) {
          setManualSearchResults(data.data)
          setManualSearchOpen(true)
        }
      } catch (err) {
        console.error("Search error", err)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [manualSearchQuery])

  const [computedStatus, setComputedStatus] = useState<"Available" | "Not Available" | "Partial" | "">("")
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewOrder, setViewOrder] = useState<any>(null)
  const [itemListDialogOpen, setItemListDialogOpen] = useState(false)
  const [itemListDialogItems, setItemListDialogItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState("pending")
  const [selectedColumn, setSelectedColumn] = useState("all")
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all")
  const [crmNameFilter, setCrmNameFilter] = useState<string>("all")
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Offer Show / Conveyed For Registration Form are hidden by default (still
  // toggleable via Column Visibility) — everything else starts visible.
  const DEFAULT_HIDDEN_COLUMNS = new Set(["offerShow", "conveyedForRegistration"])
  const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: !DEFAULT_HIDDEN_COLUMNS.has(col.key) }), {})
  )
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: !DEFAULT_HIDDEN_COLUMNS.has(col.key) }), {})
  )

  const { user: currentUser } = useAuth()
  const [subGodown, setSubGodown] = useState("")
  const [subGodownOptions, setSubGodownOptions] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/otp-supabase/dropdowns?category=sub_godown")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setSubGodownOptions(json.data.map((d: { value: string }) => d.value))
        }
      })
      .catch((err) => console.error("Failed to load sub-godown options:", err))
  }, [])

  // Fetch pending orders from Supabase API
  const fetchOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/otp-supabase/packing-list?status=pending")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        const ordersData = result.data.map(mapCheckInventoryRowToUI)
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
      const response = await fetch("/api/otp-supabase/packing-list?status=history")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        return result.data.map(mapCheckInventoryRowToUI)
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

  // Autosave the in-progress scan to localStorage — see saveDraft's comment
  // above itemMatchKey. Only while the dialog is actually open (so closing
  // via Cancel, with nothing scanned, doesn't write an empty draft over a
  // previously-restored one before the user's had a chance to act).
  useEffect(() => {
    if (!isDialogOpen || !selectedOrder) return
    const orderId = selectedOrder.orderId || selectedOrder.id
    if (!orderId) return
    saveDraft(orderId, currentUser?.username || "shared", scanRows, accessoryScanRows)
  }, [isDialogOpen, selectedOrder, scanRows, accessoryScanRows, currentUser?.username])

  // Role-based access: 'user' role only sees rows whose crmName is in their
  // assignedCrmNames (Settings > User Management) — see lib/crm-access.ts.
  // admin is unrestricted.

  // Update the filteredOrders useMemo to include role-based filtering
  const filteredOrders = useMemo(() => {
    let filtered = filterByCrmAccess(orders, currentUser);

    if (crmNameFilter !== "all") {
      filtered = filtered.filter((order) => order.crmName === crmNameFilter)
    }

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
  }, [orders, searchTerm, selectedColumn, currentUser, crmNameFilter])

  // Filter orders based on status (pre-filtered by fetchOrders)
  const pendingOrders = filteredOrders;

  const crmNameOptions = useMemo(
    () => crmNameOptionsFrom(filterByCrmAccess(orders, currentUser)),
    [orders, currentUser]
  )

  // Filter processed orders based on search term
  // Update the filteredProcessedOrders useMemo
  const filteredProcessedOrders = useMemo(() => {
    let filtered = filterByCrmAccess(processedOrders, currentUser);

    if (crmNameFilter !== "all") {
      filtered = filtered.filter((order) => order.crmName === crmNameFilter)
    }

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
  }, [processedOrders, searchTerm, selectedColumn, availabilityFilter, currentUser, crmNameFilter]);

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



  const handleProcess = (order: any) => {
    setSelectedOrder(order)
    setDialogStep("scan")

    const orderId = order.orderId || order.id
    const username = currentUser?.username || "shared"
    const draft = orderId ? loadDraft(orderId, username) : null
    setScanRows(draft?.scanRows || [])
    setAccessoryScanRows(draft?.accessoryScanRows || [])
    if (draft) {
      toast({
        title: "Draft restored",
        description: `${draft.scanRows.length} item(s) and ${draft.accessoryScanRows.length} accessor${draft.accessoryScanRows.length === 1 ? "y" : "ies"} from your last unsaved scan were restored.`,
      })
    }

    setScannerError(null)
    setAccessoryScannerError(null)
    setCompareItems([])
    setComputedStatus("")
    setManualEntryMode(null)
    setManualSearchQuery("")
    setManualSelectedName("")
    setManualSelectedItemCode("")
    setManualHasSerial(false)
    setManualQty("1")
    setManualSerials([""])
    setSubGodown(currentUser?.defaultGodown || "")
    setIsDialogOpen(true)
  }

  const handleAddManualItem = () => {
    if (!manualSelectedName.trim()) {
      toast({ title: "Error", description: "Item name is required", variant: "destructive" })
      return
    }
    const qtyNum = parseInt(manualQty) || 0
    if (qtyNum <= 0) {
      toast({ title: "Error", description: "Qty must be greater than 0", variant: "destructive" })
      return
    }
  
    if (manualEntryMode === "item") {
      const orderItems: any[] = selectedOrder?.rawItems || []
      const scannedKey = itemMatchKey(manualSelectedName)
      const matchedOrderItem = orderItems.find((it) => itemMatchKey(it.item_name) === scannedKey)
      if (!matchedOrderItem) {
        toast({ title: "Item not in order", description: `"${manualSelectedName}" is not part of this order's item list.`, variant: "destructive" })
        return
      }

      setScanRows(prev => {
        const key = itemMatchKey(manualSelectedName)
        const groupIndex = prev.findIndex((g) => itemMatchKey(g.itemName) === key)
        const validSerials = manualHasSerial ? manualSerials.filter(s => s.trim() !== "") : []

        if (groupIndex === -1) {
          return [...prev, {
            itemName: manualSelectedName,
            itemCode: matchedOrderItem.item_code || "Manual",
            qty: String(qtyNum),
            serials: validSerials
          }]
        }
        
        const group = prev[groupIndex]
        const mergedSerials = Array.from(new Set([...group.serials, ...validSerials]))
        const next = [...prev]
        next[groupIndex] = {
          ...group,
          serials: mergedSerials,
          qty: String((parseInt(group.qty) || 0) + qtyNum)
        }
        return next
      })
    } else {
      // Accessory
      setAccessoryScanRows(prev => {
        const key = itemMatchKey(manualSelectedName)
        const index = prev.findIndex((r) => itemMatchKey(r.itemName) === key)
        if (index === -1) {
          return [...prev, { itemName: manualSelectedName, itemCode: manualSelectedItemCode || "Manual", qty: qtyNum }]
        }
        const next = [...prev]
        next[index] = { ...next[index], qty: next[index].qty + qtyNum }
        return next
      })
    }
  
    // Reset
    setManualEntryMode(null)
    setManualSearchQuery("")
    setManualSelectedName("")
    setManualSelectedItemCode("")
    setManualHasSerial(false)
    setManualQty("1")
    setManualSerials([""])
  }

  // Each QR scan appends one row (one physical unit's serial); the same
  // serial scanned twice is ignored rather than double-counted. Qty per row
  // is filled in by hand afterwards — scan count itself is not the qty.
  // Rejects anything not on this order's own item list (see itemMatchKey).
  const handleQrScan = (raw: string) => {
    const parsed = parseItemQr(raw)
    if (!parsed) {
      setScannerError(`Unrecognized QR: "${raw.slice(0, 60)}"`)
      return
    }

    const orderItems: any[] = selectedOrder?.rawItems || []
    const scannedKey = itemMatchKey(parsed.itemName)
    const belongsToOrder = orderItems.some((it) => itemMatchKey(it.item_name) === scannedKey)

    if (!belongsToOrder) {
      const message = `"${parsed.itemName}" (${parsed.itemCode}) is not part of this order's item list — scan rejected.`
      setScannerError(message)
      toast({ title: "Item not in order", description: message, variant: "destructive" })
      return
    }

    setScannerError(null)
    const key = itemMatchKey(parsed.itemName)
    const numbered = isNumberedSerial(parsed.serialNo)

    // Set from inside the updater (only on an actual new-serial addition,
    // never on a duplicate-scan ignore) so the IMS check below only fires
    // once per physical unit.
    let isNewSerialScan = false

    setScanRows((prev) => {
      const groupIndex = prev.findIndex((g) => itemMatchKey(g.itemName) === key)

      if (groupIndex === -1) {
        // First scan of this item.
        isNewSerialScan = numbered
        const newGroup: ScanRow = {
          itemName: parsed.itemName,
          itemCode: parsed.itemCode,
          qty: numbered ? "1" : "",
          serials: numbered ? [parsed.serialNo] : [],
        }
        return [...prev, newGroup]
      }

      const group = prev[groupIndex]
      if (!numbered) return prev // bulk item re-scanned — already have this item's row, nothing to add

      if (group.serials.includes(parsed.serialNo)) return prev // same physical unit scanned twice — ignore

      isNewSerialScan = true
      const serials = [...group.serials, parsed.serialNo]
      const next = [...prev]
      next[groupIndex] = { ...group, serials, qty: String(serials.length) }
      return next
    })

    // Best-effort, non-blocking: ask IMS whether older warranty/invoice-dated
    // stock of this item is still available, and let it record the OUT
    // event on its side. Never blocks or fails this scan either way.
    if (isNewSerialScan) {
      checkSerialWithIms({
        serialNo: parsed.serialNo,
        locationLabel: null,
        itemCode: parsed.itemCode,
        itemName: parsed.itemName,
        source: "otp-check-inventory",
        referenceNo: selectedOrder?.orderNo,
      }).then((result) => {
        if (result?.alert) {
          toast({ title: "IMS Stock Alert", description: result.alert, variant: "destructive" })
        }
      })
    }
  }

  // Accessories aren't checked against the order's item list (there's no
  // baseline to belong to) -- any valid Purchase-FMS-Supabase QR is
  // accepted. No serial traceability, just a running per-item scan count.
  const handleAccessoryQrScan = (raw: string) => {
    const parsed = parseItemQr(raw)
    if (!parsed) {
      setAccessoryScannerError(`Unrecognized QR: "${raw.slice(0, 60)}"`)
      return
    }

    setAccessoryScannerError(null)
    const key = itemMatchKey(parsed.itemName)

    setAccessoryScanRows((prev) => {
      const index = prev.findIndex((r) => itemMatchKey(r.itemName) === key)
      if (index === -1) {
        return [...prev, { itemName: parsed.itemName, itemCode: parsed.itemCode, qty: 1 }]
      }
      const next = [...prev]
      next[index] = { ...next[index], qty: next[index].qty + 1 }
      return next
    })
  }

  const updateAccessoryQty = (index: number, qty: string) => {
    setAccessoryScanRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, qty: Math.max(Number(qty) || 0, 0) } : r))
    )
  }

  const removeAccessoryRow = (index: number) => {
    setAccessoryScanRows((prev) => prev.filter((_, i) => i !== index))
  }

  // Bulk items' qty can't come from a scan count, so it's typed in by hand.
  // Numbered items default to the serial sub-row count but call this too —
  // see the ScanRow comment above for why their qty still needs hand-editing
  // (a "No"-mode bulk lift's one shared numbered label covers N units, not 1).
  const updateScanRowQty = (index: number, qty: string) => {
    setScanRows((prev) => prev.map((r, i) => (i === index ? { ...r, qty } : r)))
  }

  // Removes an entire item row (bulk items, which have no sub-rows to peel off).
  const removeScanRow = (index: number) => {
    setScanRows((prev) => prev.filter((_, i) => i !== index))
  }

  // Removes one scanned serial from a numbered item's row and recomputes
  // its qty; if that was the last serial, the whole row goes with it.
  const removeScanSerial = (groupIndex: number, serialIndex: number) => {
    setScanRows((prev) => {
      const group = prev[groupIndex]
      if (!group) return prev
      const serials = group.serials.filter((_, i) => i !== serialIndex)
      if (serials.length === 0) return prev.filter((_, i) => i !== groupIndex)
      const next = [...prev]
      next[groupIndex] = { ...group, serials, qty: String(serials.length) }
      return next
    })
  }

  // Groups scanned rows by item_code, sums their qty, and compares against
  // the order's expected item list -> per-item shortage breakdown +
  // overall status. Moves the dialog into the editable preview step.
  //
  // Must use the same "is this code actually usable" rule as handleQrScan's
  // belongsToOrder check above — a bare `it.item_code || it.item_name` was
  // treating the literal "N/A" placeholder (unregistered items in
  // Purchase-FMS-Supabase's item master — see qr-scanner.tsx) as a real,
  // matchable code, so a scanned row keyed "N/A" never matched an order
  // item keyed by its real code and silently compared as 0 scanned.
  const handleCompare = () => {
    const scannedByCode = new Map<string, { qty: number; serials: string[] }>()
    for (const row of scanRows) {
      const key = itemMatchKey(row.itemName)
      const existing = scannedByCode.get(key)
      scannedByCode.set(key, {
        qty: (existing?.qty || 0) + (Number(row.qty) || 0),
        serials: [...(existing?.serials || []), ...row.serials],
      })
    }

    const orderItems: any[] = selectedOrder?.rawItems || []
    const items: CompareItem[] = orderItems.map((it) => {
      const key = itemMatchKey(it.item_name)
      const ordered = Number(it.quantity) || 0
      const matched = scannedByCode.get(key)
      const scanned = matched?.qty || 0
      return {
        itemCode: it.item_code || "",
        itemName: it.item_name,
        orderedQty: ordered,
        scannedQty: scanned,
        shortageQty: Math.max(ordered - scanned, 0),
        serials: matched?.serials || [],
        shortageLedgerId: it.shortageLedgerId,
        releasedStockAvailable: it.releasedStockAvailable || [],
      }
    })

    const totalShortage = items.reduce((s, it) => s + it.shortageQty, 0)
    const totalScanned = items.reduce((s, it) => s + it.scannedQty, 0)
    const status = totalShortage === 0 ? "Available" : totalScanned === 0 ? "Not Available" : "Partial"

    setCompareItems(items)
    setComputedStatus(status)
    setDialogStep("preview")
  }

  // Editable in the preview step — adjusting scannedQty recomputes that
  // item's shortageQty and the overall computed status.
  const updateCompareItemQty = (index: number, scannedQty: string) => {
    setCompareItems((prev) => {
      const updated = prev.map((it, i) => {
        if (i !== index) return it
        const scanned = Math.max(Number(scannedQty) || 0, 0)
        return { ...it, scannedQty: scanned, shortageQty: Math.max(it.orderedQty - scanned, 0) }
      })
      const totalShortage = updated.reduce((s, it) => s + it.shortageQty, 0)
      const totalScanned = updated.reduce((s, it) => s + it.scannedQty, 0)
      setComputedStatus(totalShortage === 0 ? "Available" : totalScanned === 0 ? "Not Available" : "Partial")
      return updated
    })
  }

  const handleSubmit = async () => {
    if (!selectedOrder || compareItems.length === 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      const orderNo = selectedOrder.orderNo || selectedOrder.id

      // Submits Stage 2 (Packing List) — inserts a row into
      // otp_check_inventory (one per scan attempt now, new or repeat),
      // queues whatever's available into otp_pre_invoice_queue, and routes
      // any shortage to either Indent Creation (first time for this order)
      // or straight back into this same Pending tab as a "repeat" via
      // otp_check_inventory_shortage — see packing-list/route.ts.
      const response = await fetch("/api/otp-supabase/packing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.orderId || selectedOrder.id,
          items: compareItems.map((it) => ({
            item_code: it.itemCode,
            item_name: it.itemName,
            ordered_qty: it.orderedQty,
            scanned_qty: it.scannedQty,
            serials: it.serials,
            shortageLedgerId: it.shortageLedgerId,
          })),
          accessories: accessoryScanRows.map((r) => ({ item_name: r.itemName, quantity: r.qty })),
          createdBy: currentUser?.fullName || currentUser?.username || "Admin",
          subGodown: subGodown || null,
        }),
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error || "Update failed")

      clearDraft(selectedOrder.orderId || selectedOrder.id, currentUser?.username || "shared")
      setIsDialogOpen(false)
      setSelectedOrder(null)

      await fetchOrders()

      alert(`Inventory check for order ${orderNo} updated successfully — ${result.availabilityStatus}`)
    } catch (err: any) {
      console.error("Submission error:", err)
      alert(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleView = (order: any) => {
    setViewOrder(order)
    setViewDialogOpen(true)
  }

  const handleViewItemList = (order: any) => {
    setItemListDialogItems(order.rawItems || [])
    setItemListDialogOpen(true)
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
      case "availabilityStatus":
        return (
          <Badge variant={value === "Available" ? "default" : value === "Not Available" ? "destructive" : "secondary"}>
            {value || "N/A"}
          </Badge>
        )
      case "status":
        return (
          <Badge variant={value === "Updated" ? "destructive" : value === "Repeat" ? "secondary" : "default"}>
            {value || "New"}
          </Badge>
        )
      case "billingAddress":
      case "shippingAddress":
      case "inventoryRemarks":
        return <div className="max-w-[200px] whitespace-normal break-words">{value}</div>
      case "overResolvedItems": {
        const items: string[] = Array.isArray(value) ? value : []
        if (items.length === 0) return ""
        return (
          <div className="max-w-[220px]">
            <Badge variant="destructive" className="mb-1">
              ⚠ Quotation changed
            </Badge>
            <p className="text-xs text-muted-foreground whitespace-normal break-words">
              {items.join(", ")} — now wants less than what's already been processed. Can't auto-reconcile; manual
              review needed.
            </p>
          </div>
        )
      }
      default:
        return value || ""
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading orders...</span>
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
      <div className="p-2 h-[calc(100vh-5rem)] md:h-[calc(100vh-5.5rem)] flex flex-col">
        <Tabs
          value={currentTab}
          onValueChange={(value) => setCurrentTab(value)}
          className="flex-1 flex flex-col min-h-0"
        >
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="border-b py-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
                  <TabsTrigger value="history" onClick={handleProcessedTabClick}>
                    History ({filteredProcessedOrders.length})
                  </TabsTrigger>
                </TabsList>

                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Select value={crmNameFilter} onValueChange={setCrmNameFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
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
                  {currentTab === "history" && (
                    <Select
                      value={availabilityFilter}
                      onValueChange={setAvailabilityFilter}
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Not Available">Not Available</SelectItem>
                        <SelectItem value="Partial">Partial</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button onClick={fetchOrders} variant="outline" size="sm" className="flex-1 sm:flex-initial">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
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
                          onClick={currentTab === "pending" ? showAllPendingColumns : showAllHistoryColumns}
                        >
                          Show All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={currentTab === "pending" ? hideAllPendingColumns : hideAllHistoryColumns}
                        >
                          Hide All
                        </Button>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="p-2 space-y-2">
                        {(currentTab === "pending" ? pendingColumns : historyColumns).map((column) => {
                          const visibleCols = currentTab === "pending" ? visiblePendingColumns : visibleHistoryColumns;
                          const toggleCol = currentTab === "pending" ? togglePendingColumn : toggleHistoryColumn;
                          return (
                            <div key={column.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={`col-${column.key}`}
                                checked={visibleCols[column.key]}
                                onCheckedChange={() => toggleCol(column.key)}
                              />
                              <Label htmlFor={`col-${column.key}`} className="text-sm">
                                {column.label}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 min-h-0 flex flex-col">
              <TabsContent value="pending" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
                <div className="md:hidden space-y-3 overflow-y-auto flex-1">
                  {pendingOrders.map((order, idx) => (
                    <MobileRecordCard
                      key={order.id || order.orderId || order.orderNo || idx}
                      columns={pendingColumns}
                      visibleColumns={visiblePendingColumns}
                      record={order}
                      renderCellContent={renderCellContent}
                      previewCount={6}
                    />
                  ))}
                  {pendingOrders.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm
                        ? "No orders match your search criteria"
                        : "No pending orders found"}
                    </p>
                  )}
                </div>

                <div className="hidden md:flex flex-col flex-1 min-h-0 border rounded-lg overflow-hidden relative">
                  <div className="overflow-auto flex-1 min-h-0">
                    <Table className="w-full relative">
                      <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                        <TableRow>
                          {pendingColumns
                            .filter((col) => visiblePendingColumns[col.key])
                            .map((column) => (
                              <TableHead
                                key={column.key}
                                className="bg-gray-50 font-semibold text-gray-900 px-4 py-3 whitespace-nowrap"
                                style={{
                                  minWidth: column.key === 'actions' ? '120px' :
                                    column.key === 'itemList' ? '130px' :
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
                                }}
                              >
                                {column.label}
                              </TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>
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
                                    minWidth: column.key === 'actions' ? '120px' :
                                      column.key === 'itemList' ? '130px' :
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
                                : "No pending orders found"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
                {processedLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading processed orders...</span>
                  </div>
                ) : (
                  <>
                    <div className="md:hidden space-y-3 overflow-y-auto flex-1">
                      {filteredProcessedOrders.map((order, idx) => (
                        <MobileRecordCard
                          key={order.id || order.orderId || order.orderNo || idx}
                          columns={historyColumns}
                          visibleColumns={visibleHistoryColumns}
                          record={order}
                          renderCellContent={renderCellContent}
                          previewCount={6}
                        />
                      ))}
                      {filteredProcessedOrders.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          {searchTerm ? "No orders match your search criteria" : "No processed orders found"}
                        </p>
                      )}
                    </div>

                    <div className="hidden md:flex flex-col flex-1 min-h-0 border rounded-lg overflow-hidden relative">
                      <div className="overflow-auto flex-1 min-h-0">
                        <Table className="w-full relative">
                          <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                            <TableRow>
                              {historyColumns
                                .filter((col) => visibleHistoryColumns[col.key])
                                .map((column) => (
                                  <TableHead
                                    key={column.key}
                                    className="bg-gray-50 font-semibold text-gray-900 px-4 py-3 whitespace-nowrap"
                                    style={{
                                      minWidth: column.key === 'orderNo' ? '120px' :
                                        column.key === 'itemList' ? '130px' :
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
                                    }}
                                  >
                                    {column.label}
                                  </TableHead>
                                ))}
                            </TableRow>
                          </TableHeader>
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
                                        minWidth: column.key === 'orderNo' ? '120px' :
                                          column.key === 'itemList' ? '130px' :
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
                  </>
                )}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        {/* Process Dialog — Scan -> Compare -> Preview/Edit -> Submit */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{dialogStep === "scan" ? "Scan Items" : "Review & Confirm"}</DialogTitle>
              <DialogDescription>
                {dialogStep === "scan"
                  ? "Scan each item's QR label, then enter its qty."
                  : "Check the availability breakdown, edit any qty if needed, then submit."}
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

              {dialogStep === "scan" && (
                <>
                  <div className="space-y-2">
                    <Label>
                      {selectedOrder?.scanType === "repeat"
                        ? "Outstanding Shortage Items (reference — what to recheck in the warehouse)"
                        : selectedOrder?.scanType === "updated"
                          ? "Quotation Changed — New/Increased Items (reference — recheck just these)"
                          : "Order Items (reference — what to pull from the warehouse)"}
                    </Label>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="font-semibold">Item Name</TableHead>
                            <TableHead className="font-semibold text-right">Ordered Qty</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedOrder?.rawItems || []).map((it: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{it.item_name}</TableCell>
                              <TableCell className="text-right">{it.quantity}</TableCell>
                              <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap">{it.description || ""}</TableCell>
                            </TableRow>
                          ))}
                          {(selectedOrder?.rawItems || []).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">
                                No items on this order
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <QrScanner onScan={handleQrScan} onError={setScannerError} />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setManualEntryMode("item")
                        setManualSearchQuery("")
                        setManualSelectedName("")
                        setManualSelectedItemCode("")
                        setManualHasSerial(false)
                        setManualQty("1")
                        setManualSerials([""])
                      }}
                    >
                      Add Item Manually
                    </Button>
                  </div>
                  {scannerError && <p className="text-sm text-destructive">{scannerError}</p>}

                  {manualEntryMode === "item" && (
                    <div className="border p-4 rounded-md space-y-4 bg-muted/30">
                      <div className="flex justify-between items-center">
                        <Label className="text-base">Manual Item Entry</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setManualEntryMode(null)}>Cancel</Button>
                      </div>
                      <div className="relative">
                        <Input
                          placeholder="Search item name or code..."
                          value={manualSearchQuery}
                          onChange={(e) => {
                            setManualSearchQuery(e.target.value)
                            setManualSelectedName(e.target.value)
                            setManualSelectedItemCode("")
                          }}
                          onFocus={() => { if (manualSearchResults.length > 0) setManualSearchOpen(true) }}
                          onBlur={() => setTimeout(() => setManualSearchOpen(false), 200)}
                        />
                        {manualSearchOpen && manualSearchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                            {manualSearchResults.map((res, i) => (
                              <div
                                key={i}
                                className="p-2 hover:bg-gray-100 cursor-pointer text-sm flex justify-between gap-2"
                                onMouseDown={() => {
                                  setManualSearchQuery(res.item_name)
                                  setManualSelectedName(res.item_name)
                                  setManualSelectedItemCode(res.item_code || "")
                                  setManualSearchOpen(false)
                                }}
                              >
                                <span>{res.item_name}</span>
                                {res.item_code && <span className="text-muted-foreground shrink-0">{res.item_code}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="hasSerialItem" 
                            checked={manualHasSerial} 
                            onCheckedChange={(c) => {
                              setManualHasSerial(!!c)
                              if (!!c) {
                                const qtyNum = parseInt(manualQty) || 0;
                                setManualSerials(Array.from({ length: Math.max(1, qtyNum) }).map(() => ""))
                              }
                            }} 
                          />
                          <Label htmlFor="hasSerialItem">Enter S-No</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label>Qty:</Label>
                          <Input 
                            type="number" 
                            min="1" 
                            className="w-24" 
                            value={manualQty} 
                            onChange={(e) => {
                              setManualQty(e.target.value)
                              const qtyNum = parseInt(e.target.value) || 0
                              if (qtyNum > 0 && manualHasSerial) {
                                setManualSerials(prev => {
                                  const newSerials = [...prev]
                                  while (newSerials.length < qtyNum) newSerials.push("")
                                  return newSerials.slice(0, qtyNum)
                                })
                              }
                            }}
                          />
                        </div>
                      </div>
                      
                      {manualHasSerial && (
                        <div className="space-y-2 pl-6 border-l-2">
                          <Label className="text-xs text-muted-foreground">Enter S-No for each quantity:</Label>
                          {Array.from({ length: parseInt(manualQty) || 0 }).map((_, i) => (
                            <Input 
                              key={i}
                              placeholder={`S-No ${i + 1}`}
                              value={manualSerials[i] || ""}
                              onChange={(e) => {
                                const newSerials = [...manualSerials]
                                newSerials[i] = e.target.value
                                setManualSerials(newSerials)
                              }}
                              className="h-8 max-w-sm"
                            />
                          ))}
                        </div>
                      )}
                    
                      <Button type="button" onClick={handleAddManualItem}>Add to Scanned List</Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Scanned Items ({scanRows.length})</Label>
                    {scanRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No items scanned yet. Point the camera at each item's QR label.
                      </p>
                    ) : (
                      <div className="border rounded-lg divide-y">
                        {scanRows.map((row, index) => (
                          <div key={itemMatchKey(row.itemName)}>
                            <div className="flex items-center gap-2 p-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{row.itemName}</p>
                                <p className="text-xs text-muted-foreground">Code: {row.itemCode}</p>
                              </div>
                              <Input
                                type="number"
                                className="w-24"
                                placeholder="Qty"
                                value={row.qty}
                                onChange={(e) => updateScanRowQty(index, e.target.value)}
                              />
                              <Button type="button" size="icon" variant="ghost" onClick={() => removeScanRow(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {row.serials.length > 0 && (
                              <div className="pl-6 pb-2 space-y-1">
                                {row.serials.map((serialNo, serialIndex) => (
                                  <div key={serialNo} className="flex items-center gap-2 pr-2">
                                    <p className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
                                      Serial: {serialNo}
                                    </p>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => removeScanSerial(index, serialIndex)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <Label>Accessories (optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Scan each accessory's QR label -- these aren't part of the order's item list, just a
                      running count carried forward to later stages.
                    </p>
                    <div className="flex items-center gap-2">
                      <QrScanner onScan={handleAccessoryQrScan} onError={setAccessoryScannerError} label="Scan Accessory QR" />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setManualEntryMode("accessory")
                          setManualSearchQuery("")
                          setManualSelectedName("")
                          setManualSelectedItemCode("")
                          setManualHasSerial(false)
                          setManualQty("1")
                          setManualSerials([""])
                        }}
                      >
                        Add Accessory Manually
                      </Button>
                    </div>
                    {accessoryScannerError && <p className="text-sm text-destructive">{accessoryScannerError}</p>}

                    {manualEntryMode === "accessory" && (
                      <div className="border p-4 rounded-md space-y-4 bg-muted/30">
                        <div className="flex justify-between items-center">
                          <Label className="text-base">Manual Accessory Entry</Label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setManualEntryMode(null)}>Cancel</Button>
                        </div>
                        <div className="relative">
                          <Input
                            placeholder="Search accessory name or code..."
                            value={manualSearchQuery}
                            onChange={(e) => {
                              setManualSearchQuery(e.target.value)
                              setManualSelectedName(e.target.value)
                              setManualSelectedItemCode("")
                            }}
                            onFocus={() => { if (manualSearchResults.length > 0) setManualSearchOpen(true) }}
                            onBlur={() => setTimeout(() => setManualSearchOpen(false), 200)}
                          />
                          {manualSearchOpen && manualSearchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                              {manualSearchResults.map((res, i) => (
                                <div
                                  key={i}
                                  className="p-2 hover:bg-gray-100 cursor-pointer text-sm flex justify-between gap-2"
                                  onMouseDown={() => {
                                    setManualSearchQuery(res.item_name)
                                    setManualSelectedName(res.item_name)
                                    setManualSelectedItemCode(res.item_code || "")
                                    setManualSearchOpen(false)
                                  }}
                                >
                                  <span>{res.item_name}</span>
                                  {res.item_code && <span className="text-muted-foreground shrink-0">{res.item_code}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label>Qty:</Label>
                            <Input 
                              type="number" 
                              min="1" 
                              className="w-24" 
                              value={manualQty} 
                              onChange={(e) => setManualQty(e.target.value)}
                            />
                          </div>
                        </div>
                        <Button type="button" onClick={handleAddManualItem}>Add to Accessory List</Button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Scanned Accessories ({accessoryScanRows.length})</Label>
                      {accessoryScanRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No accessories scanned yet. Point the camera at each accessory's QR label.
                        </p>
                      ) : (
                        <div className="border rounded-lg divide-y">
                          {accessoryScanRows.map((row, index) => (
                            <div key={itemMatchKey(row.itemName)} className="flex items-center gap-2 p-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{row.itemName}</p>
                                <p className="text-xs text-muted-foreground">Code: {row.itemCode}</p>
                              </div>
                              <Input
                                type="number"
                                className="w-24"
                                placeholder="Qty"
                                value={row.qty}
                                onChange={(e) => updateAccessoryQty(index, e.target.value)}
                              />
                              <Button type="button" size="icon" variant="ghost" onClick={() => removeAccessoryRow(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCompare} disabled={scanRows.length === 0} className="gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      Compare
                    </Button>
                  </div>
                </>
              )}

              {dialogStep === "preview" && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="mb-0">Result:</Label>
                    <Badge
                      variant={
                        computedStatus === "Available" ? "default" : computedStatus === "Not Available" ? "destructive" : "secondary"
                      }
                    >
                      {computedStatus}
                    </Badge>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Ordered</TableHead>
                          <TableHead className="text-right w-28">Scanned</TableHead>
                          <TableHead className="text-right">Shortage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compareItems.map((it, index) => (
                          <TableRow key={it.itemCode || it.itemName}>
                            <TableCell>
                              <p className="font-medium">{it.itemName}</p>
                              <p className="text-xs text-muted-foreground">{it.itemCode || "no code"}</p>
                              {it.releasedStockAvailable && it.releasedStockAvailable.length > 0 && (
                                <p className="text-xs text-blue-700 mt-1">
                                  {it.releasedStockAvailable.reduce((s, r) => s + r.qty, 0)} unit(s) released from
                                  order(s) {it.releasedStockAvailable.map((r) => r.fromOrderNo).filter(Boolean).join(", ")} — may be usable for this order.
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{it.orderedQty}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                className="w-20 ml-auto text-right"
                                value={it.scannedQty}
                                onChange={(e) => updateCompareItemQty(index, e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {it.shortageQty > 0 ? (
                                <Badge variant="destructive">{it.shortageQty}</Badge>
                              ) : (
                                "0"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {compareItems.some((it) => it.shortageQty > 0) && (
                    <p className="text-xs text-muted-foreground">
                      {selectedOrder?.scanType === "repeat"
                        ? "Shortage qty stays here in Packing List's own Pending (this order's indent was already raised once, it isn't raised again)."
                        : selectedOrder?.scanType === "updated"
                          ? "Shortage qty for a brand-new item goes to Indent Creation's Pending tab; shortage on an item that already had an indent before goes straight back into Packing List's own Pending instead."
                          : "Shortage qty will go to Indent Creation's Pending tab, where its details get filled in and an indent gets raised."}{" "}
                      Available qty goes to Pre-Invoice pending under the same order number.
                    </p>
                  )}

                  {subGodownOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Godown (CG only):</span>
                      <Select value={subGodown || "NONE"} onValueChange={(v) => setSubGodown(v === "NONE" ? "" : v)}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Not applicable" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Not applicable</SelectItem>
                          {subGodownOptions.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogStep("scan")} className="gap-2">
                      <ScanLine className="h-4 w-4" />
                      Back to Scan
                    </Button>
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
                </>
              )}
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

        {/* Item List Dialog */}
        <Dialog open={itemListDialogOpen} onOpenChange={setItemListDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Item List</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemListDialogItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No items
                    </TableCell>
                  </TableRow>
                ) : (
                  itemListDialogItems.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description || ""}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setItemListDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
