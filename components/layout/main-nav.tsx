"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

function initials(name?: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "U";
}

const PAGE_METADATA: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Order to Payment Dashboard",
    description: "Live operational overview and fulfillment status across all stages",
  },
  "/order-acceptable": {
    title: "Order Acceptable",
    description: "Review and accept incoming sales orders against checklist criteria",
  },
  "/proforma-invoice": {
    title: "Pro-Forma Invoice",
    description: "Manage PI generation, documentation, and customer approvals",
  },
  "/packing-list": {
    title: "Packing List",
    description: "Prepare packing lists and warehouse material handovers",
  },
  "/indent-creation": {
    title: "Indent Creation",
    description: "Generate material purchase indents with order attribution",
  },
  "/pre-invoice": {
    title: "Pre Invoice Details",
    description: "Review stock releases, wave queues, and debit note paths",
  },
  "/delivery-note-for-invoice": {
    title: "Delivery Note (Inv.)",
    description: "Process delivery notes requiring subsequent invoice creation",
  },
  "/make-invoice": {
    title: "Make Invoice",
    description: "Tax invoice generation, verification, and ledger posting",
  },
  "/calibration": {
    title: "Calibration Certificate",
    description: "Track testing certifications and quality approvals",
  },
  "/packaging-transport": {
    title: "Packaging and Dispatch",
    description: "Driver assignment, photo verification, and freight preparation",
  },
  "/client-confirmation": {
    title: "Client Confirmation",
    description: "Verify physical site receipt and on-site contact details",
  },
  "/delivery-note": {
    title: "Delivery Note",
    description: "Terminal delivery note processing",
  },
  "/credit-note": {
    title: "Credit Note",
    description: "Credit adjustments and accounting settlements",
  },
  "/order-cancel": {
    title: "Order Cancel",
    description: "Wave-level cancellation audits and pipeline cleanup",
  },
  "/settings": {
    title: "Settings & Access Management",
    description: "Configure user permissions, CRM access, and stage TAT durations",
  },
};

interface MainNavProps {
  onOpenMobileMenu?: () => void;
}

export function MainNav({ onOpenMobileMenu }: MainNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const meta = PAGE_METADATA[pathname] || {
    title: "Order to Payment",
    description: "Divine Empire enterprise fulfillment system",
  };

  const displayName = user?.fullName || user?.username || "User";
  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-30 flex min-h-14 w-full items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5 shadow-[inset_0_2px_0_0_hsl(var(--brand-lime))] md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {onOpenMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenMobileMenu}
            className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-accent md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-base md:text-lg font-semibold leading-tight text-foreground">
              {meta.title}
            </h1>
            {isAdmin ? (
              <span className="hidden sm:inline-flex shrink-0 items-center rounded border border-success/25 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                Admin: All Access
              </span>
            ) : user?.location ? (
              <span className="hidden sm:inline-flex shrink-0 items-center rounded border border-info/25 bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
                {user.location}
              </span>
            ) : null}
          </div>
          {meta.description && (
            <p className="hidden truncate text-xs text-muted-foreground md:block mt-0.5">
              {meta.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm"
          aria-hidden="true"
        >
          {initials(displayName)}
        </span>
        <div className="hidden leading-tight sm:block text-right">
          <p className="text-sm font-medium text-foreground">{displayName}</p>
          <p className="text-xs capitalize text-muted-foreground">{user?.role || "Operator"}</p>
        </div>
      </div>
    </header>
  );
}
