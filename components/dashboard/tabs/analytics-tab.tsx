import { AnalyticsCharts } from "@/components/dashboard/charts/analytics-charts"

interface AnalyticsTabProps {
  data: any
}

export function AnalyticsTab({ data }: AnalyticsTabProps) {
  return (
    <div className="space-y-4">
      <AnalyticsCharts data={data} />
    </div>
  )
}
