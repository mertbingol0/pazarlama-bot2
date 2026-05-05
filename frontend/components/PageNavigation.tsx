"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/approved", label: "Onaylananlar" },
  { href: "/rejected", label: "Reddedilenler" },
];

export function PageNavigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-1 shadow-sm">
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              isActive
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}