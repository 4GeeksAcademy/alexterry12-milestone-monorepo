"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/operations", label: "Operations" },
  { href: "/incidents", label: "Incidents" },
  { href: "/incident-manager", label: "Incident Manager" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "#", label: "People" },
  { href: "#", label: "Settings" },
] as const;

const inventoryItems = [
  { href: "/inventory/products", label: "SKUs" },
  { href: "/inventory/orders/inbound", label: "Goods receipt" },
  { href: "/inventory/orders/outbound", label: "Dispatch / loss" },
  { href: "/inventory/orders", label: "Stock movements" },
] as const;

function linkClass(active: boolean): string {
  return `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "bg-panel text-surface"
      : "text-surface/70 hover:bg-panel/60 hover:text-surface"
  }`;
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Backoffice" className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((item) => {
        const active =
          item.href !== "#" &&
          (item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={linkClass(active)}
          >
            {item.label}
          </Link>
        );
      })}

      <p className="mt-3 px-3 pt-2 font-mono text-xs tracking-widest text-surface/50 uppercase">
        Inventory
      </p>
      {inventoryItems.map((item) => {
        const active =
          item.href === "/inventory/orders"
            ? pathname === "/inventory/orders"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={linkClass(active)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
