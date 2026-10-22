import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"

interface OrderStatusChartProps {
  data: any
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  const orderStatusData = [
    { name: "Completed", value: data.completedOrders, color: "#6A9E0A" },
    { name: "Pending", value: data.pendingOrders, color: "#E8702A" },
    { name: "Cancelled", value: data.cancelOrders, color: "#D6578C" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={orderStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              dataKey="value"
            >
              {orderStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} aria-label={`${entry.name}: ${entry.value}`} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
