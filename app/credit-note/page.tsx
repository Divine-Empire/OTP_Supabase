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
import { RefreshCw, Search, Plus, FileText } from "lucide-react"

import { useAuth } from "@/components/auth-provider"

export default function CreditNotePage() {
  const [orderNumber, setOrderNumber] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [quantity, setQuantity] = useState("")
  const [value, setValue] = useState("")
  const [seniorApproval, setSeniorApproval] = useState("")
  const [reason, setReason] = useState("")
  const [remarks, setRemarks] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [creditNotes, setCreditNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { user: currentUser } = useAuth()

  const [searchTerm, setSearchTerm] = useState("")

  // Senior Approval options as specified
  const seniorApprovalOptions = [
    "kishan patel",
    "shashank sir", 
    "neeraj sir",
    "prasnna sir"
  ]

  const fetchCreditNotes = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/otp-supabase/credit-note")
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        const notes = result.data.map((row: any) => ({
          id: row.id,
          orderNumber: row.order_no,
          invoiceNumber: row.invoice_no,
          timestamp: row.created_at,
          quantity: row.quantity,
          value: row.value,
          seniorApproval: row.senior_approval,
          reason: row.reason,
          remarks: row.remarks || "",
          createdBy: row.created_by || "",
        }))
        setCreditNotes(notes)
      } else {
        setCreditNotes([])
      }
    } catch (err: any) {
      console.error("Error fetching credit notes:", err)
      setError(err.message)
      setCreditNotes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCreditNotes()
  }, [])

  // Filter credit notes based on search term
  const filteredCreditNotes = useMemo(() => {
    if (!searchTerm) return creditNotes

    return creditNotes.filter((note: any) => {
      return (
        (note.orderNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.invoiceNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.seniorApproval || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.remarks || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  }, [creditNotes, searchTerm])

  const submitCreditNote = async () => {
    if (!orderNumber || !invoiceNumber || !quantity || !value || !seniorApproval || !reason) {
      alert("Please fill all required fields")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/otp-supabase/credit-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_no: orderNumber,
          invoice_no: invoiceNumber,
          quantity: Number(quantity) || 0,
          value: Number(value) || 0,
          senior_approval: seniorApproval,
          reason,
          remarks,
          created_by: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })

      const result = await response.json()

      if (result.success) {
        setOrderNumber("")
        setInvoiceNumber("")
        setQuantity("")
        setValue("")
        setSeniorApproval("")
        setReason("")
        setRemarks("")
        setIsDialogOpen(false)
        
        await fetchCreditNotes()
        
        alert(`Credit Note for Invoice ${invoiceNumber} has been created successfully`)
      } else {
        throw new Error(result.error || "Credit Note creation failed")
      }
    } catch (err: any) {
      console.error("Error submitting credit note:", err)
      alert(`Error creating credit note: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleNewCreditNote = () => {
    setOrderNumber("")
    setInvoiceNumber("")
    setQuantity("")
    setValue("")
    setSeniorApproval("")
    setReason("")
    setRemarks("")
    setIsDialogOpen(true)
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await fetchCreditNotes()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && creditNotes.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading credit notes...</span>
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
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Credit Note Management
            </h1>
            <p className="text-muted-foreground">Create and manage credit notes for orders</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleNewCreditNote}>
              <Plus className="h-4 w-4 mr-2" />
              Create Credit Note
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Credit Notes</CardTitle>
            <CardDescription>List of all credit notes ({filteredCreditNotes.length})</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created At</TableHead>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Senior Approval</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCreditNotes.map((note) => (
                      <TableRow key={note.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm text-muted-foreground">
                          {note.timestamp ? new Date(note.timestamp).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="font-medium">{note.orderNumber}</TableCell>
                        <TableCell className="font-medium">{note.invoiceNumber}</TableCell>
                        <TableCell>{note.quantity}</TableCell>
                        <TableCell className="font-medium">
                          {note.value ? `₹${Number(note.value).toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{note.seniorApproval}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] whitespace-normal break-words">
                            {note.reason || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] whitespace-normal break-words">
                            {note.remarks || "—"}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCreditNotes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground h-32">
                          {searchTerm ? "No credit notes match your search criteria" : "No credit notes found"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Credit Note Dialog with Scrollable Content */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Credit Note</DialogTitle>
              <DialogDescription>Fill in the details to create a new credit note</DialogDescription>
            </DialogHeader>
                <div className="space-y-4 overflow-visible">
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
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Enter invoice number"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="value">Value *</Label>
                  <Input
                    id="value"
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter value"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="seniorApproval">Senior Approval *</Label>
                <Select value={seniorApproval} onValueChange={setSeniorApproval}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select senior approval" />
                  </SelectTrigger>
                  <SelectContent>
                    {seniorApprovalOptions.map((approver) => (
                      <SelectItem key={approver} value={approver}>
                        {approver}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for credit note..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Additional comments or notes..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={submitCreditNote} 
                disabled={!orderNumber || !invoiceNumber || !quantity || !value || !seniorApproval || !reason || submitting}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Create Credit Note
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
