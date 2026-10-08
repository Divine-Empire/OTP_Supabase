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
  FileCheck2,
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
const PENDING_COUNTS_TTL_MS = 25_000

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
    href: "/bilty-upload",
    label: "Bilty Upload",
    icon: FileCheck2,
    step: "bilty-upload",
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

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  // Same rule as lib/access.ts: admins, and users with no location yet, see
  // every location's counts.
  const countsLocation =
    user && user.role !== "admin" && user.location && user.location !== ALL_LOCATIONS ? user.location : "";
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>(
    pendingCountsCacheKey === countsLocation ? pendingCountsCache || {} : {}
  );

  useEffect(() => {
    const isFresh =
      pendingCountsCache &&
      pendingCountsCacheKey === countsLocation &&
      Date.now() - pendingCountsCacheAt < PENDING_COUNTS_TTL_MS;
    if (isFresh) return; // cache already applied as initial state above — nothing to do

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

  const SidebarContent = () => (
    // <div className="flex flex-col h-full from-blue-50 to-purple-500 border-r border-gray-200">
    <div className="flex flex-col h-full border-r border-gray-200">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-b from-blue-50 to-purple-50 ">
        <h2 className="text-lg font-semibold text-purple-600">Order to Payment</h2>
        <p className="text-sm text-gray-600">Divine Empire</p>
        {/* <div className="text-red-900 mt-4 rounded-xl hover:bg-blue-700 hover:text-white p-1 cursor-pointer text-start">
          <a
            href="https://service-installation.vercel.app/"
            className="font-bold"
            target="_black"
          >
            Service Installation Here
          </a>
        </div> */}
      </div>

      <ScrollArea className="flex-1 px-3 bg-gradient-to-b from-blue-50 to-purple-50 ">
        <div className="space-y-1 py-4">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const pendingCount = pendingCounts[item.step];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-gray-100 ${
                  isActive
                    ? "bg-gradient-to-b from-blue-50 to-purple-100  text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {!!pendingCount && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-purple-600 text-white text-xs font-semibold">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </ScrollArea>
      <div className="border-t border-gray-200 bg-gradient-to-br from-blue-50/70 via-purple-50/70 to-indigo-50/70">
        {/* User Info */}
        <div className="p-3 pb-4">
          <div className="flex items-center gap-3 px-3 py-2 text-sm">
            <div className="flex-1">
              <p className="font-medium text-gray-900">{user?.fullName}</p>
              <p className="text-xs text-gray-600">{user?.role}</p>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full justify-start gap-3 mt-2 text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 transition-all duration-200"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64" aria-describedby={undefined}>
          <VisuallyHidden>
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>OTP System Navigation Menu</SheetDescription>
          </VisuallyHidden>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
