import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TopCustomersProps {
  customers: Array<{
    name: string
    orders: number
    revenue: number
  }>
}

export function TopCustomers({ customers }: TopCustomersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Customers</CardTitle>
        <CardDescription>Based on total revenue</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {customers.map((customer, index) => (
            <div key={customer.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline">{index + 1}</Badge>
                <div>
                  <p className="text-sm font-medium">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.orders} orders</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">₹{customer.revenue.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
