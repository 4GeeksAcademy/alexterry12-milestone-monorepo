"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/operations", label: "Operations" },
  { href: "/incidents", label: "Incidents" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "#", label: "People" },
  { href: "#", label: "Settings" },
] as const;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Backoffice" className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((item) => {
        const active =
          item.href !== "#" &&
          (item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href));

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-panel text-surface"
                : "text-surface/70 hover:bg-panel/60 hover:text-surface"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
