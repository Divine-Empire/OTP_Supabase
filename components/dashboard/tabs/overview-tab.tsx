import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, AlertCircle, FileText, ClipboardCheck } from "lucide-react"
import { OrderStatusChart } from "@/components/dashboard/charts/order-status-chart"
import { MonthlyTrendChart } from "@/components/dashboard/charts/monthly-trend-chart"
import { TopCustomers } from "@/components/dashboard/top-customers"

interface OverviewTabProps {
  data: any
}

export function OverviewTab({ data }: OverviewTabProps) {
  // Provide default values to prevent undefined errors
  const safeData = {
    completedRevenue: 0,
    pendingRevenue: 0,
    invoiceGenerated: 0,
    approvalPending: 0,
    monthlyData: [],
    topCustomers: [],
    ...data // Spread the actual data to override defaults
  }

  return (
    <div className="space-y-4">
      {/* Revenue & Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(safeData.completedRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Revenue from completed orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(safeData.pendingRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Revenue from pending orders</p>
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Generated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeData.invoiceGenerated || 0}</div>
            <p className="text-xs text-muted-foreground">Invoices created</p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approvals Pending</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeData.approvalPending || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card> */}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <OrderStatusChart data={safeData} />
        <MonthlyTrendChart data={safeData.monthlyData || []} />
      </div>

      {/* Top Customers */}
      <TopCustomers customers={safeData.topCustomers || []} />
    </div>
  )
}