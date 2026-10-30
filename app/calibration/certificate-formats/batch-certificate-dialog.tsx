"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ArrowLeft, ChevronDown, ChevronRight, Download, Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CERTIFICATE_FORMATS, addMonths, getCertificateFormat, type CertificateValues } from "./formats"
import { CertificateFields } from "./certificate-fields"
import { certificatesPdfBlob, downloadBlob } from "./certificates-pdf.jsx"

interface PrefillItem {
  itemName: string
  itemCode: string | null
  qty: number
  format: string | null
  isValue: string | null
}
interface Prefill {
  companyName: string
  shippingAddress: string
  invoiceDate: string
  items: PrefillItem[]
  nextCertificateNumber: string
}
interface Cert {
  id: string
  itemIdx: number
  values: CertificateValues
  nextEdited: boolean
}

const nos = (n: number) => `${String(n).padStart(2, "0")} Nos`
const formatName = (id: string | null) => getCertificateFormat(id)?.name ?? id ?? ""

// "DE/N-LAB/2026-27/1800" -> { prefix: "DE/N-LAB/2026-27/", start: 1800 }
function parseNumber(next: string) {
  const i = next.lastIndexOf("/")
  return { prefix: next.slice(0, i + 1), start: Number(next.slice(i + 1)) }
}

// One certificate per unit when `each` is on (qty 5 -> 5 certificates of "01 Nos"),
// otherwise a single certificate for the whole quantity.
function buildItemCerts(itemIdx: number, item: PrefillItem, p: Prefill, each: boolean, formatId: string): Cert[] {
  const count = each ? item.qty : 1
  const base = getCertificateFormat(formatId)?.getDefaults() ?? {}
  return Array.from({ length: count }, (_, k) => ({
    id: `${itemIdx}-${k}-${Math.random().toString(36).slice(2, 7)}`,
    itemIdx,
    nextEdited: false,
    values: {
      ...base, // the format's own fields and readings (serial no., load table, ...)
      customerName: p.companyName,
      address: p.shippingAddress,
      certificateNo: "",
      instrumentName: item.itemName,
      calibrationDate: p.invoiceDate,
      nextCalibrationDate: addMonths(p.invoiceDate, 6),
      quantity: nos(each ? 1 : item.qty),
      // The certificate already prints "Based On", so a stored "Based On 9259 ..." drops the prefix.
      basedOn: (item.isValue || "").replace(/^\s*based on\s*/i, "").trim(),
    },
  }))
}

type Step = "edit" | "preview"

