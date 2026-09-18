"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
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
  Warehouse,
  PackageCheck,
  Award,
  Bell,
  Settings,
  LogOut,
  Menu,
  ReceiptText,
  XOctagon,
  FlaskConical,
} from "lucide-react";

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
    href: "/check-inventory",
    label: "Check Inventory",
    icon: Package,
    step: "check-inventory",
  },
  {
    href: "/material-received",
    label: "Material Received",
    icon: Package,
    step: "material-received",
  },
  {
    href: "/pre-invoice",
    label: "Pre Invoice Details",
    icon: FileText,
    step: "pre-invoice",
  },
  {
    href: "/make-invoice",
    label: "Make Invoice",
    icon: Receipt,
    step: "make-invoice",
  },
  // { href: "/make-pi", label: "Make PI", icon: FileSpreadsheet, step: "make-pi" },
  {
    href: "/warehouse",
    label: "Warehouse (Material RCVD)",
    icon: PackageCheck,
    step: "warehouse",
  },
    {
      href: "/calibration",
      label: "Calibration Certificate",
      icon: Award,
      step: "calibration",
    },
    {
      href: "/update-delivery",
      label: "Update Delivery",
      icon: Bell,
      step: "update-delivery",
    },
    {
      href: "/order-cancel",
      label: "Order Cancel",
      icon: XOctagon,
      step: "order-cancel",
    },
    {
      href: "/credit-note",
      label: "Credit Note",
      icon: ReceiptText,
      step: "credit-note",
    },
    {
      href: "/ims",
      label: "IMS",
      icon: Package,
      step: "ims",
    },
    {
      href: "/material-tested",
      label: "Material Tested",
      icon: FlaskConical,
      step: "material-tested",
    },
  { href: "/settings", label: "Settings", icon: Settings, step: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const filteredMenuItems = menuItems.filter((item) => {
    if (user?.role === "admin") return true;
    return (
      user?.assignedSteps.includes(item.step) ||
      user?.assignedSteps.includes("all") ||
      item.step === "ims" ||
      item.step === "material-tested"
    );
  });

  const SidebarContent = () => (
    // <div className="flex flex-col h-full from-blue-50 to-purple-500 border-r border-gray-200">
    <div className="flex flex-col h-full border-r border-gray-200">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-b from-blue-50 to-purple-50 ">
        <h2 className="text-lg font-semibold text-purple-600">OTP System</h2>
        <p className="text-sm text-gray-600">Order To Payment</p>
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
                {item.label}
              </Link>
            );
          })}
        </div>
      </ScrollArea>
      <div className="border-t border-gray-200 bg-gradient-to-br from-blue-50/70 via-purple-50/70 to-indigo-50/70">
        {/* User Info */}
        <div className="p-3 pb-2">
          <div className="flex items-center gap-3 px-3 py-2 text-sm">
            <div className="flex-1">
              <p className="font-medium text-gray-900">{user?.fullName}</p>
              <p className="text-xs text-gray-600">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 mt-2 text-gray-700 hover:bg-white/70 hover:text-gray-900 transition-all duration-200"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Powered by Botivate */}
        <div className="px-3 pb-4">
          <div className="bg-white/40 backdrop-blur-sm border border-gray-200/50 rounded-lg p-3 text-center shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Powered by</div>
            <a
              href="https://www.botivate.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:scale-105"
            >
              Botivate
              <svg
                className="w-3 h-3 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
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
