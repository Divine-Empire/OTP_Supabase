"use client"

import { useEffect, useMemo, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCw, Search, XCircle, AlertTriangle, Eye } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { formatDateTime } from "@/lib/otp-utils"

const logColumns = [
  { key: "order_no", label: "Order No.", searchable: true },
  { key: "stage_label", label: "Stage Cancelled", searchable: true },
  { key: "cancel_reason", label: "Reason", searchable: true },
  { key: "cancelled_by", label: "Cancelled By", searchable: true },
  { key: "cancelled_at", label: "Cancelled At", searchable: false },
]

export default function OrderCancelPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
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

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const response = await fetch("/api/otp-supabase/cancel")
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setLogs(result.data)
      } else {
        setLogs([])
      }
    } catch (err) {
      console.error("Error fetching cancel logs:", err)
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs
    return logs.filter((log) => {
      const searchableFields = logColumns
        .filter((col) => col.searchable)
        .map((col) => String(log[col.key] || "").toLowerCase())
      return searchableFields.some((field) => field.includes(searchTerm.toLowerCase()))
    })
  }, [logs, searchTerm])

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

      if (result.success) {
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
      alert("Please select at least one stage to cancel.")
      return
    }
    if (!cancelReason.trim()) {
      alert("Please enter a cancel reason.")
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
        alert(`Order ${order.order_no} — selected stage(s) cancelled.`)
        setIsFormOpen(false)
        resetForm()
        await fetchLogs()
      } else {
        throw new Error(result.error || "Cancel failed")
      }
    } catch (err: any) {
      console.error("Error cancelling order stage(s):", err)
      alert(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MainLayout>
      <div className="p-2 h-[calc(100vh-5rem)] md:h-[calc(100vh-5.5rem)] flex flex-col">
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="border-b py-3 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search cancel log..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={fetchLogs} variant="outline" size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button onClick={openForm} variant="destructive" size="sm">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Order
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 flex-1 min-h-0 flex flex-col">
            <div className="hidden md:flex flex-col flex-1 min-h-0 border rounded-lg overflow-hidden relative">
              <div className="overflow-auto flex-1 min-h-0">
                <Table className="w-full relative">
                  <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                    <TableRow>
                      {logColumns.map((column) => (
                        <TableHead key={column.key} className="bg-gray-50 font-semibold text-gray-900 px-4 py-3 whitespace-nowrap">
                          {column.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow>
                        <TableCell colSpan={logColumns.length} className="h-32 text-center">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            Loading cancel log...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={logColumns.length} className="text-center text-muted-foreground h-32">
                          {searchTerm ? "No cancellations match your search" : "No cancellations recorded yet."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-gray-50">
                          <TableCell className="border-b px-4 py-3 font-medium">{log.order_no}</TableCell>
                          <TableCell className="border-b px-4 py-3">
                            <Badge variant="outline">{log.stage_label}</Badge>
                          </TableCell>
                          <TableCell className="border-b px-4 py-3 max-w-[300px]">
                            <div className="break-words whitespace-normal leading-relaxed">{log.cancel_reason}</div>
                          </TableCell>
                          <TableCell className="border-b px-4 py-3">{log.cancelled_by || "-"}</TableCell>
                          <TableCell className="border-b px-4 py-3">{formatDateTime(log.cancelled_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="md:hidden space-y-3 overflow-y-auto flex-1">
              {filteredLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchTerm ? "No cancellations match your search" : "No cancellations recorded yet."}
                </p>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3 space-y-1 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{log.order_no}</span>
                      <Badge variant="outline">{log.stage_label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{log.cancel_reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.cancelled_by || "-"} · {formatDateTime(log.cancelled_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cancel Order Form Modal */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cancel Order</DialogTitle>
              <DialogDescription>Search an order and cancel whichever stage it's currently pending in</DialogDescription>
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
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {searchError}
                </div>
              )}

              {order && (
                <div className="border rounded-lg p-4 space-y-4 bg-slate-50/50">
                  <div>
                    <p className="font-semibold">{order.order_no}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.company_name} {order.quotation_number ? `· ${order.quotation_number}` : ""}
                    </p>
                  </div>

                  {pendingStages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      This order isn't currently pending in any cancellable stage.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Select stage(s) to cancel</Label>
                        <div className="border rounded-md overflow-hidden bg-white">
                          <Table>
                            <TableHeader className="bg-slate-50">
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
                                      className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Item List</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
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
            <div className="flex justify-end">
              <Button onClick={() => setItemListDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
