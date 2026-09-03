import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, CheckCircle, Clock, TrendingUp } from "lucide-react"

interface DispatchSummaryProps {
  data: any
}

export function DispatchSummary({ data }: DispatchSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Dispatched</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.dispatchComplete + data.pendingOrders}</div>
          <p className="text-xs text-muted-foreground">All dispatch orders</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Dispatch Complete</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{data.dispatchComplete}</div>
          <p className="text-xs text-muted-foreground">Successfully dispatched</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Dispatch Pending</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{data.pendingOrders}</div>
          <p className="text-xs text-muted-foreground">Awaiting dispatch</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.dispatchComplete + data.pendingOrders > 0
              ? ((data.dispatchComplete / (data.dispatchComplete + data.pendingOrders)) * 100).toFixed(1)
              : 0}
            %
          </div>
          <p className="text-xs text-muted-foreground">Dispatch efficiency</p>
        </CardContent>
      </Card>
    </div>
  )
}
