"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Loader2, Search, Package, RefreshCw, AlertCircle, Filter, XCircle } from "lucide-react"
import { toast } from "sonner"
import { MainLayout } from "@/components/layout/main-layout"

const formatDate = (dateValue: any) => {
  if (!dateValue || dateValue === "" || dateValue === "-") return "-";
  
  let date: Date | null = null;

  // Handle Google Sheets Date(year, month, day) format
  if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
    const match = dateValue.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) {
      date = new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
    }
  } else {
    date = new Date(dateValue);
  }

  if (date && !isNaN(date.getTime())) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
  
  return dateValue;
};

export default function IMSPage() {
  const [data, setData] = useState<{ items: any[]; columns: any[] }>({ items: [], columns: [] })
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("indent")
  const [filterCategory, setFilterCategory] = useState("All")
  const [filterItemCode, setFilterItemCode] = useState("All")
  const [filterItemName, setFilterItemName] = useState("All")
  const [indentLiftData, setIndentLiftData] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalFilterIndenter, setModalFilterIndenter] = useState("All")

  const script_url = process.env.REORDER_SCRIPT_URL
  const sheet_id = process.env.IMS_SHEET_ID
  const sheet_name = "IMS"

  const fetchIMSData = async () => {
    try {
      setLoading(true)
      if (activeTab === "indent") {
        const response = await fetch("/api/indent-data")
        const jsonData = await response.json()
        
          if (jsonData && jsonData.success && Array.isArray(jsonData.data)) {
            const groups: any = {}
            jsonData.data.forEach((r: any) => {
              const itemName = r.E ? String(r.E).trim() : ""
              if (!itemName) return

              if (!groups[itemName]) {
                groups[itemName] = {
                  itemName: itemName,
                  itemCode: r.D || "-",
                  totalPending: 0,
                  totalIndentRaised: 0,
                  totalPORaised: 0,
                  totalTransit: 0,
                  expectedDate: "",
                  poSet: new Set(),
                  transitSet: new Set(),
                  dateSet: new Set(),
                  records: []
                }
              }
              
              const g = groups[itemName]
              const pQty = Number(r.BV || 0)
              g.totalPending += pQty
              
              const status = String(r.N || "").toLowerCase().trim()
              if (status === "approve" || status === "approved") {
                const pNum = (v: any) => {
                  const val = parseFloat(String(v || 0).replace(/[^0-9.-]/g, ''))
                  return isNaN(val) ? 0 : val
                }
                g.totalIndentRaised += pNum(r.O)
              }
              
              if (r.BC) {
                g.poSet.add(String(r.BC).trim());
                g.totalPORaised = g.poSet.size;
              }
              
              if (r.BW && String(r.BW).trim() !== "" && String(r.BW).trim() !== "0") {
                g.transitSet.add(String(r.BW).trim());
                g.totalTransit = g.transitSet.size;
              }
              
              if (r.BX && String(r.BX).trim() !== "") {
                const d = formatDate(r.BX);
                if (d && d !== "-") g.dateSet.add(d);
              }
              g.expectedDate = Array.from(g.dateSet).join(", ");
              
              // Push ALL records to the modal so every indenter is visible
              g.records.push({ ...r })
            })
            
            // Show all items that have at least one approved indent
            const finalData = Object.values(groups).filter((g: any) => g.records.length > 0)
            setIndentLiftData(finalData)
          } else {
            console.error("Script error or no data:", jsonData.error)
            toast.error(jsonData.error || "Failed to fetch Indent data")
          }
        } else {
          // Reorder logic — via server-side proxy (supports restricted sheets)
        const response = await fetch("/api/reorder-data")
        const jsonData = await response.json()

        if (jsonData && jsonData.success) {
          setData({ items: jsonData.items || [], columns: jsonData.columns || [] })
        } else {
          console.error("Reorder fetch error:", jsonData.error)
          toast.error(jsonData.error || "Failed to fetch Reorder data")
        }
      }
    } catch (error) {
      console.error("Error fetching IMS data:", error)
      toast.error("Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIMSData()
  }, [activeTab])

  // @ts-ignore
  const items = data.items || []
  // @ts-ignore
  const columns = data.columns || []

  // Extract unique values for filters
  const categories: string[] = ["All", ...Array.from(new Set(items.map((item: any) => String(item["col_B"] || "")).filter(Boolean)))].sort()
  const itemCodes: string[] = ["All", ...Array.from(new Set(items.map((item: any) => String(item["col_C"] || "")).filter(Boolean)))].sort()
  const itemNames: string[] = useMemo(() => {
    if (activeTab === "indent") {
      return ["All", ...Array.from(new Set(indentLiftData.map((item: any) => String(item.itemName || "")).filter(Boolean)))].sort()
    }
    return ["All", ...Array.from(new Set(items.map((item: any) => String(item["col_E"] || "")).filter(Boolean)))].sort()
  }, [activeTab, indentLiftData, items])

  const clearFilters = () => {
    setSearchTerm("")
    setFilterCategory("All")
    setFilterItemCode("All")
    setFilterItemName("All")
  }

  const filteredData = items.filter((item: any) => {
    const searchStr = searchTerm.toLowerCase()
    const matchesSearch = Object.values(item).some((val) => String(val).toLowerCase().includes(searchStr))
    const matchesCategory = filterCategory === "All" || item["col_B"] === filterCategory
    const matchesItemCode = filterItemCode === "All" || item["col_C"] === filterItemCode
    const matchesItemName = filterItemName === "All" || item["col_E"] === filterItemName

    return matchesSearch && matchesCategory && matchesItemCode && matchesItemName
  })

  const filteredIndentData = useMemo(() => {
    return indentLiftData.filter((item: any) => {
      const searchStr = searchTerm.toLowerCase()
      const matchesSearch = item.itemName.toLowerCase().includes(searchStr)
      const matchesItemName = filterItemName === "All" || item.itemName === filterItemName
      return matchesSearch && matchesItemName
    })
  }, [indentLiftData, searchTerm, filterItemName])

  return (
    <MainLayout>
      <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
        <Card className="border border-indigo-100 bg-white/80 backdrop-blur-sm shadow-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                    <Package className="h-6 w-6 text-indigo-600" />
                    IMS - Inventory Management System
                  </CardTitle>
                  <p className="text-indigo-600 mt-1">Monitor Indents and Reorder Levels</p>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                  <Input
                    placeholder="Search inventory..."
                    className="pl-10 border-indigo-100 focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-end gap-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full">
                  {activeTab === "reorder" && (
                    <>
                      <div className="space-y-1.5 w-full sm:w-48">
                        <label className="text-xs font-semibold text-indigo-700 uppercase flex items-center gap-1">
                          <Filter className="h-3 w-3" /> Category
                        </label>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                          <SelectTrigger className="bg-white border-indigo-100">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 w-full sm:w-48">
                        <label className="text-xs font-semibold text-indigo-700 uppercase flex items-center gap-1">
                          <Filter className="h-3 w-3" /> Item Code
                        </label>
                        <Select value={filterItemCode} onValueChange={setFilterItemCode}>
                          <SelectTrigger className="bg-white border-indigo-100">
                            <SelectValue placeholder="All Item Codes" />
                          </SelectTrigger>
                          <SelectContent>
                            {itemCodes.map(code => (
                              <SelectItem key={code} value={code}>{code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5 w-full sm:w-64">
                    <label className="text-xs font-semibold text-indigo-700 uppercase flex items-center gap-1">
                      <Filter className="h-3 w-3" /> Name of Item
                    </label>
                    <Select value={filterItemName} onValueChange={setFilterItemName}>
                      <SelectTrigger className="bg-white border-indigo-100">
                        <SelectValue placeholder="All Items" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemNames.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/50 gap-2 font-medium w-full md:w-auto justify-center md:justify-start mt-2 md:mt-0"
                >
                  <XCircle className="h-4 w-4" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-4 mt-2">
            <TabsList className="bg-white border border-gray-200 p-1 shadow-sm w-full sm:w-auto flex">
              <TabsTrigger value="indent" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all px-4 sm:px-8 flex-1 sm:flex-none">
                <RefreshCw className="h-4 w-4 mr-2" />
                Indent
              </TabsTrigger>
              <TabsTrigger value="reorder" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all px-4 sm:px-8 flex-1 sm:flex-none">
                <AlertCircle className="h-4 w-4 mr-2" />
                Reorder
              </TabsTrigger>
            </TabsList>

            {activeTab === "reorder" && (
              <Button 
                onClick={() => window.open("https://new-purchase.vercel.app/stages/create-indent", "_blank")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-medium w-full sm:w-auto"
              >
                Create Indent
              </Button>
            )}
          </div>

          <TabsContent value="indent" className="mt-0">
            <IndentLiftTable 
              data={filteredIndentData} 
              loading={loading} 
              onRowClick={(item) => {
                setSelectedItem(item)
                setModalFilterIndenter("All")
                setIsModalOpen(true)
              }} 
            />
          </TabsContent>

          <TabsContent value="reorder" className="mt-0">
            <IMSTable data={filteredData} columns={columns} loading={loading} type="reorder" />
          </TabsContent>
        </Tabs>

        {/* Drill-down Modal */}
        {isModalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
              <CardHeader className="bg-indigo-600 text-white flex flex-row justify-between items-center">
                <CardTitle>{selectedItem.itemName}</CardTitle>
                <Button variant="ghost" className="text-white hover:bg-indigo-700" onClick={() => setIsModalOpen(false)}>
                  <XCircle className="h-6 w-6" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden flex flex-col">
                <div className="p-4 bg-indigo-50 border-b flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-indigo-700 uppercase">Filter By Indenter:</label>
                    <Select value={modalFilterIndenter} onValueChange={setModalFilterIndenter}>
                      <SelectTrigger className="w-[200px] h-8 bg-white border-indigo-200 text-xs">
                        <SelectValue placeholder="All Indenters" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Indenters</SelectItem>
                        {Array.from(new Set(selectedItem.records.map((r: any) => r.C).filter(Boolean))).map((name: any) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="overflow-auto flex-1 bg-gray-50/30">
                  {/* Desktop Table View */}
                  <table className="hidden md:table w-full text-left">
                  <thead className="bg-indigo-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-indigo-700 uppercase">Indenter Name</th>
                      <th className="px-6 py-3 text-xs font-bold text-indigo-700 uppercase">Approve Qty</th>
                      <th className="px-6 py-3 text-xs font-bold text-indigo-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-xs font-bold text-indigo-700 uppercase">Remaining Qty</th>
                      <th className="px-6 py-3 text-xs font-bold text-indigo-700 uppercase">Pending Qty</th>
                      <th className="px-6 py-3 text-xs font-bold text-indigo-700 uppercase">Expected Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {selectedItem.records
                      .filter((r: any) => {
                        const status = String(r.N || "").toLowerCase().trim();
                        const matchesStatus = status === "approve" || status === "approved";
                        const matchesIndenter = modalFilterIndenter === "All" || r.C === modalFilterIndenter;
                        return matchesStatus && matchesIndenter;
                      })
                      .map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">{r.C || r.col_C}</td>
                          <td className="px-6 py-4 text-sm font-semibold">{r.O || r.col_O}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${
                              String(r.N || "").toLowerCase().includes("approve") 
                                ? "bg-green-100 text-green-700" 
                                : String(r.N || "").toLowerCase().includes("reject")
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {r.N || r.col_N}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">{r.BU || r.col_BU}</td>
                          <td className="px-6 py-4 text-sm font-black text-indigo-600">{r.BV || r.col_BV}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(r.BX || r.col_BX)}</td>
                        </tr>
                      ))}
                    {selectedItem.records.filter((r: any) => {
                      const status = String(r.N || "").toLowerCase().trim();
                      const matchesStatus = status === "approve" || status === "approved";
                      const matchesIndenter = modalFilterIndenter === "All" || r.C === modalFilterIndenter;
                      return matchesStatus && matchesIndenter;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                          No approved records found for this item.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="block md:hidden p-4 space-y-4">
                  {selectedItem.records
                    .filter((r: any) => {
                      const status = String(r.N || "").toLowerCase().trim();
                      const matchesStatus = status === "approve" || status === "approved";
                      const matchesIndenter = modalFilterIndenter === "All" || r.C === modalFilterIndenter;
                      return matchesStatus && matchesIndenter;
                    })
                    .map((r: any, idx: number) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                        <div className="flex justify-between items-start mb-3 pl-2">
                          <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Indenter Name</span>
                            <span className="text-sm font-bold text-gray-800">{r.C || r.col_C}</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            String(r.N || "").toLowerCase().includes("approve") 
                              ? "bg-green-100 text-green-700" 
                              : String(r.N || "").toLowerCase().includes("reject")
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {r.N || r.col_N}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 border-t border-gray-50 pt-3 pl-2">
                          <div>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Approve Qty</span>
                            <span className="text-sm font-semibold text-gray-700">{r.O || r.col_O}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Remaining</span>
                            <span className="text-sm font-semibold text-gray-700">{r.BU || r.col_BU}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Pending</span>
                            <span className="text-sm font-black text-indigo-600">{r.BV || r.col_BV}</span>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-50 pl-2">
                           <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Expected Delivery Date</span>
                           <span className="text-sm font-medium text-gray-700">{formatDate(r.BX || r.col_BX)}</span>
                        </div>
                      </div>
                    ))}
                    {selectedItem.records.filter((r: any) => {
                      const status = String(r.N || "").toLowerCase().trim();
                      const matchesStatus = status === "approve" || status === "approved";
                      const matchesIndenter = modalFilterIndenter === "All" || r.C === modalFilterIndenter;
                      return matchesStatus && matchesIndenter;
                    }).length === 0 && (
                      <div className="text-center text-gray-500 italic p-6 bg-white rounded-xl border border-gray-200">
                        No approved records found for this item.
                      </div>
                    )}
                </div>
                </div>
              </CardContent>
              <div className="p-4 bg-gray-50 border-t flex justify-end">
                <Button onClick={() => setIsModalOpen(false)}>Close</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

function IndentLiftTable({ data, loading, onRowClick }: { data: any[]; loading: boolean; onRowClick: (item: any) => void }) {

  if (loading) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center bg-white shadow-xl">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="mt-4 text-gray-500 font-medium">Loading Indent Lift data...</p>
      </Card>
    )
  }

  return (
    <Card className="border border-gray-100 shadow-xl bg-white overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[600px]">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-gradient-to-r from-indigo-800 to-blue-800">
              <th className="px-6 py-4 text-xs font-bold text-white uppercase sticky top-0 z-10 bg-indigo-800 whitespace-nowrap">Item Name</th>
              <th className="px-6 py-4 text-xs font-bold text-white uppercase sticky top-0 z-10 bg-indigo-800 whitespace-nowrap">Total Pending Qty</th>
              <th className="px-6 py-4 text-xs font-bold text-white uppercase sticky top-0 z-10 bg-indigo-800 whitespace-nowrap">Total Indent Raised Qty</th>
              <th className="px-6 py-4 text-xs font-bold text-white uppercase sticky top-0 z-10 bg-indigo-800 whitespace-nowrap">PO Raised</th>
              <th className="px-6 py-4 text-xs font-bold text-white uppercase sticky top-0 z-10 bg-indigo-800 whitespace-nowrap">Material In Transit</th>
              <th className="px-6 py-4 text-xs font-bold text-white uppercase sticky top-0 z-10 bg-indigo-800 whitespace-nowrap">Expected date of Delivery</th>
              <th className="px-6 py-4 text-xs font-bold text-white uppercase sticky top-0 z-10 bg-indigo-800 whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((item, idx) => (
              <tr 
                key={idx} 
                className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                onClick={() => onRowClick(item)}
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.itemName}</td>
                <td className="px-6 py-4 text-sm font-bold text-indigo-600">{item.totalPending}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-700">{item.totalIndentRaised}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-700">{item.totalPORaised}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-700">{item.totalTransit}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(item.expectedDate)}</td>
                <td className="px-6 py-4 text-sm text-indigo-600 font-semibold underline whitespace-nowrap">View Details</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic">
                  No pending indents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden p-4 space-y-4 overflow-y-auto max-h-[600px] bg-gray-50/50">
        {data.map((item, idx) => (
          <div 
            key={idx} 
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
            onClick={() => onRowClick(item)}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
            <div className="flex flex-col gap-3 pl-2">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Item Name</span>
                <span className="text-sm font-bold text-gray-800 leading-tight block">{item.itemName}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 mt-1">
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Total Pending</span>
                  <span className="text-sm font-black text-indigo-600">{item.totalPending}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Approved Qty</span>
                  <span className="text-sm font-bold text-gray-700">{item.totalIndentRaised}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">PO Raised</span>
                  <span className="text-sm font-bold text-gray-700">{item.totalPORaised}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">In Transit</span>
                  <span className="text-sm font-bold text-gray-700">{item.totalTransit}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Expected Delivery</span>
                  <span className="text-xs font-medium text-gray-600">{formatDate(item.expectedDate)}</span>
                </div>
                <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-semibold h-8" onClick={(e) => { e.stopPropagation(); onRowClick(item); }}>
                  View Details
                </Button>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="text-center text-gray-500 italic p-8 bg-white rounded-xl border border-gray-200">
            No pending indents found.
          </div>
        )}
      </div>
    </Card>
  )
}

function IMSTable({ data, columns, loading, type }: { data: any[]; columns: any[]; loading: boolean; type: string }) {
  if (loading) {
    return (
      <Card className="border border-gray-100 shadow-xl p-12 flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="mt-4 text-gray-500 font-medium">Fetching inventory data...</p>
      </Card>
    )
  }

  const getRelevantHeaders = () => {
    if (columns.length === 0) return []

    // Explicitly target Columns A, B, C and Name of Item
    const coreCols = [
      columns.find(col => col.id === "A"), // GROUP
      columns.find(col => col.id === "B"), // CATEGORY
      columns.find(col => col.id === "C"), // ITEM CODE
      columns.find(col => col.label.toUpperCase().includes("NAME OF ITEM")) || columns.find(col => col.id === "E")
    ].filter(Boolean)

    let targetCols: any[] = []
    if (type === "indent") {
      // Filter for Indent columns (labels containing INDENT but NOT REORDER)
      targetCols = columns.filter((col) =>
        col.label.toUpperCase().includes("INDENT RAISED") &&
        !col.label.toUpperCase().includes("REORDER")
      )
    } else {
      // Filter for Reorder columns (labels containing REORDER)
      targetCols = columns.filter((col) => col.label.toUpperCase().includes("REORDER QUANTITY"))
      
      // Map long formula labels to proper names with the formula in brackets
      const reorderNames = ["CG", "NE", "Maniquip", "Head Office"]
      targetCols = targetCols.map((col, idx) => ({
        ...col,
        label: `${reorderNames[idx] || "Reorder"} (${col.label})`
      }))
    }

    // Remove duplicates
    const finalCols = [...new Set([...coreCols, ...targetCols])]
    return finalCols
  }

  const columnsToShow = getRelevantHeaders()

  return (
    <Card className="border border-gray-100 shadow-xl bg-white overflow-hidden">
      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[600px] relative">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-gradient-to-r from-indigo-800 to-blue-800">
              {columnsToShow.map((col, idx) => (
                <th
                  key={idx}
                  className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap sticky top-0 z-10 bg-indigo-800 border-b border-indigo-700 shadow-[0_1px_0_rgba(0,0,0,0.1)]"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.length > 0 ? (
              data.map((item, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-indigo-50/30 transition-colors group">
                  {columnsToShow.map((col, colIdx) => {
                    const val = item[`col_${col.id}`]
                    const isNumber = !isNaN(val) && val !== ""
                    const numVal = parseFloat(val)

                    return (
                      <td key={colIdx} className={`px-6 py-4 text-sm ${colIdx === 0 ? "font-bold text-indigo-700" : "text-gray-600"} whitespace-nowrap border-b border-gray-100`}>
                        {type === "reorder" && isNumber && numVal > 0 ? (
                          <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-bold border border-red-200">
                            {val}
                          </span>
                        ) : (
                          val
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnsToShow.length || 1} className="px-6 py-12 text-center text-gray-500 font-medium">
                  No inventory records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden p-4 space-y-4 overflow-y-auto max-h-[600px] bg-gray-50/50">
        {data.length > 0 ? (
          data.map((item, rowIdx) => (
            <div key={rowIdx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
              <div className="grid grid-cols-1 gap-3 pl-2">
                {columnsToShow.map((col, colIdx) => {
                  const val = item[`col_${col.id}`]
                  const isNumber = !isNaN(val) && val !== ""
                  const numVal = parseFloat(val)
                  
                  return (
                    <div key={colIdx} className="flex flex-col border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{col.label}</span>
                      <span className={`text-sm ${colIdx === 0 ? "font-bold text-indigo-800" : "text-gray-800"}`}>
                        {type === "reorder" && isNumber && numVal > 0 ? (
                          <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-bold border border-red-200 inline-block mt-1">
                            {val}
                          </span>
                        ) : (
                          val || "-"
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 italic p-8 bg-white rounded-xl border border-gray-200">
            No records found.
          </div>
        )}
      </div>
    </Card>
  )
}
