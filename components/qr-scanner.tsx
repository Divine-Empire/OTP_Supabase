"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Camera, X } from "lucide-react"

// Serial Generation (Purchase-FMS-Supabase) encodes each item's QR as a
// plain delimited string: "itemName/itemCode/serialNo" or
// "itemName/itemCode/serialNo/encodedDate" when a warranty/expiry date is
// set. See Purchase-FMS-Supabase/stage-pages/serial-generation/serial-generation.tsx
// (generateQRSvgString / generateLabelPngDataUrl) for the producing side.
//
// serialNo itself is generated there as `SN-${vendorCode}/${encodedDate}/${seq}`
// (stage-pages/serial-generation/serial-generation.tsx, the `prefix` const)
// — it already contains "/" characters, and always starts with "SN-".
// itemCode can *also* contain "/": when an item has no code registered in
// Purchase-FMS-Supabase's item master, it falls back to the literal string
// "N/A" (baked into the actual QR content there, not just its on-screen
// label — see `itemCodeMap[itemName] || "N/A"` in serial-generation.tsx).
// So a fixed part-count split is unsafe in both directions; instead find
// where the "SN-" serial segment starts and treat everything between
// itemName and that point as itemCode (rejoining it if it had its own "/").
export interface ScannedQrItem {
  itemName: string
  itemCode: string
  serialNo: string
}

export function parseItemQr(raw: string): ScannedQrItem | null {
  const parts = raw.split("/").map((p) => p.trim())
  if (parts.length < 3) return null
  const itemName = parts[0]
  let serialStart = parts.findIndex((p, i) => i >= 2 && p.startsWith("SN-"))
  if (serialStart === -1) serialStart = 2 // unrecognized serial format — fall back to the plain 3-part shape
  const itemCode = parts.slice(1, serialStart).join("/")
  const serialNo = parts.slice(serialStart).join("/")
  if (!itemName || !itemCode || !serialNo) return null
  return { itemName, itemCode, serialNo }
}

// Camera-based, single-shot QR scanner (like a UPI scan-to-pay flow):
// clicking "Scan Item QR" opens the camera, and the moment a QR decodes
// successfully it calls onScan(raw) once and closes the camera itself —
// no separate manual "Stop" step needed to register a scan. The caller
// (check-inventory page) re-renders its own "Scan Item QR" button for the
// next item once this returns to the idle state.
export function QrScanner({
  onScan,
  onError,
}: {
  onScan: (rawValue: string) => void
  onError?: (message: string) => void
}) {
  const containerId = useRef(`qr-scanner-${Math.random().toString(36).slice(2)}`)
  const scannerRef = useRef<any>(null)
  const capturedRef = useRef(false) // guards against duplicate decode callbacks firing before stop() finishes
  const [active, setActive] = useState(false)
  const [starting, setStarting] = useState(false)

  const stop = async () => {
    const instance = scannerRef.current
    scannerRef.current = null
    setActive(false)
    if (instance) {
      try {
        await instance.stop()
        await instance.clear()
      } catch {
        // already stopped / never started — safe to ignore
      }
    }
  }

  const start = async () => {
    setStarting(true)
    capturedRef.current = false
    // html5-qrcode measures the target container's width/height as soon as
    // start() is called to size the video/canvas it injects — if the
    // container is still display:none (the "hidden" class below) at that
    // moment it measures 0x0 and the video never becomes visible even
    // though scanning keeps running. So mark it active (visible) first,
    // then start the camera; roll back to hidden if start() fails.
    setActive(true)
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const instance = new Html5Qrcode(containerId.current)
      scannerRef.current = instance
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          if (capturedRef.current) return // already handled this scan, ignore repeat frames
          capturedRef.current = true
          onScan(decodedText)
          stop() // auto-close the camera the moment a QR is read, like a scan-to-pay flow
        },
        () => {
          // per-frame decode misses are normal while aiming the camera — ignored
        }
      )
    } catch (err: any) {
      console.error("Failed to start QR scanner:", err)
      onError?.(err?.message || "Could not access the camera. Check camera permissions.")
      scannerRef.current = null
      setActive(false)
    } finally {
      setStarting(false)
    }
  }

  useEffect(() => {
    return () => {
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-2">
      <div
        id={containerId.current}
        className={active ? "rounded-lg overflow-hidden border bg-black [&_video]:!w-full [&_video]:!h-auto" : "hidden"}
        style={{ width: "100%", maxWidth: 480 }}
      />
      {!active ? (
        <Button type="button" variant="outline" onClick={start} disabled={starting} className="gap-2">
          <Camera className="h-4 w-4" />
          {starting ? "Starting camera..." : "Scan Item QR"}
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={stop} className="gap-2">
          <X className="h-4 w-4" />
          Cancel Scan
        </Button>
      )}
    </div>
  )
}
