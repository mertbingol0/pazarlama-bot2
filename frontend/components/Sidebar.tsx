"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  ListChecks,
  Building2,
  Search,
  Handshake,
  Sparkles,
  LogOut,
} from "lucide-react";

import { loadAuth, clearAuth } from "@/lib/auth-storage";
import { TEAM_LABELS, type Team, type LoginUser } from "@/lib/api";

type SidebarLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-violet-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toLocaleUpperCase("tr-TR");
  return (p[0][0] + p[p.length - 1][0]).toLocaleUpperCase("tr-TR");
}
function roleLabel(user: LoginUser) {
  if (user.role === "admin") return "Yönetici";
  if (user.team) return TEAM_LABELS[user.team as Team] || user.team;
  return "Personel";
}

// Çalışma alanı: tüm kullanıcıların erişebileceği aktif özellikler.
const workspaceLinks: SidebarLink[] = [
  {
    label: "İşletme Araştırması",
    href: "/business-research",
    icon: Search,
  },
  {
    label: "İletişime Geçilen İşletmeler",
    href: "/contacted-businesses",
    icon: Handshake,
  },
  {
    label: "Durum Takip",
    href: "/status-tracking",
    icon: ListChecks,
  },
  {
    label: "Manuel İşletme Ekle",
    href: "/manual-business",
    icon: Building2,
  },
];

// Yönetim: yalnızca admin.
const featureLinks: SidebarLink[] = [
  {
    label: "Kullanıcılar",
    href: "/admin/users",
    icon: Users,
    adminOnly: true,
  },
];

// İleride eklenecek özellikler (şimdilik devre dışı placeholder).
const upcomingLinks: { label: string; icon: SidebarLink["icon"] }[] = [];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<LoginUser | null>(null);

  useEffect(() => {
    setUser(loadAuth()?.user ?? null);
  }, [pathname]);

  const isAdmin = user?.role === "admin";

  const visibleFeatures = featureLinks.filter(
    (link) => !link.adminOnly || isAdmin
  );

  const handleLogout = () => {
    clearAuth();
    router.replace("/login");
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-900">Menü</div>
          <div className="text-[11px] text-slate-400">Yeni özellikler</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        <div>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Çalışma Alanı
          </p>
          <div className="flex flex-col gap-1">
            {workspaceLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {visibleFeatures.length > 0 && (
          <div>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Yönetim
            </p>
            <div className="flex flex-col gap-1">
              {visibleFeatures.map((link) => {
                const Icon = link.icon;
                const isActive =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {upcomingLinks.length > 0 && (
          <div>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Yakında
            </p>
            <div className="flex flex-col gap-1">
              {upcomingLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <div
                    key={link.label}
                    className="flex cursor-not-allowed items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400"
                    title="Yakında"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                      yakında
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Hesap profil kartı (en altta) */}
      {user && (
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(
                user.fullName || user.username
              )}`}
              aria-hidden
            >
              {initials(user.fullName || user.username)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user.fullName || user.username}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {roleLabel(user)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Çıkış yap"
              aria-label="Çıkış yap"
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
