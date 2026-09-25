"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/components/auth-provider"
import { RefreshCw, FileUp, Download, Search } from "lucide-react"

interface OpeningRow {
  groupName: string
  category: string
  itemCode: string
  itemName: string
  locationLabel: string
  openingQty: string
  maxLevel: string
}

interface Balance {
  item_key: string
  item_name: string
  item_code: string | null
  category: string | null
  group_name: string | null
  location_code: string
  location_label: string
  balance: number
  max_level: number | null
}

// Header aliases -> our field names. Normalized (uppercase, letters/
// digits only) before matching, so "Item-Code", "ITEM CODE", "item_code"
// all resolve the same way.
const HEADER_ALIASES: Record<string, keyof OpeningRow> = {
  GROUP: "groupName",
  CATEGORY: "category",
  ITEMCODE: "itemCode",
  ITEMNAME: "itemName",
  NAMEOFITEM: "itemName",
  LOCATION: "locationLabel",
  WAREHOUSE: "locationLabel",
  WAREHOUSELOCATION: "locationLabel",
  OPENINGQTY: "openingQty",
  OPENINGQUANTITY: "openingQty",
  MAXLEVEL: "maxLevel",
}

function normalizeHeader(h: string): string {
  return h.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
}

// Basic CSV line splitter with quoted-field support (handles commas
// inside "quoted, values").
function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      cells.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells.map((c) => c.trim())
}

function parseCsv(text: string): OpeningRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "")
  if (lines.length < 2) return []

  const headerCells = parseCsvLine(lines[0]).map(normalizeHeader)
  const fieldByColumn = headerCells.map((h) => HEADER_ALIASES[h] || null)

  const rows: OpeningRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const row: OpeningRow = { groupName: "", category: "", itemCode: "", itemName: "", locationLabel: "", openingQty: "", maxLevel: "" }
    fieldByColumn.forEach((field, colIdx) => {
      if (field) row[field] = cells[colIdx] ?? ""
    })
    if (row.itemName) rows.push(row)
  }
  return rows
}

// Settings > Inventory (IMS) — CSV Opening Qty / Max Level import (one
// location at a time, or a mixed file — LOCATION is read per row), and a
// live balance viewer. See Database/49_/50_ims_*.sql for the FIFO ledger
// this feeds.
export default function InventoryPage() {
  const { user: currentUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [balances, setBalances] = useState<Balance[]>([])
  const [loadingBalances, setLoadingBalances] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [groupFilter, setGroupFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")

  // Dynamic filter options -- derived from whatever's actually in the
  // balance table right now, not a fixed list.
  const groupOptions = useMemo(
    () => Array.from(new Set(balances.map((b) => b.group_name).filter((v): v is string => !!v))).sort(),
    [balances]
  )
  const categoryOptions = useMemo(
    () => Array.from(new Set(balances.map((b) => b.category).filter((v): v is string => !!v))).sort(),
    [balances]
  )
  const locationOptions = useMemo(
    () => Array.from(new Set(balances.map((b) => b.location_label).filter((v): v is string => !!v))).sort(),
    [balances]
  )

  const filteredBalances = useMemo(() => {
    return balances.filter((b) => {
      if (groupFilter !== "all" && b.group_name !== groupFilter) return false
      if (categoryFilter !== "all" && b.category !== categoryFilter) return false
      if (locationFilter !== "all" && b.location_label !== locationFilter) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const haystack = `${b.item_name} ${b.item_code || ""} ${b.group_name || ""} ${b.category || ""}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [balances, groupFilter, categoryFilter, locationFilter, searchTerm])

  const fetchBalances = async () => {
    setLoadingBalances(true)
    try {
      const res = await fetch("/api/otp-supabase/ims/balances")
      const result = await res.json()
      if (result.success) setBalances(result.data)
    } catch (err) {
      console.error("Error fetching IMS balances:", err)
    } finally {
      setLoadingBalances(false)
    }
  }

  useEffect(() => {
    fetchBalances()
  }, [])

  const handleDownloadTemplate = () => {
    const headerRow = ["GROUP", "CATEGORY", "ITEM CODE", "ITEM NAME", "LOCATION", "OPENING QTY", "MAX LEVEL"]
    const exampleRow = ["ABCFG", "ANCHOR FASTENERS-ABCFG", "AFG10053", "FISCHER-ANCHOR-SXR 10X120 T", "C.G Warehouse", "500", "50"]
    const csv = [headerRow, exampleRow].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "ims_opening_balance_template.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Parses the chosen CSV and imports it immediately (no separate preview
  // step) — one row per item+location, idempotent (see
  // Database/50_ims_opening_balance_csv_import.sql).
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length === 0) {
        alert("No rows found — check the file has a header row (GROUP, CATEGORY, ITEM CODE, ITEM NAME, LOCATION, OPENING QTY, MAX LEVEL) plus at least one data row.")
        return
      }

      const validRows = rows.filter((r) => r.itemName.trim() && r.locationLabel.trim())
      if (validRows.length === 0) {
        alert("No valid rows (need Item Name and Location) to import")
        return
      }

      setIsImporting(true)
      const res = await fetch("/api/otp-supabase/ims/opening-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((r) => ({
            itemName: r.itemName.trim(),
            itemCode: r.itemCode.trim() || undefined,
            category: r.category.trim() || undefined,
            groupName: r.groupName.trim() || undefined,
            locationLabel: r.locationLabel.trim(),
            openingQty: r.openingQty ? Number(r.openingQty) : undefined,
            maxLevel: r.maxLevel ? Number(r.maxLevel) : undefined,
          })),
          createdBy: currentUser?.fullName || currentUser?.username || "Admin",
        }),
      })
      const result = await res.json()
      if (result.success) {
        const failed = result.results.filter((r: any) => !r.success)
        await fetchBalances()
        if (failed.length === 0) {
          alert(`Imported ${result.results.length} rows successfully.`)
        } else {
          alert(
            `${result.results.length - failed.length} succeeded, ${failed.length} failed:\n` +
              failed.map((r: any) => `- ${r.itemName}: ${r.error}`).join("\n")
          )
        }
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setIsImporting(false)
      e.target.value = ""
    }
  }

  return (
    <MainLayout>
      <div className="p-2">
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Current Stock Balance</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search item, code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-80"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="gap-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
                >
                  <FileUp className="h-4 w-4" />
                  {isImporting ? "Importing..." : "Choose CSV File"}
                </Button>
                <Button variant="outline" size="sm" onClick={fetchBalances} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groupOptions.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locationOptions.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingBalances ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Max Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBalances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          {balances.length === 0 ? "No stock recorded yet" : "No rows match the current filters"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBalances.map((b, i) => (
                        <TableRow key={i}>
                          <TableCell>{b.group_name || ""}</TableCell>
                          <TableCell>{b.category || ""}</TableCell>
                          <TableCell>{b.item_name}</TableCell>
                          <TableCell>{b.item_code || ""}</TableCell>
                          <TableCell>{b.location_label}</TableCell>
                          <TableCell className={`text-right font-medium ${b.balance < 0 ? "text-destructive" : ""}`}>
                            {b.balance}
                          </TableCell>
                          <TableCell className="text-right">{b.max_level ?? ""}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
