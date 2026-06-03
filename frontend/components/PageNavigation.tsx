"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";
import { clearAuth } from "@/lib/auth-storage";

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
  {
    label: "Raporlar",
    href: "/reports",
  },
];

export function PageNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [unseenCount, setUnseenCount] = useState(0);

  const handleLogout = () => {
    clearAuth();
    router.replace("/login");
  };

  useEffect(() => {
    const fetchUnseenCount = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/live-support-leads/unseen-count`
        );

        const data = await response.json();

        if (response.ok && data.success) {
          setUnseenCount(Number(data.count || 0));
        }
      } catch (error) {
        console.warn("Canlı destek bildirim sayısı alınamadı:", error);
      }
    };

    void fetchUnseenCount();

    const intervalId = window.setInterval(fetchUnseenCount, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <nav className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const showLiveSupportBadge =
            item.href === "/live-support" &&
            pathname !== "/live-support" &&
            unseenCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative rounded-full px-5 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{item.label}</span>

              {showLiveSupportBadge && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-none text-white shadow-sm">
                  {unseenCount > 99 ? "99+" : unseenCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition hover:border-red-200 hover:text-red-600"
      >
        Çıkış Yap
      </button>
    </nav>
  );
}