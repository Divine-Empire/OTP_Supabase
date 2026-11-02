"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, ChevronDown, ChevronRight, Download, Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCertificateFormat, type CertificateValues } from "../calibration/certificate-formats/formats"
import { CertificateFields } from "../calibration/certificate-formats/certificate-fields"
import { certificatesPdfBlob, downloadBlob } from "../calibration/certificate-formats/certificates-pdf.jsx"
import type { CertificateSnapshot } from "../calibration/certificate-formats/batch-certificate-dialog"

interface HardcopyCert {
  id: string
  itemName: string
  formatId: string
  values: CertificateValues
}

type Step = "edit" | "preview"

// Generate Certificate for the Certi. Hardcopy stage. Same certificates as the ones Calibration
// Certificate printed (loaded from the saved snapshot, numbers included and not editable), laid
// out for pre-printed letterhead: no letterhead image or seal, signature and END only.
export function HardcopyCertificateDialog({
  open,
  onOpenChange,
  calibrationId,
  orderNo,
  invoiceNumber,
  onGenerated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  calibrationId: string | null
  orderNo: string
  invoiceNumber?: string
  onGenerated: () => void
}) {
  const [certs, setCerts] = useState<HardcopyCert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [step, setStep] = useState<Step>("edit")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const releasePreview = () =>
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url)
      return null
    })

  useEffect(() => {
    if (!open || !calibrationId) {
      if (!open) releasePreview()
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setStep("edit")
    setCerts([])
    fetch(`/api/otp-supabase/certi-hardcopy/snapshot?calibrationId=${encodeURIComponent(calibrationId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (!json.success) throw new Error(json.error || "Could not load certificate details")
        const snapshot: CertificateSnapshot = json.data.snapshot
        const loaded = snapshot.certs.map((c, i) => ({ id: `${i}-${Math.random().toString(36).slice(2, 7)}`, itemName: c.itemName, formatId: c.formatId, values: c.values }))
        setCerts(loaded)
        setOpenIds(new Set(loaded.slice(0, 1).map((c) => c.id)))
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load certificate details"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, calibrationId])

  const setField = (id: string, key: string, value: string) =>
    setCerts((prev) => prev.map((c) => (c.id === id ? { ...c, values: { ...c.values, [key]: value } } : c)))

  const toggleOpen = (id: string) =>
    setOpenIds((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  // Certificates of one item sit next to each other in the snapshot; show them under one heading.
  const groups: { itemName: string; certs: HardcopyCert[] }[] = []
  for (const c of certs) {
    const last = groups[groups.length - 1]
    if (last && last.itemName === c.itemName) last.certs.push(c)
    else groups.push({ itemName: c.itemName, certs: [c] })
  }

  const build = () => certificatesPdfBlob(certs.map((c) => ({ formatId: c.formatId, values: c.values })), { hardcopy: true })

  const handlePreview = async () => {
    setBusy(true)
    try {
      const blob = await build()
      releasePreview()
      setPreviewUrl(URL.createObjectURL(blob))
      setStep("preview")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build the preview")
    } finally {
      setBusy(false)
    }
  }

  const handleGenerate = async () => {
    if (!calibrationId) return
    setBusy(true)
    try {
      const blob = await build()
      const inv = invoiceNumber || orderNo || "order"
      const safeInvoiceNo = String(inv).trim().replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_")
      const filename = `certificate_hardcopy_${safeInvoiceNo}.pdf`
      const file = new File([blob], filename, { type: "application/pdf" })

      const form = new FormData()
      form.append("file", file)
      const uploadRes = await fetch("/api/otp-supabase/calibration/certificate-upload", { method: "POST", body: form })
      const uploadJson = await uploadRes.json()
      if (!uploadJson.success) throw new Error(uploadJson.error || "Hardcopy upload failed")

      const res = await fetch("/api/otp-supabase/certi-hardcopy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calibrationId, hardcopyPdfUrl: uploadJson.url }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Could not save the hardcopy")

      downloadBlob(blob, filename)
      toast.success(`${certs.length} certificate${certs.length === 1 ? "" : "s"} generated for print.`)
      onOpenChange(false)
      onGenerated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the PDF")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`flex max-w-3xl flex-col overflow-hidden ${step === "preview" ? "h-[94vh] max-h-[94vh]" : "max-h-[92vh]"}`}>
        <DialogHeader>
          <DialogTitle>Generate Certificate{orderNo ? ` · ${orderNo}` : ""}</DialogTitle>
          <DialogDescription>
            {step === "edit"
              ? "Hardcopy for pre-printed letterhead: no letterhead or seal. Edit if needed, then preview."
              : "Check the certificates, then generate the PDF for print."}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading certificates...
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {step === "edit" && certs.length > 0 && (
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {groups.map((g, gi) => (
              <div key={gi} className="rounded-lg border">
                <div className="border-b bg-muted/40 p-3">
                  <p className="text-sm font-semibold">{g.itemName}</p>
                  <p className="text-xs text-muted-foreground">{getCertificateFormat(g.certs[0].formatId)?.name ?? g.certs[0].formatId}</p>
                </div>
                {g.certs.map((c, k) => {
                  const isOpen = openIds.has(c.id)
                  return (
                    <div key={c.id} className="border-b last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleOpen(c.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent/50"
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        <span className="font-medium">
                          Certificate {k + 1} of {g.certs.length}
                        </span>
                        <span className="ml-auto font-mono text-muted-foreground">{c.values.certificateNo}</span>
                      </button>
                      {isOpen && (
                        <div className="p-3 pt-1">
                          <CertificateFields
                            format={getCertificateFormat(c.formatId)!}
                            values={c.values}
                            onChange={(key, value) => setField(c.id, key, value)}
                            idPrefix={c.id}
                            hideKeys={["certificateNo"]}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {step === "preview" && previewUrl && <iframe title="Hardcopy preview" src={previewUrl} className="min-h-0 w-full flex-1 rounded border" />}

        {certs.length > 0 && (
          <div className="flex items-center justify-between gap-2 pt-2">
            {step === "edit" ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {certs.length} certificate{certs.length === 1 ? "" : "s"}
                </p>
                <Button onClick={handlePreview} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                  Preview
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep("edit")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button onClick={handleGenerate} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Generate PDF
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
