import React from "react"
import { ShoppingCart, CheckCircle, Truck, Clock, XCircle, IndianRupee } from "lucide-react"

export type MetricTone = "brand" | "info" | "warning" | "lime" | "success" | "destructive"

const TONES: Record<MetricTone, { chip: string; bar: string }> = {
  brand: { chip: "bg-primary/10 text-primary", bar: "bg-primary" },
  info: { chip: "bg-info/10 text-info", bar: "bg-info" },
  warning: { chip: "bg-warning/15 text-warning-foreground", bar: "bg-warning" },
  lime: { chip: "bg-brand-lime/20 text-success", bar: "bg-brand-lime" },
  success: { chip: "bg-success/10 text-success", bar: "bg-success" },
  destructive: { chip: "bg-destructive/10 text-destructive", bar: "bg-destructive" },
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone = "brand",
}: {
  title: string
  value: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  tone?: MetricTone
}) {
  const t = TONES[tone] || TONES.brand
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-4 shadow-xs">
      <span className={`absolute inset-y-0 left-0 w-1 ${t.bar}`} aria-hidden="true" />
      <div className="ml-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold leading-8 tabular-nums text-foreground">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${t.chip}`}>
            {icon}
          </span>
        )}
      </div>
    </div>
  )
}

interface MetricsCardsProps {
  data: {
    totalOrders: number
    completedOrders: number
    deliveredOrders: number
    totalRevenue: number
    pendingOrders: number
    cancelOrders: number
    // Dispatch-specific metrics
    totalDispatches: number
    pendingDispatches: number
    completedDispatches: number
    dispatchRevenue: number
  }
  activeTab: string
}

export function MetricsCards({ data, activeTab }: MetricsCardsProps) {
  // Show different metrics based on active tab
  const isDispatchOrAnalytics = activeTab === "dispatch" || activeTab === "analytics"

  if (isDispatchOrAnalytics) {
    const pendingRate = data.totalDispatches > 0 ? ((data.pendingDispatches / data.totalDispatches) * 100).toFixed(1) : "0"
    const successRate = data.totalDispatches > 0 ? ((data.completedDispatches / data.totalDispatches) * 100).toFixed(1) : "0"

    return (
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Dispatch"
          value={data.totalDispatches}
          subtitle="All dispatches"
          tone="brand"
          icon={<Truck className="h-5 w-5" />}
        />
        <MetricCard
          title="Pending Dispatch"
          value={data.pendingDispatches}
          subtitle={`Pending rate: ${pendingRate}%`}
          tone="warning"
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Complete Dispatch"
          value={data.completedDispatches}
          subtitle={`Success rate: ${successRate}%`}
          tone="success"
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Dispatch Revenue"
          value={`₹${data.dispatchRevenue.toLocaleString("en-IN", { maximumFractionDigits: 1 })}`}
          subtitle="Dispatch earnings"
          tone="lime"
          icon={<IndianRupee className="h-5 w-5" />}
        />
      </div>
    )
  }

  // Default metrics for overview and orders tabs
  const successRate = data.totalOrders > 0 ? ((data.completedOrders / data.totalOrders) * 100).toFixed(1) : "0"
  const cancelRate = data.totalOrders > 0 ? ((data.cancelOrders / data.totalOrders) * 100).toFixed(1) : "0"
  const pendingRate = data.totalOrders > 0 ? ((data.pendingOrders / data.totalOrders) * 100).toFixed(1) : "0"
  const deliveryRate = data.totalOrders > 0 ? ((data.deliveredOrders / data.totalOrders) * 100).toFixed(1) : "0"

  return (
    <div className="grid gap-4 md:grid-cols-6">
      <MetricCard
        title="Total Orders"
        value={data.totalOrders}
        subtitle="All orders"
        tone="brand"
        icon={<ShoppingCart className="h-5 w-5" />}
      />
      <MetricCard
        title="Completed Orders"
        value={data.completedOrders}
        subtitle={`Success rate: ${successRate}%`}
        tone="success"
        icon={<CheckCircle className="h-5 w-5" />}
      />
      <MetricCard
        title="Cancelled Orders"
        value={data.cancelOrders}
        subtitle={`Cancel rate: ${cancelRate}%`}
        tone="destructive"
        icon={<XCircle className="h-5 w-5" />}
      />
      <MetricCard
        title="Pending Orders"
        value={data.pendingOrders}
        subtitle={`Pending rate: ${pendingRate}%`}
        tone="warning"
        icon={<Clock className="h-5 w-5" />}
      />
      <MetricCard
        title="Material Return"
        value={data.deliveredOrders}
        subtitle={`Delivery rate: ${deliveryRate}%`}
        tone="info"
        icon={<Truck className="h-5 w-5" />}
      />
      <MetricCard
        title="Revenue"
        value={`₹${data.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 1 })}`}
        subtitle="Total earnings"
        tone="lime"
        icon={<IndianRupee className="h-5 w-5" />}
      />
    </div>
  )
}