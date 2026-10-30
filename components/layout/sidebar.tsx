"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ALL_LOCATIONS } from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription, VisuallyHidden } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  ClipboardCheck,
  Package,
  FileText,
  Receipt,
  FileSpreadsheet,
  Award,
  Settings,
  LogOut,
  Menu,
  FileMinus,
  Truck,
  XCircle,
  UserCheck,
  Banknote,
} from "lucide-react";

// Module-scoped (not component state) so it survives Sidebar's own
// unmount/remount on every page navigation (MainLayout is wrapped inside
// each page.tsx, not a persistent layout.tsx segment, so Sidebar actually
// remounts on every route change). Without this, every single navigation
// re-ran pending-counts' own 14-query Supabase fan-out. A client just
// reuses whatever's in cache for PENDING_COUNTS_TTL_MS, falling back to a
// stale-while-revalidate fetch after that instead of a blocking one.
let pendingCountsCache: Record<string, number> | null = null
let pendingCountsCacheAt = 0
let pendingCountsCacheKey = ""
const PENDING_COUNTS_TTL_MS = 45_000

export function invalidateSidebarPendingCounts() {
  pendingCountsCacheAt = 0
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("otp:invalidate-pending-counts"))
  }
}

const menuItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    step: "dashboard",
  },
  {
    href: "/order-acceptable",
    label: "Order Acceptable",
    icon: ClipboardCheck,
    step: "order-acceptable",
  },
  {
    href: "/proforma-invoice",
    label: "Pro-Forma Invoice",
    icon: FileSpreadsheet,
    step: "proforma-invoice",
  },
  {
    href: "/packing-list",
    label: "Packing List",
    icon: Package,
    step: "packing-list",
  },
  {
    href: "/indent-creation",
    label: "Indent Creation",
    icon: Package,
    step: "indent-creation",
  },
  {
    href: "/pre-invoice",
    label: "Pre Invoice Details",
    icon: FileText,
    step: "pre-invoice",
  },
  {
    href: "/delivery-note-for-invoice",
    label: "Delivery Note (Inv.)",
    icon: FileMinus,
    step: "delivery-note-for-invoice",
  },
  {
    href: "/make-invoice",
    label: "Make Invoice",
    icon: Receipt,
    step: "make-invoice",
  },
  {
    href: "/calibration",
    label: "Calibration Certificate",
    icon: Award,
    step: "calibration",
  },
  {
    href: "/packaging-transport",
    label: "Packaging and Dispatch",
    icon: Truck,
    step: "packaging-transport",
  },
  {
    href: "/client-confirmation",
    label: "Client Confirmation",
    icon: UserCheck,
    step: "client-confirmation",
  },
    {
      href: "/delivery-note",
      label: "Delivery Note",
      icon: FileMinus,
      step: "delivery-note",
    },
  {
    href: "/credit-note",
    label: "Credit Note",
    icon: Banknote,
    step: "credit-note",
  },
  {
    href: "/order-cancel",
    label: "Order Cancel",
    icon: XCircle,
    step: "order-cancel",
  },
  { href: "/settings", label: "Settings", icon: Settings, step: "settings" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof mobileOpen === "boolean";
  const open = isControlled ? mobileOpen : internalOpen;
  const setOpen = isControlled && onMobileOpenChange ? onMobileOpenChange : setInternalOpen;
  // Same rule as lib/access.ts: admins, and users with no location yet, see
  // every location's counts.
  const countsLocation =
    user && user.role !== "admin" && user.location && user.location !== ALL_LOCATIONS ? user.location : "";
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>(
    pendingCountsCacheKey === countsLocation ? pendingCountsCache || {} : {}
  );

  useEffect(() => {
    const fetchCounts = () => {
      const query = countsLocation ? `?location=${encodeURIComponent(countsLocation)}` : "";
      fetch(`/api/otp-supabase/pending-counts${query}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            pendingCountsCache = result.data;
            pendingCountsCacheAt = Date.now();
            pendingCountsCacheKey = countsLocation;
            setPendingCounts(result.data);
          }
        })
        .catch((err) => console.error("Error fetching sidebar pending counts:", err));
    };

    const isFresh =
      pendingCountsCache &&
      pendingCountsCacheKey === countsLocation &&
      Date.now() - pendingCountsCacheAt < PENDING_COUNTS_TTL_MS;
    if (!isFresh) {
      fetchCounts();
    }

    const handleInvalidate = () => {
      fetchCounts();
    };

    window.addEventListener("otp:invalidate-pending-counts", handleInvalidate);
    return () => window.removeEventListener("otp:invalidate-pending-counts", handleInvalidate);
  }, [countsLocation]);

  const filteredMenuItems = menuItems.filter((item) => {
    if (user?.role === "admin") return true;
    // Settings is admin-only regardless of assignedSteps — the page itself
    // already enforces this (app/settings/page.tsx's Access Denied guard),
    // this just keeps a non-admin from seeing a dead-end link to it.
    if (item.step === "settings") return false;
    return (
      user?.assignedSteps.includes(item.step) ||
      user?.assignedSteps.includes("all")
    );
  });

  // A plain element (not an inner component): defining a component inside render
  // makes React remount the whole sidebar every render.
  const sidebarContent = (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4 bg-card">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src="/divine-logo.svg" alt="Divine" className="h-8 w-auto shrink-0" />
          <div className="leading-tight">
            <p className="text-l font-semibold text-foreground">Order to Payment</p>
            <p className="text-sm text-muted-foreground">Divine</p>
          </div>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        <nav aria-label="Main navigation" className="space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const pendingCount = pendingCounts[item.step];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex h-9 items-center justify-between rounded-md px-3 text-sm transition-colors ${
                  isActive
                    ? "bg-accent font-medium text-foreground before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-0.5 before:rounded-full before:bg-brand-lime"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                {!!pendingCount && (
                  <span className="ml-2 shrink-0 rounded bg-primary/10 px-1.5 text-xs font-semibold tabular-nums text-brand-700">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-3 bg-card">
        <div className="flex items-center gap-2.5 px-1 py-1 text-sm mb-1.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
            aria-hidden="true"
          >
            {(user?.fullName?.[0] || user?.username?.[0] || "U").toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-medium text-foreground text-sm">{user?.fullName || user?.username}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside aria-label="Sidebar" className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        {!isControlled && (
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
        )}
        <SheetContent side="left" className="p-0 w-64" aria-describedby={undefined}>
          <VisuallyHidden>
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>OTP System Navigation Menu</SheetDescription>
          </VisuallyHidden>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
