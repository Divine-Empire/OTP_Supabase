"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ArrowLeft, ChevronDown, ChevronRight, Download, Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CERTIFICATE_FORMATS,
  DEFAULT_WARRANTY_MONTHS,
  WARRANTY_OPTIONS,
  calibrationDueDate,
  cleanSieveInstrumentName,
  getCertificateFormat,
  getMergedSieveSpec,
  type CertificateValues,
} from "./formats"
import { CertificateFields } from "./certificate-fields"
import { certificatesPdfBlob, downloadBlob } from "./certificates-pdf.jsx"

// Stored on otp_calibration_certificate.certificate_snapshot (hardcopy waves only).
export interface CertificateSnapshot {
  certs: { itemName: string; itemCode: string | null; formatId: string; values: CertificateValues }[]
}

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
  invoiceNumber?: string
  items: PrefillItem[]
  nextCertificateNumber: string
}
interface Cert {
  id: string
  itemIdx: number
  values: CertificateValues
  nextEdited: boolean
  // Set on a certificate that stands for several sieve items (item indexes, first = itemIdx).
  mergedIdx?: number[]
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
function buildItemCerts(itemIdx: number, item: PrefillItem, p: Prefill, each: boolean, formatId: string, months: number): Cert[] {
  const count = each ? item.qty : 1
  const certQty = each ? 1 : item.qty
  const base = getCertificateFormat(formatId)?.getDefaults(item.itemName, certQty) ?? {}
  const instrumentName = formatId === "test_sieve" ? cleanSieveInstrumentName(item.itemName) : item.itemName
  return Array.from({ length: count }, (_, k) => ({
    id: `${itemIdx}-${k}-${Math.random().toString(36).slice(2, 7)}`,
    itemIdx,
    nextEdited: false,
    values: {
      ...base, // the format's own fields and readings (serial no., load table, ...)
      customerName: p.companyName,
      address: p.shippingAddress,
      certificateNo: "",
      instrumentName,
      calibrationDate: p.invoiceDate,
      nextCalibrationDate: calibrationDueDate(p.invoiceDate, months),
      quantity: nos(certQty),
      // The certificate already prints "Based On", so a stored "Based On 9259 ..." drops the prefix.
      // An item with no stored IS value keeps the format's own default (the CTM formats carry one).
      basedOn: (item.isValue || "").replace(/^\s*based on\s*/i, "").trim() || base.basedOn || "",
    },
  }))
}

// One certificate for several sieve items of the same kind: common instrument name, every
// aperture on the specification line, total quantity. Standard comes from the first item that has one.
function buildMergedCert(idxs: number[], p: Prefill, months: number): Cert {
  const items = idxs.map((i) => p.items[i])
  const base = getCertificateFormat("test_sieve")?.getDefaults(items[0].itemName, 1) ?? {}
  const total = items.reduce((sum, it) => sum + it.qty, 0)
  const standard = items.map((it) => (it.isValue || "").replace(/^\s*based on\s*/i, "").trim()).find(Boolean)
  return {
    id: `${idxs[0]}-merged-${Math.random().toString(36).slice(2, 7)}`,
    itemIdx: idxs[0],
    mergedIdx: idxs,
    nextEdited: false,
    values: {
      ...base,
      customerName: p.companyName,
      address: p.shippingAddress,
      certificateNo: "",
      instrumentName: cleanSieveInstrumentName(items[0].itemName),
      calibrationDate: p.invoiceDate,
      nextCalibrationDate: calibrationDueDate(p.invoiceDate, months),
      quantity: nos(total),
      sieveSpecification: getMergedSieveSpec(items.map((it) => ({ itemName: it.itemName, qty: it.qty }))),
      basedOn: standard || base.basedOn || "",
    },
  }
}

type Step = "edit" | "preview"

export function BatchCertificateDialog({
  open,
  onOpenChange,
  makeInvoiceId,
  orderNo,
  invoiceNumber,
  onGenerated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  makeInvoiceId: string | null
  orderNo: string
  invoiceNumber?: string
  onGenerated: (file: File, certificateNumbers: string[], snapshot: CertificateSnapshot) => void
}) {
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formats, setFormats] = useState<(string | null)[]>([])
  const [each, setEach] = useState<boolean[]>([])
  const [skipped, setSkipped] = useState<boolean[]>([])
  // Warranty Duration is common to every certificate of the wave; Next Calibration Date follows it.
  const [warrantyMonths, setWarrantyMonths] = useState(DEFAULT_WARRANTY_MONTHS)
  // Sieve groups currently merged into one certificate (each = item indexes).
  const [merged, setMerged] = useState<number[][]>([])
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
    setMerged([])
    setWarrantyMonths(DEFAULT_WARRANTY_MONTHS)
    setReserved([])
    reservedRef.current = []
    fetch(`/api/otp-supabase/calibration/certificate-prefill?makeInvoiceId=${encodeURIComponent(makeInvoiceId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (!json.success) throw new Error(json.error || "Could not load certificate details")
        const p: Prefill = json.data
        setPrefill(p)
        const eachArr = p.items.map((it) => it.format !== "test_sieve")
        setFormats(p.items.map((it) => it.format))
        setEach(eachArr)
        setSkipped(p.items.map(() => false))
        const initial = p.items.flatMap((it, i) => (it.format ? buildItemCerts(i, it, p, eachArr[i], it.format!, DEFAULT_WARRANTY_MONTHS) : []))
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
      const fresh = format ? buildItemCerts(i, prefill.items[i], prefill, eachQty, format, warrantyMonths) : []
      if (fresh[0]) setOpenIds((s) => new Set(s).add(fresh[0].id))
      return [...rest, ...fresh].sort((a, b) => a.itemIdx - b.itemIdx)
    })
    releasePreview()
    setStep("edit")
  }

  const setFormat = (i: number, format: string) => {
    setFormats((f) => f.map((v, k) => (k === i ? format : v)))
    setSkipped((s) => s.map((v, k) => (k === i ? false : v)))
    const nextEach = format === "test_sieve" ? false : each[i]
    setEach((e) => e.map((v, k) => (k === i ? nextEach : v)))
    rebuildItem(i, format, nextEach)
  }
  const toggleSkip = (i: number) => {
    setSkipped((prev) => prev.map((s, idx) => (idx === i ? !s : s)))
    releasePreview()
    setStep("edit")
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
        if (key === "calibrationDate" && !c.nextEdited) {
          values.nextCalibrationDate = calibrationDueDate(value, warrantyMonths)
        }
        return { ...c, values, nextEdited: c.nextEdited || key === "nextCalibrationDate" }
      })
    )
  }

  // Changing the duration re-derives every certificate's Next Calibration Date (hand edits included).
  const changeWarranty = (months: number) => {
    setWarrantyMonths(months)
    setCerts((prev) =>
      prev.map((c) => ({ ...c, nextEdited: false, values: { ...c.values, nextCalibrationDate: calibrationDueDate(c.values.calibrationDate, months) } }))
    )
    releasePreview()
    setStep("edit")
  }

  // Sieve items of one kind (same instrument name) that could share a certificate.
  const mergeCandidates = useMemo(() => {
    const groups = new Map<string, number[]>()
    prefill?.items.forEach((it, i) => {
      if (formats[i] !== "test_sieve" || skipped[i]) return
      const key = cleanSieveInstrumentName(it.itemName).trim().toLowerCase()
      groups.set(key, [...(groups.get(key) || []), i])
    })
    return [...groups.values()].filter((g) => g.length >= 2)
  }, [prefill, formats, skipped])
  const mergedGroupOf = (i: number) => merged.find((g) => g.includes(i))

  const toggleMerge = (group: number[], on: boolean) => {
    if (!prefill) return
    setMerged((m) => (on ? [...m, group] : m.filter((g) => g[0] !== group[0])))
    setCerts((prev) => {
      const rest = prev.filter((c) => !group.includes(c.itemIdx))
      const fresh = on
        ? [buildMergedCert(group, prefill, warrantyMonths)]
        : group.flatMap((i) => buildItemCerts(i, prefill.items[i], prefill, each[i], formats[i] as string, warrantyMonths))
      if (fresh[0]) setOpenIds((s) => new Set(s).add(fresh[0].id))
      return [...rest, ...fresh].sort((a, b) => a.itemIdx - b.itemIdx)
    })
    releasePreview()
    setStep("edit")
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

  const missing = (prefill?.items || []).map((_, i) => i).filter((i) => !formats[i] && !skipped[i])
  const skippedCount = skipped.filter(Boolean).length
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
      const inv = prefill?.invoiceNumber || invoiceNumber || orderNo || "order"
      const safeInvoiceNo = String(inv).trim().replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_")
      const filename = `calibration_certificate_${safeInvoiceNo}.pdf`
      downloadBlob(blob, filename)
      // What the Certi. Hardcopy stage prefills from: each certificate exactly as it was printed.
      const snapshot: CertificateSnapshot = {
        certs: final.map((c) => ({
          itemName: c.mergedIdx ? (c.values as CertificateValues).instrumentName : prefill?.items[c.itemIdx]?.itemName || "",
          itemCode: c.mergedIdx ? null : prefill?.items[c.itemIdx]?.itemCode || null,
          formatId: formats[c.itemIdx] as string,
          values: c.values,
        })),
      }
      onGenerated(new File([blob], filename, { type: "application/pdf" }), final.map((c) => c.values.certificateNo), snapshot)
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
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Warranty Duration</p>
                <p className="text-xs text-muted-foreground">Applies to every certificate: Next Calibration Date = calibration date + duration - 1 day</p>
              </div>
              <Select value={String(warrantyMonths)} onValueChange={(v) => changeWarranty(Number(v))}>
                <SelectTrigger className="ml-auto h-9 w-36 bg-background text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WARRANTY_OPTIONS.map((o) => (
                    <SelectItem key={o.months} value={String(o.months)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mergeCandidates.map((group) => {
              const isMerged = !!mergedGroupOf(group[0])
              return (
                <label key={group.join("-")} className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={isMerged} onChange={(e) => toggleMerge(group, e.target.checked)} />
                  <span>
                    <span className="font-medium">
                      Merge {group.length} sieves into one certificate · {cleanSieveInstrumentName(prefill.items[group[0]].itemName)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {group.map((i) => prefill.items[i].itemName.replace(/^.*\bDIA\b\s*[-–:]?\s*/i, "")).join(", ")}
                    </span>
                  </span>
                </label>
              )
            })}
            {prefill.items.map((item, i) => {
              const itemCerts = numbered.filter((c) => c.itemIdx === i)
              return (
                <div key={i} className={`rounded-lg border ${skipped[i] ? "border-muted bg-muted/10 opacity-70" : ""}`}>
                  <div className="space-y-2 border-b bg-muted/40 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{item.itemName}</p>
                          {skipped[i] && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                              Skipped
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.itemCode || "No item code"} · Qty {item.qty}
                          {formats[i] ? ` · ${formatName(formats[i])}` : ""}
                        </p>
                      </div>
                      {item.qty > 1 && formats[i] && !mergedGroupOf(i) && (
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
                    {mergedGroupOf(i) && (
                      <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        {mergedGroupOf(i)![0] === i
                          ? `Merged certificate: ${mergedGroupOf(i)!.length} sieves in one.`
                          : "Included in the merged certificate above."}
                      </p>
                    )}
                    {!formats[i] && !skipped[i] && (
                      <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>No certificate format is set for this item. Select one or skip to continue.</span>
                        <div className="ml-auto flex items-center gap-2">
                          <Select onValueChange={(v) => setFormat(i, v)}>
                            <SelectTrigger className="h-8 w-44 bg-white text-xs">
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSkip(i)}
                            className="h-8 border-amber-300 bg-white text-xs hover:bg-amber-100"
                          >
                            Skip
                          </Button>
                        </div>
                      </div>
                    )}
                    {!formats[i] && skipped[i] && (
                      <div className="flex items-center justify-between rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        <span className="italic">Item skipped — no certificate will be generated.</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSkip(i)}
                          className="h-7 text-xs text-primary hover:underline"
                        >
                          Unskip
                        </Button>
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
                  {skippedCount > 0 && ` · ${skippedCount} skipped`}
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
