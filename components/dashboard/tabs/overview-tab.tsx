import { FileText } from "lucide-react"
import { OrderStatusChart } from "@/components/dashboard/charts/order-status-chart"
import { MonthlyTrendChart } from "@/components/dashboard/charts/monthly-trend-chart"
import { TopCustomers } from "@/components/dashboard/top-customers"
import { MetricCard } from "@/components/dashboard/metrics-cards"

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
    ...data, // Spread the actual data to override defaults
  }

  return (
    <div className="space-y-4">
      {/* Revenue & Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Invoices Generated"
          value={safeData.invoiceGenerated || 0}
          subtitle="Invoices created"
          tone="brand"
          icon={<FileText className="h-5 w-5" />}
        />
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