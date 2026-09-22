"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { ShoppingCart, CalendarDays, Hourglass, IndianRupee, Receipt } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MonthlyTrendChart } from "@/components/dashboard/charts/monthly-trend-chart"
import { LoadingSpinner } from "@/components/dashboard/loading-spinner"
import { ErrorDisplay } from "@/components/dashboard/error-display"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { MainLayout } from "@/components/layout/main-layout"

const PIE_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"]

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export default function OrderDispatchDashboard() {
  const { dashboardData, loading, error, fetchAllData } = useDashboardData()

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchAllData} />
  }

  const maxPending = Math.max(1, ...dashboardData.pipelineStages.map((s) => s.pending))

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <DashboardHeader onRefresh={fetchAllData} />

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalOrders}</div>
                <p className="text-xs opacity-80">All orders</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-violet-500 to-violet-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders This Month</CardTitle>
                <CalendarDays className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.ordersThisMonth}</div>
                <p className="text-xs opacity-80">Converted this calendar month</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Across Pipeline</CardTitle>
                <Hourglass className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalPending}</div>
                <p className="text-xs opacity-80">Sum of every stage's pending queue</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Order Value</CardTitle>
                <IndianRupee className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalOrderValue)}</div>
                <p className="text-xs opacity-80">Sum of order amounts</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invoiced Revenue</CardTitle>
                <Receipt className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalInvoicedRevenue)}</div>
                <p className="text-xs opacity-80">From Make Invoice</p>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Overview</CardTitle>
              <CardDescription>Pending count at each stage, live from the database</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.pipelineStages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pipeline data yet.</p>
              ) : (
                <div className="space-y-3">
                  {dashboardData.pipelineStages.map((stage) => (
                    <div key={stage.key} className="flex items-center gap-3">
                      <div className="w-44 shrink-0 text-sm font-medium text-slate-700">{stage.label}</div>
                      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                          style={{ width: `${(stage.pending / maxPending) * 100}%` }}
                        />
                      </div>
                      <div className="w-10 text-right text-sm font-semibold text-slate-900">{stage.pending}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charts row */}
          <div className="grid gap-6 md:grid-cols-2">
            <MonthlyTrendChart data={dashboardData.monthlyTrend} />

            <Card>
              <CardHeader>
                <CardTitle>Payment Mode Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData.paymentModeData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dashboardData.paymentModeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        dataKey="value"
                      >
                        {dashboardData.paymentModeData.map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Customers + Recent Orders */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>By total order value</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.topCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dashboardData.topCustomers} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest 10 orders converted</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order No.</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.recentOrders.map((order) => (
                        <TableRow key={order.orderNo}>
                          <TableCell className="font-medium">{order.orderNo}</TableCell>
                          <TableCell className="max-w-[160px] truncate">{order.companyName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{order.paymentMode || "N/A"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(order.amount)}</TableCell>
                        </TableRow>
                      ))}
                      {dashboardData.recentOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No orders yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
