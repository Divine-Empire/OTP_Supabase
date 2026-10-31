"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Download, Eye, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { CERTIFICATE_FORMATS, addMonths, type CertificateFormat, type CertificateValues } from "./formats"
import { CertificateFields, FormatThumbnail } from "./certificate-fields"
import { certificatesPdfBlob, downloadBlob } from "./certificates-pdf.jsx"

type Step = "pick" | "edit" | "preview"

// Blank certificate tool behind the toolbar's Certificate button: pick any format, fill it in by hand.
export function CertificateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState<Step>("pick")
  const [format, setFormat] = useState<CertificateFormat>(CERTIFICATE_FORMATS[0])
  const [values, setValues] = useState<CertificateValues>(() => CERTIFICATE_FORMATS[0].getDefaults())
  // Once the user edits Next Calibration Date by hand, stop overwriting it from the calibration date.
  const [nextEdited, setNextEdited] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const releasePreview = () => {
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url)
      return null
    })
  }

  // Each time the dialog opens, start from the picker.
  useEffect(() => {
    if (open) {
      setStep("pick")
      setNextEdited(false)
      setError(null)
    } else {
      releasePreview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const pickFormat = (f: CertificateFormat) => {
    setFormat(f)
    setValues(f.getDefaults())
    setNextEdited(false)
    setStep("edit")
  }

  const setField = (key: string, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "calibrationDate" && !nextEdited) {
        const months = format.id === "test_sieve" ? 12 : 6
        next.nextCalibrationDate = addMonths(value, months)
      }
      return next
    })
    if (key === "nextCalibrationDate") setNextEdited(true)
  }

  const handlePreview = async () => {
    setBusy(true)
    setError(null)
    try {
      const blob = await certificatesPdfBlob([{ formatId: format.id, values }])
      releasePreview()
      setPreviewUrl(URL.createObjectURL(blob))
      setStep("preview")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the preview")
    } finally {
      setBusy(false)
    }
  }

  const handleGenerate = async () => {
    setBusy(true)
    setError(null)
    try {
      const blob = await certificatesPdfBlob([{ formatId: format.id, values }])
      const safe = String(values.certificateNo || values.customerName || "certificate").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")
      downloadBlob(blob, `Calibration_Certificate_${safe || "certificate"}.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the PDF")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === "pick" ? "Certificate" : format.name}</DialogTitle>
          <DialogDescription>
            {step === "pick" && "Choose a certificate format."}
            {step === "edit" && "Edit the values. The labels are fixed."}
            {step === "preview" && "Check the certificate, then generate the PDF."}
          </DialogDescription>
        </DialogHeader>

        {step === "pick" && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {CERTIFICATE_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => pickFormat(f)}
                className="rounded-lg border p-3 text-center transition hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <FormatThumbnail kind={f.thumbnail} />
                <p className="mt-2 text-sm font-medium">{f.name}</p>
              </button>
            ))}
          </div>
        )}

        {step === "edit" && (
          <>
            <CertificateFields format={format} values={values} onChange={setField} idPrefix="cert" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("pick")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Formats
              </Button>
              <Button onClick={handlePreview} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                Preview
              </Button>
            </div>
          </>
        )}

        {step === "preview" && (
          <>
            {previewUrl && <iframe title="Certificate preview" src={previewUrl} className="h-[65vh] w-full rounded border" />}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("edit")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button onClick={handleGenerate} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Generate PDF
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