export function BatchCertificateDialog({
  open,
  onOpenChange,
  makeInvoiceId,
  orderNo,
  onGenerated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  makeInvoiceId: string | null
  orderNo: string
  onGenerated: (file: File, certificateNumbers: string[]) => void
}) {
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formats, setFormats] = useState<(string | null)[]>([])
  const [each, setEach] = useState<boolean[]>([])
  const [certs, setCerts] = useState<Cert[]>([])
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [step, setStep] = useState<Step>("edit")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Numbers already taken from the DB counter in this session; reused when the PDF is
  // generated again so repeated downloads do not burn new numbers.
  const [reserved, setReserved] = useState<string[]>([])
  const reservedRef = useRef<string[]>([])

  const releasePreview = () =>
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url)
      return null
    })

  useEffect(() => {
    if (!open || !makeInvoiceId) {
      if (!open) releasePreview()
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setStep("edit")
    setPrefill(null)
    setCerts([])
    setReserved([])
    reservedRef.current = []
    fetch(`/api/otp-supabase/calibration/certificate-prefill?makeInvoiceId=${encodeURIComponent(makeInvoiceId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (!json.success) throw new Error(json.error || "Could not load certificate details")
        const p: Prefill = json.data
        setPrefill(p)
        setFormats(p.items.map((it) => it.format))
        setEach(p.items.map(() => true)) // most orders need one certificate per unit
        const initial = p.items.flatMap((it, i) => (it.format ? buildItemCerts(i, it, p, true, it.format!) : []))
        setCerts(initial)
        setOpenIds(new Set(initial.slice(0, 1).map((c) => c.id)))
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load certificate details"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, makeInvoiceId])

  const rebuildItem = (i: number, format: string | null, eachQty: boolean) => {
    if (!prefill) return
    setCerts((prev) => {
      const rest = prev.filter((c) => c.itemIdx !== i)
      const fresh = format ? buildItemCerts(i, prefill.items[i], prefill, eachQty, format) : []
      if (fresh[0]) setOpenIds((s) => new Set(s).add(fresh[0].id))
      return [...rest, ...fresh].sort((a, b) => a.itemIdx - b.itemIdx)
    })
    releasePreview()
    setStep("edit")
  }

  const setFormat = (i: number, format: string) => {
    setFormats((f) => f.map((v, k) => (k === i ? format : v)))
    rebuildItem(i, format, each[i])
  }
  const setEachQty = (i: number, value: boolean) => {
    setEach((e) => e.map((v, k) => (k === i ? value : v)))
    rebuildItem(i, formats[i], value)
  }

  const setField = (certId: string, key: string, value: string) => {
    setCerts((prev) =>
      prev.map((c) => {
        if (c.id !== certId) return c
        const values = { ...c.values, [key]: value }
        if (key === "calibrationDate" && !c.nextEdited) values.nextCalibrationDate = addMonths(value, 6)
        return { ...c, values, nextEdited: c.nextEdited || key === "nextCalibrationDate" }
      })
    )
  }

  const toggleOpen = (id: string) =>
    setOpenIds((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  // Certificate numbers: the ones reserved so far, then provisional ones continuing from the
  // counter's next value (final numbers are fixed when the PDF is generated).
  const numbered = useMemo(() => {
    const { prefix, start } = prefill ? parseNumber(prefill.nextCertificateNumber) : { prefix: "", start: 0 }
    return certs.map((c, idx) => ({
      ...c,
      values: { ...c.values, certificateNo: reserved[idx] ?? `${prefix}${start + idx}` },
    }))
  }, [certs, prefill, reserved])

  const missing = (prefill?.items || []).map((_, i) => i).filter((i) => !formats[i])
  const tooMany = certs.length > 500

  const toPdfInput = (list: typeof numbered) => list.map((c) => ({ formatId: formats[c.itemIdx] as string, values: c.values }))

  const handlePreview = async () => {
    setBusy(true)
    try {
      const blob = await certificatesPdfBlob(toPdfInput(numbered))
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
    setBusy(true)
    try {
      // Take only the numbers still missing from the counter, so re-generating is free.
      const need = certs.length - reservedRef.current.length
      if (need > 0) {
        const res = await fetch("/api/otp-supabase/calibration/certificate-numbers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: need }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error || "Could not reserve certificate numbers")
        reservedRef.current = [...reservedRef.current, ...(json.numbers as string[])]
        setReserved(reservedRef.current)
      }
      const final = numbered.map((c, idx) => ({ ...c, values: { ...c.values, certificateNo: reservedRef.current[idx] } }))
      const blob = await certificatesPdfBlob(toPdfInput(final))
      const filename = `Calibration_Certificates_${String(orderNo || "order").replace(/[^a-z0-9]+/gi, "_")}.pdf`
      downloadBlob(blob, filename)
      onGenerated(new File([blob], filename, { type: "application/pdf" }), final.map((c) => c.values.certificateNo))
      toast.success(`${final.length} certificate${final.length === 1 ? "" : "s"} generated. The PDF is attached to the Process form.`)
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
            {step === "edit" ? "One certificate per item (or per unit). Edit if needed, then preview." : "Check the certificates, then generate the PDF."}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading items...
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {prefill && step === "edit" && (
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {prefill.items.length === 0 && <p className="text-sm text-muted-foreground">This wave has no packed items.</p>}
            {prefill.items.map((item, i) => {
              const itemCerts = numbered.filter((c) => c.itemIdx === i)
              return (
                <div key={i} className="rounded-lg border">
                  <div className="space-y-2 border-b bg-muted/40 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{item.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.itemCode || "No item code"} · Qty {item.qty}
                          {formats[i] ? ` · ${formatName(formats[i])}` : ""}
                        </p>
                      </div>
                      {item.qty > 1 && formats[i] && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Certificate for each qty</span>
                          <div className="inline-flex overflow-hidden rounded-md border">
                            {[true, false].map((v) => (
                              <button
                                key={String(v)}
                                type="button"
                                onClick={() => setEachQty(i, v)}
                                className={`px-2.5 py-1 font-medium ${each[i] === v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
                              >
                                {v ? "Yes" : "No"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {!formats[i] && (
                      <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>No certificate format is set for this item. Select one to continue.</span>
                        <Select onValueChange={(v) => setFormat(i, v)}>
                          <SelectTrigger className="ml-auto h-8 w-44 bg-white text-xs">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            {CERTIFICATE_FORMATS.map((f) => (
                              <SelectItem key={f.id} value={f.id} className="text-xs">
                                {f.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {itemCerts.map((c, k) => {
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
                            Certificate {k + 1} of {itemCerts.length}
                          </span>
                          <span className="ml-auto font-mono text-muted-foreground">{c.values.certificateNo}</span>
                        </button>
                        {isOpen && (
                          <div className="p-3 pt-1">
                            <CertificateFields
                              format={getCertificateFormat(formats[c.itemIdx])!}
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
              )
            })}
          </div>
        )}

        {prefill && step === "preview" && previewUrl && (
          <iframe title="Certificates preview" src={previewUrl} className="min-h-0 w-full flex-1 rounded border" />
        )}

        {prefill && (
          <div className="flex items-center justify-between gap-2 pt-2">
            {step === "edit" ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {certs.length} certificate{certs.length === 1 ? "" : "s"}
                  {missing.length > 0 && ` · ${missing.length} item${missing.length === 1 ? "" : "s"} need a format`}
                  {tooMany && " · too many for one PDF (max 500)"}
                </p>
                <Button onClick={handlePreview} disabled={busy || certs.length === 0 || missing.length > 0 || tooMany}>
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
