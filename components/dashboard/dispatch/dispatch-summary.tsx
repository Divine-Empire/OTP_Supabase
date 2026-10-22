import { Truck, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { MetricCard } from "@/components/dashboard/metrics-cards"

interface DispatchSummaryProps {
  data: any
}

export function DispatchSummary({ data }: DispatchSummaryProps) {
  const total = (data.dispatchComplete || 0) + (data.pendingOrders || 0)
  const rate = total > 0 ? (((data.dispatchComplete || 0) / total) * 100).toFixed(1) : "0"

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <MetricCard
        title="Total Dispatched"
        value={total}
        subtitle="All dispatch orders"
        tone="brand"
        icon={<Truck className="h-5 w-5" />}
      />
      <MetricCard
        title="Dispatch Complete"
        value={data.dispatchComplete || 0}
        subtitle="Successfully dispatched"
        tone="success"
        icon={<CheckCircle className="h-5 w-5" />}
      />
      <MetricCard
        title="Dispatch Pending"
        value={data.pendingOrders || 0}
        subtitle="Awaiting dispatch"
        tone="warning"
        icon={<Clock className="h-5 w-5" />}
      />
      <MetricCard
        title="Completion Rate"
        value={`${rate}%`}
        subtitle="Dispatch efficiency"
        tone="lime"
        icon={<TrendingUp className="h-5 w-5" />}
      />
    </div>
  )
}
