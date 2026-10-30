"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CertificateFormat, CertificateValues } from "./formats"

// Mini page drawn with CSS, so no thumbnail image has to be kept in sync with the layouts.
export function FormatThumbnail({ kind }: { kind: CertificateFormat["thumbnail"] }) {
  return (
    <div className="mx-auto flex aspect-[1/1.35] w-full max-w-[150px] flex-col gap-1 rounded border bg-white p-2 shadow-sm">
      <div className="h-1.5 rounded-sm bg-[#2274B8]/80" />
      <div className="mx-auto mt-1 h-1.5 w-2/3 rounded-sm bg-slate-700" />
      <div className="mt-1.5 space-y-1">
        {[70, 55, 80, 60, 50, 65].slice(0, kind === "table" ? 4 : 6).map((w, i) => (
          <div key={i} className="flex gap-1">
            <div className="h-1 w-5 rounded-sm bg-slate-300" />
            <div className="h-1 rounded-sm bg-slate-200" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
      {kind === "table" ? (
        <div className="mt-1 grid grid-cols-3 gap-px rounded-sm border border-slate-300 bg-slate-300">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-1.5 bg-white" />
          ))}
        </div>
      ) : (
        <div className="mt-1.5 h-1 w-1/2 rounded-sm bg-slate-600" />
      )}
      <div className="space-y-1">
        <div className="h-0.5 rounded-sm bg-slate-200" />
        <div className="h-0.5 w-4/5 rounded-sm bg-slate-200" />
        <div className="h-0.5 w-3/5 rounded-sm bg-slate-200" />
      </div>
    </div>
  )
}

// The editable form of one certificate: the format's fixed fields, then its readings table
// (if it has one). Labels are fixed; only values change.
export function CertificateFields({
  format,
  values,
  onChange,
  idPrefix,
  hideKeys = [],
  compact = false,
}: {
  format: CertificateFormat
  values: CertificateValues
  onChange: (key: string, value: string) => void
  idPrefix: string
  hideKeys?: string[]
  compact?: boolean
}) {
  const fields = format.fields.filter((f) => !hideKeys.includes(f.key))
  const labelClass = compact ? "text-xs" : undefined
  return (
    <div className="space-y-4">
      <div className={`grid sm:grid-cols-2 ${compact ? "gap-3" : "gap-4"}`}>
        {fields.map((field) => (
          <div key={field.key} className={`${compact ? "space-y-1" : "space-y-1.5"} ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
            <Label htmlFor={`${idPrefix}-${field.key}`} className={labelClass}>
              {field.label}
            </Label>
            {field.type === "textarea" ? (
              <Textarea id={`${idPrefix}-${field.key}`} rows={2} value={values[field.key] ?? ""} onChange={(e) => onChange(field.key, e.target.value)} />
            ) : (
              <Input
                id={`${idPrefix}-${field.key}`}
                type={field.type === "date" ? "date" : "text"}
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            )}
            {field.hint && !compact && <p className="text-xs text-muted-foreground">{field.hint}</p>}
          </div>
        ))}
      </div>

      {format.table && (
        <div className="space-y-1.5">
          <p className={`font-medium ${compact ? "text-xs" : "text-sm"}`}>Readings</p>
          <div className="overflow-hidden rounded-md border">
            <div className="grid grid-cols-[3rem_1fr_1fr] bg-muted/50 text-xs font-medium">
              <div className="px-2 py-1.5 text-center">Sl. No.</div>
              {format.table.columns.map((c) => (
                <div key={c.label} className="px-2 py-1.5">
                  {c.label}
                </div>
              ))}
            </div>
            {Array.from({ length: format.table.rows }, (_, row) => (
              <div key={row} className="grid grid-cols-[3rem_1fr_1fr] items-center border-t">
                <div className="px-2 text-center text-xs text-muted-foreground">{row + 1}</div>
                {format.table!.columns.map((c) => (
                  <div key={c.label} className="p-1">
                    <Input
                      aria-label={`${c.label}, row ${row + 1}`}
                      className="h-8 text-xs"
                      value={values[c.key(row)] ?? ""}
                      onChange={(e) => onChange(c.key(row), e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
