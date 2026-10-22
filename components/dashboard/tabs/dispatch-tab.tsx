import { DispatchCharts } from "@/components/dashboard/dispatch/dispatch-charts"
import { DispatchTables } from "@/components/dashboard/dispatch/dispatch-tables"

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
