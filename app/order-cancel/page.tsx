"use client"

import { useEffect, useMemo, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCw, XCircle, AlertTriangle, Eye } from "lucide-react"
import { useServerHistory } from "@/hooks/use-server-history"
import { useAuth } from "@/components/auth-provider"
import { canSeeLocation } from "@/lib/access"
import { formatDateTime } from "@/lib/otp-utils"
import { FilterSearch, FilterChips, DataTable, StatusBadge } from "@/components/shared"
import { toast } from "sonner"

export default function OrderCancelPage() {
  const [logPage, setLogPage] = useState(1)
  const [logPageSize, setLogPageSize] = useState(50)
  const [searchTerm, setSearchTerm] = useState("")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [orderNoInput, setOrderNoInput] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [order, setOrder] = useState<any>(null)
  const [pendingStages, setPendingStages] = useState<{ key: string; label: string; items: { name: string; qty: number | string }[] }[]>([])
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set())
  const [cancelReason, setCancelReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [itemListDialogOpen, setItemListDialogOpen] = useState(false)
  const [itemListDialogItems, setItemListDialogItems] = useState<{ name: string; qty: number | string }[]>([])

  const { user: currentUser } = useAuth()

  // Cancel log: one server page per request (search + location access run in SQL).
  const history = useServerHistory({
    url: "/api/otp-supabase/cancel",
    active: true,
    page: logPage,
    pageSize: logPageSize,
    search: searchTerm,
  })
  const logs = history.rows
  const logsTotal = history.total
  const logsLoading = history.loading
  const fetchLogs = history.reload

  useEffect(() => { setLogPage(1) }, [searchTerm])

  const resetForm = () => {
    setOrderNoInput("")
    setSearchError(null)
    setOrder(null)
    setPendingStages([])
    setSelectedStages(new Set())
    setCancelReason("")
  }

  const openForm = () => {
    resetForm()
    setIsFormOpen(true)
  }

  const handleSearch = async () => {
    if (!orderNoInput.trim()) return

    setIsSearching(true)
    setSearchError(null)
    setOrder(null)
    setPendingStages([])
    setSelectedStages(new Set())
    setCancelReason("")

    try {
      const response = await fetch(`/api/otp-supabase/cancel?orderNo=${encodeURIComponent(orderNoInput.trim())}`)
      const result = await response.json()

      if (result.success && !canSeeLocation(result.order?.order_location, currentUser)) {
        setSearchError(`This order belongs to ${result.order.order_location} — not your location.`)
      } else if (result.success) {
        setOrder(result.order)
        setPendingStages(result.pendingStages || [])
        setSelectedStages(new Set((result.pendingStages || []).map((s: any) => s.key)))
      } else {
        setSearchError(result.error || "Order not found")
      }
    } catch (err: any) {
      console.error("Error searching order for cancel:", err)
      setSearchError(err.message)
    } finally {
      setIsSearching(false)
    }
  }

  const handleViewItemList = (items: { name: string; qty: number | string }[]) => {
    setItemListDialogItems(items || [])
    setItemListDialogOpen(true)
  }

  const toggleStage = (key: string) => {
    setSelectedStages((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!order || selectedStages.size === 0) {
      toast.error("Please select at least one stage to cancel.")
      return
    }
    if (!cancelReason.trim()) {
      toast.error("Please enter a cancel reason.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/otp-supabase/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo: order.order_no,
          selectedStages: Array.from(selectedStages),
          cancelReason,
          cancelledBy: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(`Order ${order.order_no} — selected stage(s) cancelled.`)
        setIsFormOpen(false)
        resetForm()
        await fetchLogs()
      } else {
        throw new Error(result.error || "Cancel failed")
      }
    } catch (err: any) {
      console.error("Error cancelling order stage(s):", err)
      toast.error(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeChips = useMemo(() => {
    if (!searchTerm) return []
    return [
      {
        key: "search",
        label: `Search: ${searchTerm}`,
        onRemove: () => setSearchTerm(""),
      },
    ]
  }, [searchTerm])

  return (
    <MainLayout fitViewport>
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        {/* One toolbar row; the log table below fills the rest of the screen and scrolls inside its own card, so the page itself never scrolls. */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search order no, stage, reason, user..."
            className="min-w-[220px] flex-1"
          />
          <Button
            onClick={fetchLogs}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-medium border-input bg-card hover:bg-accent"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={openForm}
            variant="destructive"
            size="sm"
            className="h-9 gap-1.5 text-xs font-medium shadow-xs"
          >
            <XCircle className="h-4 w-4" />
            <span>Cancel Order</span>
          </Button>
        </div>

        <FilterChips chips={activeChips} onClearAll={() => setSearchTerm("")} className="-mt-1" />

        {/* Unified Enterprise DataTable */}
        <div className="flex-1 flex flex-col min-h-0">
          <DataTable
            headers={[
              { key: "order_no", label: "Order No.", minWidth: "130px" },
              { key: "stage_label", label: "Stage Cancelled", minWidth: "160px" },
              { key: "cancel_reason", label: "Reason", minWidth: "260px" },
              { key: "cancelled_by", label: "Cancelled By", minWidth: "140px" },
              { key: "cancelled_at", label: "Cancelled At", minWidth: "160px" },
            ]}
            data={logs}
            keyExtractor={(log) => log.id}
            loading={logsLoading}
            emptyTitle={
              searchTerm ? "No cancellations match your search" : "No cancellations recorded yet."
            }
            emptyDescription={
              searchTerm ? "Try searching for a different order number or reason." : undefined
            }
            currentPage={logPage}
            itemsPerPage={logPageSize}
            totalResults={logsTotal}
            totalPages={Math.ceil(logsTotal / logPageSize) || 1}
            onPageChange={setLogPage}
            onItemsPerPageChange={(n) => { setLogPageSize(n); setLogPage(1) }}
            itemsPerPageOptions={[25, 50, 100, 200]}
            renderRow={(log) => (
              <TableRow key={log.id} className="hover:bg-secondary/50 transition-colors">
                <TableCell className="px-3.5 py-2 text-xs font-semibold text-foreground align-middle">
                  {log.order_no}
                </TableCell>
                <TableCell className="px-3.5 py-2 text-xs align-middle">
                  <StatusBadge tone="danger">{log.stage_label}</StatusBadge>
                </TableCell>
                <TableCell className="px-3.5 py-2 text-xs text-foreground align-middle max-w-[340px]">
                  <div className="truncate" title={log.cancel_reason}>{log.cancel_reason}</div>
                </TableCell>
                <TableCell className="px-3.5 py-2 text-xs text-muted-foreground align-middle">
                  {log.cancelled_by || "-"}
                </TableCell>
                <TableCell className="px-3.5 py-2 text-xs text-muted-foreground align-middle whitespace-nowrap">
                  {formatDateTime(log.cancelled_at)}
                </TableCell>
              </TableRow>
            )}
            renderCard={(log) => (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">{log.order_no}</span>
                  <StatusBadge tone="danger">{log.stage_label}</StatusBadge>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{log.cancel_reason}</p>
                <p className="text-[11px] text-muted-foreground">
                  {log.cancelled_by || "-"} · {formatDateTime(log.cancelled_at)}
                </p>
              </div>
            )}
          />
        </div>

        {/* Cancel Order Form Modal */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cancel Order</DialogTitle>
              <DialogDescription>Search an order and cancel whichever stage it&apos;s currently pending in</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="orderNoInput">Order No.</Label>
                  <Input
                    id="orderNoInput"
                    placeholder="e.g. DO-4904"
                    value={orderNoInput}
                    onChange={(e) => setOrderNoInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching || !orderNoInput.trim()}>
                  {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>

              {searchError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {searchError}
                </div>
              )}

              {order && (
                <div className="border rounded-lg p-4 space-y-4 bg-secondary/50">
                  <div>
                    <p className="font-semibold">{order.order_no}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.company_name} {order.quotation_number ? `· ${order.quotation_number}` : ""}
                    </p>
                  </div>

                  {pendingStages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      This order isn&apos;t currently pending in any cancellable stage.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Select stage(s) to cancel</Label>
                        <div className="border rounded-md overflow-hidden bg-white">
                          <Table>
                            <TableHeader className="bg-secondary">
                              <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Stage Name</TableHead>
                                <TableHead className="w-32 text-right">Items</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pendingStages.map((stage) => (
                                <TableRow key={stage.key}>
                                  <TableCell>
                                    <Checkbox
                                      id={`stage-${stage.key}`}
                                      checked={selectedStages.has(stage.key)}
                                      onCheckedChange={() => toggleStage(stage.key)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Label htmlFor={`stage-${stage.key}`} className="text-sm font-normal cursor-pointer">
                                      {stage.label}
                                    </Label>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 border-primary/30 bg-accent text-accent-foreground hover:bg-primary/15"
                                      onClick={() => handleViewItemList(stage.items)}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      Item List
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cancelReason">Cancel Reason *</Label>
                        <Textarea
                          id="cancelReason"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Why is this order being cancelled?"
                          rows={3}
                          className="bg-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                  Close
                </Button>
                {order && pendingStages.length > 0 && (
                  <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Selected Stage(s)
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Item List Dialog */}
        <Dialog open={itemListDialogOpen} onOpenChange={setItemListDialogOpen}>
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemListDialogItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No items
                    </TableCell>
                  </TableRow>
                ) : (
                  itemListDialogItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
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
