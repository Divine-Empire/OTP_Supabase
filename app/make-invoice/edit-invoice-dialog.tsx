"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Make Invoice History (admin only): correct a processed invoice. The server (otp_edit_make_invoice,
// Database/89) refuses an Invoice Number change once a credit note exists for it. A file is only
// replaced when a new one is chosen; the current file stays otherwise.
export function EditInvoiceDialog({
  order,
  onOpenChange,
  onSaved,
}: {
  order: any | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState("")
  const [ewayBillNumber, setEwayBillNumber] = useState("")
  const [totalBillAmount, setTotalBillAmount] = useState("")
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [ewayFile, setEwayFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!order) return
    setInvoiceNumber(order.invoiceNumber || "")
    setInvoiceDate(String(order.invoiceDate || "").slice(0, 10))
    setEwayBillNumber(order.ewayBillNumber || "")
    setTotalBillAmount(order.totalBillAmount === "" || order.totalBillAmount == null ? "" : String(order.totalBillAmount))
    setInvoiceFile(null)
    setEwayFile(null)
  }, [order])

  const upload = async (file: File, folder: string) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", folder)
    const res = await fetch("/api/otp-supabase/attachments", { method: "POST", body: formData })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || `Could not upload ${file.name}`)
    return json.url as string
  }

  const handleSave = async () => {
    if (!order) return
    if (!invoiceNumber.trim() || !invoiceDate || totalBillAmount.trim() === "") {
      return toast.error("Invoice Number, Invoice Date and Total Bill Amount are required")
    }
    if (!(Number(totalBillAmount) >= 0)) return toast.error("Total Bill Amount must be a valid number")
    // The current Invoice file must stay unless it is replaced; an invoice always has one.
    if (!invoiceFile && !order.invoiceUploadUrl) return toast.error("Invoice Upload is required")

    setSaving(true)
    try {
      const invoiceUploadUrl = invoiceFile ? await upload(invoiceFile, "make-invoice") : ""
      const ewayBillUploadUrl = ewayFile ? await upload(ewayFile, "make-invoice-eway") : ""
      const res = await fetch("/api/otp-supabase/make-invoice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: order.id,
          invoiceNumber: invoiceNumber.trim(),
          invoiceDate,
          ewayBillNumber: ewayBillNumber.trim(),
          totalBillAmount,
          invoiceUploadUrl,
          ewayBillUploadUrl,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Update failed")
      toast.success(`Order ${order.orderNo} — invoice updated.`)
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setSaving(false)
    }
  }

  const currentFile = (url?: string) =>
    url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
        View current file
      </a>
    ) : (
      <span className="text-xs text-muted-foreground">No file uploaded</span>
    )

  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Invoice{order?.orderNo ? ` · ${order.orderNo}` : ""}</DialogTitle>
          <DialogDescription>Correct the invoice details. Choose a new file only if you want to replace the current one.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-invoiceNumber">
                Invoice Number <span className="text-destructive">*</span>
              </Label>
              <Input id="edit-invoiceNumber" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Enter invoice number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-invoiceDate">
                Invoice Date <span className="text-destructive">*</span>
              </Label>
              <Input id="edit-invoiceDate" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-ewayBillNumber">Eway Bill Number</Label>
              <Input id="edit-ewayBillNumber" value={ewayBillNumber} onChange={(e) => setEwayBillNumber(e.target.value)} placeholder="Enter eway bill number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-totalBillAmount">
                Total Bill Amount <span className="text-destructive">*</span>
              </Label>
              <Input id="edit-totalBillAmount" type="number" min="0" step="any" value={totalBillAmount} onChange={(e) => setTotalBillAmount(e.target.value)} placeholder="Enter total bill amount" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-invoiceUpload">
                Invoice Upload <span className="text-destructive">*</span>
              </Label>
              <Input id="edit-invoiceUpload" type="file" onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)} />
              {invoiceFile ? <p className="text-xs text-muted-foreground">New file: {invoiceFile.name}</p> : currentFile(order?.invoiceUploadUrl)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ewayUpload">Eway Bill Upload</Label>
              <Input id="edit-ewayUpload" type="file" onChange={(e) => setEwayFile(e.target.files?.[0] || null)} />
              {ewayFile ? <p className="text-xs text-muted-foreground">New file: {ewayFile.name}</p> : currentFile(order?.ewayBillUploadUrl)}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
