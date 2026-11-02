"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Pre-Invoice History (admin only): change "Calib. Certificate Req." of a processed wave. The
// dependent fields follow the Pre-Invoice form's rules; the server (otp_edit_calibration_request,
// Database/85) refuses the cases that are no longer safe, e.g. NO after the certificate exists.
export function EditCalibrationDialog({
  order,
  onOpenChange,
  onSaved,
}: {
  order: any | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [required, setRequired] = useState("")
  const [type, setType] = useState("")
  const [hardcopy, setHardcopy] = useState("")
  const [hardcopyType, setHardcopyType] = useState("")
  const [otherAddress, setOtherAddress] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!order) return
    setRequired(order.calibrationRequired || "")
    setType(order.calibrationType || "")
    setHardcopy(order.certHardcopyRequired || "")
    setHardcopyType(order.hardcopyDeliveryType || "")
    setOtherAddress(order.hardcopyDeliveryType === "Other" ? order.hardcopyDeliveryAddress || "" : "")
  }, [order])

  const wantsHardcopy = required === "YES" && hardcopy === "YES"
  const switchingOff = order?.calibrationRequired === "YES" && required === "NO"

  const handleSave = async () => {
    if (!order) return
    if (!required) return toast.error("Please select Calib. Certificate Req.")
    if (required === "YES") {
      if (!type) return toast.error("Please select the Calibration Type.")
      if (!hardcopy) return toast.error("Please select whether a Cert. Hardcopy is required.")
      if (hardcopy === "YES") {
        if (!hardcopyType) return toast.error("Please select the Hardcopy Delivery Add.")
        if (hardcopyType === "Other" && !otherAddress.trim()) return toast.error("Please enter the hardcopy delivery address.")
      }
    }
    setSaving(true)
    try {
      const res = await fetch("/api/otp-supabase/pre-invoice/edit-calibration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueId: order.queueId || order.id,
          calibrationRequired: required,
          calibrationType: required === "YES" ? type : "",
          certHardcopyRequired: required === "YES" ? hardcopy : "",
          hardcopyDeliveryType: wantsHardcopy ? hardcopyType : "",
          hardcopyDeliveryAddress: wantsHardcopy && hardcopyType === "Other" ? otherAddress.trim() : "",
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Update failed")
      toast.success(`Order ${order.orderNo} — calibration request updated.`)
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Calibration Request{order?.orderNo ? ` · ${order.orderNo}` : ""}</DialogTitle>
          <DialogDescription>Changing this updates the Calibration Certificate and Certi. Hardcopy stages for this wave.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Calib. Certificate Req. <span className="text-destructive">*</span>
              </Label>
              <Select
                value={required}
                onValueChange={(v) => {
                  setRequired(v)
                  if (v !== "YES") {
                    setType("")
                    setHardcopy("")
                    setHardcopyType("")
                    setOtherAddress("")
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YES">YES</SelectItem>
                  <SelectItem value="NO">NO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {required === "YES" && (
              <div className="space-y-2">
                <Label>
                  Calibration Type <span className="text-destructive">*</span>
                </Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select calibration type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LAB">LAB</SelectItem>
                    <SelectItem value="Survey Instruments">Survey Instruments</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {required === "YES" && (
              <div className="space-y-2">
                <Label>
                  Cert. Hardcopy Req. <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={hardcopy}
                  onValueChange={(v) => {
                    setHardcopy(v)
                    if (v !== "YES") {
                      setHardcopyType("")
                      setOtherAddress("")
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">Yes</SelectItem>
                    <SelectItem value="NO">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {wantsHardcopy && (
              <div className="space-y-2">
                <Label>
                  Hardcopy Delivery Add. <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={hardcopyType}
                  onValueChange={(v) => {
                    setHardcopyType(v)
                    if (v !== "Other") setOtherAddress("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select address" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Billing Address">Billing Address</SelectItem>
                    <SelectItem value="Shipping Address">Shipping Address</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {wantsHardcopy && hardcopyType === "Other" && (
            <div className="space-y-2">
              <Label>
                Hardcopy Delivery Address <span className="text-destructive">*</span>
              </Label>
              <Input value={otherAddress} onChange={(e) => setOtherAddress(e.target.value)} placeholder="Type the delivery address" />
            </div>
          )}
          {switchingOff && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              NO clears the Calibration Type, hardcopy details and the Calibration planned date. It is refused if the certificate has already been generated.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
