import { DispatchSummary } from "@/components/dashboard/dispatch/dispatch-summary"
import { DispatchCharts } from "@/components/dashboard/dispatch/dispatch-charts"
import { DispatchTables } from "@/components/dashboard/dispatch/dispatch-tables"
import { DispatchMetrics } from "@/components/dashboard/dispatch/dispatch-metrics"

interface DispatchTabProps {
  data: any
}

export function DispatchTab({ data }: DispatchTabProps) {
  return (
    <div className="space-y-4">
      {/* <DispatchSummary data={data} /> */}
      <DispatchCharts data={data} />
      <DispatchTables data={data} />
      {/* <DispatchMetrics data={data} /> */}
    </div>
  )
}
