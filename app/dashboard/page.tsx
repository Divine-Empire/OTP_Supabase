"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { ShoppingCart, CalendarDays, Hourglass, IndianRupee, Receipt } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MonthlyTrendChart } from "@/components/dashboard/charts/monthly-trend-chart"
import { LoadingSpinner } from "@/components/dashboard/loading-spinner"
import { DelayReportCard } from "@/components/dashboard/delay-report-card"
import { ErrorDisplay } from "@/components/dashboard/error-display"
import { MetricCard } from "@/components/dashboard/metrics-cards"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { MainLayout } from "@/components/layout/main-layout"

const PIE_COLORS = ["#2274B8", "#E8702A", "#6C5CC9", "#6A9E0A", "#D6578C", "#B07D00", "#8A9BB0"]

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export default function OrderDispatchDashboard() {
  const { dashboardData, loading, error, fetchAllData } = useDashboardData()

  if (loading) {
    return (
      <MainLayout>
        <LoadingSpinner />
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <ErrorDisplay error={error} onRetry={fetchAllData} />
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <DashboardHeader onRefresh={fetchAllData} />

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              title="Total Orders"
              value={dashboardData.totalOrders}
              subtitle="All orders"
              tone="brand"
              icon={<ShoppingCart className="h-5 w-5" />}
            />
            <MetricCard
              title="Orders This Month"
              value={dashboardData.ordersThisMonth}
              subtitle="Converted this month"
              tone="info"
              icon={<CalendarDays className="h-5 w-5" />}
            />
            <MetricCard
              title="Pending Across Pipeline"
              value={dashboardData.totalPending}
              subtitle="Sum of stage pending queues"
              tone="warning"
              icon={<Hourglass className="h-5 w-5" />}
            />
            <MetricCard
              title="Total Order Value"
              value={formatCurrency(dashboardData.totalOrderValue)}
              subtitle="Sum of order amounts"
              tone="brand"
              icon={<IndianRupee className="h-5 w-5" />}
            />
            <MetricCard
              title="Invoiced Revenue"
              value={formatCurrency(dashboardData.totalInvoicedRevenue)}
              subtitle="From Make Invoice"
              tone="lime"
              icon={<Receipt className="h-5 w-5" />}
            />
          </div>

          <DelayReportCard />

          {/* Charts row */}
          <div className="grid gap-6 md:grid-cols-2">
            <MonthlyTrendChart data={dashboardData.monthlyTrend} />

            <Card>
              <CardHeader>
                <CardTitle>Payment Mode Breakdown</CardTitle>
                <CardDescription>Distribution across payment channels</CardDescription>
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
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} aria-label={`${dashboardData.paymentModeData[index].name}: ${dashboardData.paymentModeData[index].value}`} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }} />
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
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar dataKey="value" fill="#2274B8" radius={[0, 4, 4, 0]} />
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
                          <TableCell className="font-medium text-foreground">{order.orderNo}</TableCell>
                          <TableCell className="max-w-[160px] truncate text-foreground">{order.companyName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{order.paymentMode || "N/A"}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium text-foreground">{formatCurrency(order.amount)}</TableCell>
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
