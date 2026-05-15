"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  {
    label: "Ana Sayfa",
    href: "/",
  },
  {
    label: "Onaylananlar",
    href: "/approved",
  },
  {
    label: "Reddedilenler",
    href: "/rejected",
  },
  {
    label: "Canlı Destek",
    href: "/live-support",
  },
];

export function PageNavigation() {
  const pathname = usePathname();

  return (
    <nav className="rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      <div className="flex items-center gap-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}