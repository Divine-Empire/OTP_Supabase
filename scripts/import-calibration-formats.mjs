// Syncs lto_items.calibration_certificate_format and lto_items.otp_is_value from the item-list CSV.
//   node scripts/import-calibration-formats.mjs "<csv>" [--clear "<names.txt>"] [--apply]
// CSV: column 1 = item name (every listed item uses common_format), column 2 = IS value (may be blank).
// --clear: a text file with one item name per line; those items get both columns set to NULL.
// Without --apply it only reports. Needs Database/82 and 83 applied.
// Matching is item_name, trimmed and case-insensitive; every lto_items row with that name is updated.
import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const clearIdx = args.indexOf("--clear")
const clearPath = clearIdx >= 0 ? args[clearIdx + 1] : null
const csvPath = args.find((a, i) => !a.startsWith("--") && i !== clearIdx + 1)
if (!csvPath) throw new Error('usage: node scripts/import-calibration-formats.mjs <csv> [--clear <names.txt>] [--apply]')
const FORMAT = "common_format"

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
)
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Minimal CSV parser: handles quoted fields with commas and "" escapes.
function parseCsv(text) {
  const rows = []
  let row = [], field = "", q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ",") { row.push(field); field = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field); rows.push(row); row = []; field = ""
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

const key = (s) => String(s || "").trim().toLowerCase()
const wanted = new Map() // key -> { name, isValue }
let blank = 0
for (const [name, isValue] of parseCsv(fs.readFileSync(csvPath, "utf8")).slice(1)) {
  if (!key(name)) { blank++; continue }
  wanted.set(key(name), { name: name.trim(), isValue: String(isValue || "").trim() || null })
}
const toClear = new Set(
  clearPath ? fs.readFileSync(clearPath, "utf8").split(/\r?\n/).map(key).filter(Boolean) : []
)
for (const k of toClear) if (wanted.has(k)) throw new Error(`"${k}" is in both the CSV and the clear list`)

const items = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from("lto_items").select("uuid, item_name, calibration_certificate_format").order("uuid").range(from, from + 999)
  if (error) throw error
  items.push(...data)
  if (data.length < 1000) break
}

// uuid lists grouped by the exact values to write
const groups = new Map() // JSON({format, isValue}) -> uuid[]
const add = (format, isValue, uuid) => {
  const k = JSON.stringify({ format, isValue })
  if (!groups.has(k)) groups.set(k, [])
  groups.get(k).push(uuid)
}
const matched = new Set()
const clearedMatched = new Set()
let strayFormatted = []
for (const it of items) {
  const k = key(it.item_name)
  const w = wanted.get(k)
  if (w) { matched.add(k); add(FORMAT, w.isValue, it.uuid) }
  else if (toClear.has(k)) { clearedMatched.add(k); add(null, null, it.uuid) }
  else if (it.calibration_certificate_format) strayFormatted.push(it.item_name)
}
const unmatched = [...wanted.entries()].filter(([k]) => !matched.has(k)).map(([, w]) => w.name)
const clearUnmatched = [...toClear].filter((k) => !clearedMatched.has(k))

console.log(`CSV items: ${wanted.size} (blank names skipped: ${blank}); with IS value: ${[...wanted.values()].filter((w) => w.isValue).length}`)
console.log(`rows to set to ${FORMAT}: ${[...groups].filter(([k]) => JSON.parse(k).format).reduce((a, [, v]) => a + v.length, 0)}`)
console.log(`rows to clear (format + IS -> NULL): ${[...groups].filter(([k]) => !JSON.parse(k).format).reduce((a, [, v]) => a + v.length, 0)}`)
console.log(`CSV names with no lto_items match: ${unmatched.length}`); unmatched.forEach((n) => console.log("  -", n))
console.log(`clear-list names with no lto_items match: ${clearUnmatched.length}`); clearUnmatched.forEach((n) => console.log("  -", n))
console.log(`rows that already have a format but are in neither list (left unchanged): ${strayFormatted.length}`); strayFormatted.forEach((n) => console.log("  -", n))

if (apply) {
  for (const [k, ids] of groups) {
    const { format, isValue } = JSON.parse(k)
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from("lto_items").update({ calibration_certificate_format: format, otp_is_value: isValue }).in("uuid", ids.slice(i, i + 200))
      if (error) throw error
    }
  }
  console.log("applied")
} else {
  console.log("dry run: nothing written (pass --apply)")
}
