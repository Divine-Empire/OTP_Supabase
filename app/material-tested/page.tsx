"use client"

import { useState, useEffect, useMemo, Fragment } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Search,
  FlaskConical,
  RefreshCw,
  XCircle,
  Package,
  ChevronDown,
  ChevronUp,
  Eye
} from "lucide-react"
import { toast } from "sonner"
import { MainLayout } from "@/components/layout/main-layout"

interface FlatMaterialTested {
  indentNo: string
  liftNo: string
  machineName: string
  serialNo: string
  qrCode: string
}

export default function MaterialTestedPage() {
  const [data, setData] = useState<FlatMaterialTested[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/material-tested")
      const result = await response.json()
      
      if (result && result.success && Array.isArray(result.data)) {
        setData(result.data)
      } else {
        console.error("Fetch error or bad format:", result.error)
        toast.error(result.error || "Failed to fetch material tested records")
      }
    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast.error("Failed to connect to backend server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Toggle expansion for a grouped row
  const toggleRow = (key: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Process data with search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data

    const search = searchTerm.toLowerCase()
    return data.filter(row => 
      (row.indentNo || "").toLowerCase().includes(search) ||
      (row.liftNo || "").toLowerCase().includes(search) ||
      (row.machineName || "").toLowerCase().includes(search) ||
      (row.serialNo || "").toLowerCase().includes(search)
    )
  }, [data, searchTerm])

  // Group data by liftNo and machineName
  const groupedData = useMemo(() => {
    const groups: Record<string, {
      indentNo: string
      liftNo: string
      machineName: string
      items: { serialNo: string; qrCode: string }[]
    }> = {}

    filteredData.forEach(row => {
      const key = `${row.liftNo || ""}_${row.machineName || ""}`
      if (!groups[key]) {
        groups[key] = {
          indentNo: row.indentNo || "-",
          liftNo: row.liftNo || "-",
          machineName: row.machineName || "-",
          items: []
        }
      }
      if (row.serialNo) {
        groups[key].items.push({
          serialNo: row.serialNo,
          qrCode: row.qrCode
        })
      }
    })

    return Object.values(groups)
  }, [filteredData])

  return (
    <MainLayout>
      <div className="space-y-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
        
        {/* Header Section */}
        <Card className="border border-indigo-100 bg-white/80 backdrop-blur-sm shadow-md">
          <CardHeader className="p-4 pb-3">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                    <FlaskConical className="h-6 w-6 text-indigo-600 animate-pulse" />
                    Material Tested QC Records
                  </CardTitle>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                    <Input
                      placeholder="Search indent, lift, machine, serial..."
                      className="pl-10 border-indigo-100 focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Button 
                    onClick={fetchData} 
                    disabled={loading}
                    variant="outline"
                    className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 shadow-sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>

            </div>
          </CardHeader>
        </Card>

        {/* Main List Table */}
        {loading ? (
          <Card className="p-12 flex flex-col items-center justify-center bg-white border border-indigo-100 shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <p className="mt-4 text-gray-500 font-medium">Loading tested materials database...</p>
          </Card>
        ) : (
          <div className="bg-white border border-indigo-100 rounded-xl shadow-md overflow-hidden">
            {groupedData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-indigo-50/50 text-indigo-900 font-bold border-b border-indigo-100">
                    <tr>
                      <th className="w-12 px-6 py-4"></th>
                      <th className="px-6 py-4">Indent No.</th>
                      <th className="px-6 py-4">Lift No.</th>
                      <th className="px-6 py-4">Machine Name</th>
                      <th className="px-6 py-4 text-right">Serials Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {groupedData.map((group) => {
                      const key = `${group.liftNo}_${group.machineName}`
                      const isExpanded = !!expandedRows[key]
                      
                      return (
                        <Fragment key={key}>
                          <tr 
                            className="hover:bg-indigo-50/20 transition-colors duration-150 cursor-pointer select-none"
                            onClick={() => toggleRow(key)}
                          >
                            <td className="px-6 py-4 text-center">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-indigo-600 inline" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-indigo-600 inline" />
                              )}
                            </td>
                            <td className="px-6 py-4 font-semibold text-indigo-950 whitespace-nowrap">
                              {group.indentNo}
                            </td>
                            <td className="px-6 py-4 font-semibold text-indigo-950 whitespace-nowrap">
                              {group.liftNo}
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {group.machineName}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {group.items.length} {group.items.length === 1 ? 'Serial' : 'Serials'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/60 border-t border-b border-gray-100">
                              <td colSpan={5} className="p-4">
                                <div className="pl-12 pr-6 py-2 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">          
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {group.items.map((item, idx) => (
                                      <div 
                                        key={idx} 
                                        className="flex items-center justify-between p-3 bg-white border border-gray-150 rounded-lg shadow-sm hover:border-indigo-200 hover:shadow transition-all duration-150"
                                      >
                                        <div className="flex flex-col">
                                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Serial No.</span>
                                          <span className="font-mono text-sm font-semibold text-gray-700">{item.serialNo || "-"}</span>
                                        </div>
                                        {item.qrCode ? (
                                          <a 
                                            href={item.qrCode} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="inline-flex items-center justify-center h-8 w-8 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-full border border-indigo-100 transition-colors shadow-sm"
                                            title="View QR"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </a>
                                        ) : (
                                          <span className="text-gray-400 text-xs italic">No Link</span>
                                        )}
                                      </div>
                                    ))}
                                    
                                    {group.items.length === 0 && (
                                      <div className="col-span-full text-sm text-gray-400 italic py-2">
                                        No serial numbers associated.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Card className="p-16 text-center bg-white border-0 flex flex-col items-center justify-center">
                <Package className="h-12 w-12 text-indigo-300 mb-4" />
                <h3 className="text-lg font-bold text-indigo-950 mb-1">No Material Tested Records Found</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  {searchTerm 
                    ? `We couldn't find any records matching "${searchTerm}". Try refinement or clear filters.`
                    : "No records found where Working Condition is 'Passed' or 'Passed but Concern'."}
                </p>
                {searchTerm && (
                  <Button 
                    variant="link" 
                    className="text-indigo-600 font-bold mt-4"
                    onClick={() => setSearchTerm("")}
                  >
                    Clear Search Filter
                  </Button>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
