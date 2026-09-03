"use client"

import { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useData } from "@/components/data-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Search, Plus } from "lucide-react"

import { useAuth } from "@/components/auth-provider"

export default function OrderCancelPage() {
  const [selectedOrder, setSelectedOrder] = useState("")
  const [orderNumber, setOrderNumber] = useState("")
  const [cancelStage, setCancelStage] = useState("")
  const [cancelReason, setCancelReason] = useState("")
  const [remarks, setRemarks] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [cancelledOrders, setCancelledOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { user: currentUser } = useAuth()

  const [searchTerm, setSearchTerm] = useState("")

  const fetchCancelledOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/otp-supabase/cancel")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        const orders = result.data.map((row: any) => ({
          id: row.id,
          orderNumber: row.order_no,
          timestamp: row.cancelled_at,
          cancelStage: row.cancel_stage,
          cancelReason: row.cancel_reason,
          remarks: row.remarks || "",
          cancelledBy: row.cancelled_by || "",
        }))
        setCancelledOrders(orders)
      } else {
        setCancelledOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching cancelled orders:", err)
      setError(err.message)
      setCancelledOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCancelledOrders()
  }, [])

  // Filter orders based on search term
  const filteredCancelledOrders = useMemo(() => {
    if (!searchTerm) return cancelledOrders

    return cancelledOrders.filter((order: any) => {
      return (
        (order.orderNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.cancelStage || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.cancelReason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.remarks || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  }, [cancelledOrders, searchTerm])

  const submitCancellation = async () => {
    if (!orderNumber || !cancelStage || !cancelReason) {
      alert("Please fill all required fields")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/otp-supabase/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_no: orderNumber,
          cancel_stage: cancelStage,
          cancel_reason: cancelReason,
          remarks,
          cancelled_by: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })

      const result = await response.json()

      if (result.success) {
        setOrderNumber("")
        setCancelStage("")
        setCancelReason("")
        setRemarks("")
        setIsDialogOpen(false)
        
        await fetchCancelledOrders()
        
        alert(`Order ${orderNumber} has been cancelled successfully`)
      } else {
        throw new Error(result.error || "Cancellation failed")
      }
    } catch (err: any) {
      console.error("Error submitting cancellation:", err)
      alert(`Error cancelling order: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleNewCancellation = () => {
    setOrderNumber("")
    setCancelStage("")
    setCancelReason("")
    setRemarks("")
    setIsDialogOpen(true)
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await fetchCancelledOrders()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && cancelledOrders.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading cancelled orders...</span>
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
            <Button onClick={handleRefresh} className="mt-4">
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
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
              Order Cancellation
            </h1>
            <p className="text-muted-foreground">
              Manage and track cancelled orders
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleNewCancellation}>
              <Plus className="h-4 w-4 mr-2" />
              Cancel Order
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cancelled Orders</CardTitle>
            <CardDescription>
              List of all cancelled orders ({filteredCancelledOrders.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cancelled At</TableHead>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Cancel Stage</TableHead>
                      <TableHead>Cancel Reason</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCancelledOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm text-muted-foreground">
                          {order.timestamp ? new Date(order.timestamp).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{order.cancelStage}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.cancelReason === "Customer Request"
                                ? "default"
                                : order.cancelReason === "Quality Issues"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {order.cancelReason}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[300px] whitespace-normal break-words">
                            {order.remarks || "—"}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCancelledOrders.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground h-32"
                        >
                          {searchTerm
                            ? "No orders match your search criteria"
                            : "No cancelled orders found"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cancel Order Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel Order</DialogTitle>
              <DialogDescription>
                Fill in the details to cancel an order
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number *</Label>
                <Input
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Enter order number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancelStage">Order Cancel Stage *</Label>
                <Select value={cancelStage} onValueChange={setCancelStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cancel stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Order Acceptable">
                      Order Acceptable
                    </SelectItem>
                    <SelectItem value="Check Inventory">
                      Check Inventory
                    </SelectItem>
                    <SelectItem value="Pending Material Received">
                      Pending Material Received
                    </SelectItem>
                    <SelectItem value="Senior Approval">
                      Senior Approval
                    </SelectItem>
                    <SelectItem value="Pre Invoice Form">
                      Pre Invoice Form
                    </SelectItem>
                    <SelectItem value="Warehouse">Warehouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancelReason">Order Cancel Reason *</Label>
                <Input
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter cancel reason"
                />
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="remarks">Quantity</Label>
                <Textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Additional comments or notes..."
                  rows={3}
                />
              </div> */}
              <div className="space-y-2">
                <Label htmlFor="remarks">Quantity</Label>
                <Input
                  id="remarks"
                  type="number"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter quantity..."
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
                  onClick={submitCancellation}
                  disabled={
                    !orderNumber || !cancelStage || !cancelReason || submitting
                  }
                  variant="destructive"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Order"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}