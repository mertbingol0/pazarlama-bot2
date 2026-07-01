"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  ListChecks,
  Building2,
  Handshake,
  Search,
  Sparkles,
  LogOut,
  Home,
  Headset,
  ClipboardCheck,
  ChevronsLeft,
  ChevronsRight,
  Boxes,
} from "lucide-react";

import { loadAuth, clearAuth } from "@/lib/auth-storage";
import { API_BASE_URL, TEAM_LABELS, type Team, type LoginUser } from "@/lib/api";

type SidebarLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  badge?: "liveSupport";
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
    label: "Ana Sayfa",
    href: "/",
    icon: Home,
  },
  {
    label: "İşletme Araştırması",
    href: "/business-research",
    icon: Search,
    adminOnly: true,
  },
  {
    label: "Görüşülen İşletmeler",
    href: "/contacted-businesses",
    icon: Handshake,
  },
  {
    label: "Kayıt Alınan İşletmeler",
    href: "/recorded-businesses",
    icon: ClipboardCheck,
  },
  {
    label: "Manuel İşletme Ekle",
    href: "/manual-business",
    icon: Building2,
  },
  {
    label: "Durum Takip",
    href: "/status-tracking",
    icon: ListChecks,
  },
  {
    label: "Canlı Destek",
    href: "/live-support",
    icon: Headset,
    badge: "liveSupport",
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
  {
    label: "Birim Yönetimi",
    href: "/admin/teams",
    icon: Boxes,
    adminOnly: true,
  },
];

// İleride eklenecek özellikler (şimdilik devre dışı placeholder).
const upcomingLinks: { label: string; icon: SidebarLink["icon"] }[] = [];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<LoginUser | null>(null);
  const [unseenCount, setUnseenCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setUser(loadAuth()?.user ?? null);
  }, [pathname]);

  // Daraltma durumu localStorage'da kalıcı.
  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  useEffect(() => {
    const fetchUnseenCount = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/whatsapp/unread-count`
        );
        const data = await response.json();
        if (response.ok && data.success) {
          setUnseenCount(Number(data.count || 0));
        }
      } catch (error) {
        console.warn("WhatsApp bildirim sayısı alınamadı:", error);
      }
    };

    void fetchUnseenCount();
    const intervalId = window.setInterval(fetchUnseenCount, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const isAdmin = user?.role === "admin";
  const canSeeLiveSupport = isAdmin || user?.team === "cagri_merkezi";

  const visibleWorkspace = workspaceLinks.filter((link) => {
    if (link.adminOnly && !isAdmin) return false;
    if (link.href === "/live-support" && !canSeeLiveSupport) return false;
    return true;
  });
  const visibleFeatures = featureLinks.filter(
    (link) => !link.adminOnly || isAdmin
  );

  const handleLogout = () => {
    clearAuth();
    router.replace("/login");
  };

  const renderLink = (link: SidebarLink) => {
    const Icon = link.icon;
    const isActive =
      pathname === link.href || pathname.startsWith(`${link.href}/`);
    const showBadge =
      link.badge === "liveSupport" && !isActive && unseenCount > 0;

    return (
      <Link
        key={link.href}
        href={link.href}
        title={collapsed ? link.label : undefined}
        className={`relative flex items-center rounded-xl py-2 text-sm font-medium transition ${
          collapsed ? "justify-center px-2" : "gap-3 px-3"
        } ${
          isActive
            ? "bg-slate-950 text-white"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{link.label}</span>}
        {showBadge &&
          (collapsed ? (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          ) : (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-none text-white">
              {unseenCount > 99 ? "99+" : unseenCount}
            </span>
          ))}
      </Link>
    );
  };

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 md:flex ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div
        className={`flex py-5 ${
          collapsed ? "flex-col items-center gap-3 px-2" : "items-center gap-2 px-5"
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">Menü</div>
            <div className="text-[11px] text-slate-400">Yeni özellikler</div>
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          className={`rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 ${
            collapsed ? "" : "ml-auto"
          }`}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        <div>
          {!collapsed && (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Çalışma Alanı
            </p>
          )}
          <div className="flex flex-col gap-1">
            {visibleWorkspace.map(renderLink)}
          </div>
        </div>

        {visibleFeatures.length > 0 && (
          <div>
            {!collapsed && (
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Yönetim
              </p>
            )}
            <div className="flex flex-col gap-1">
              {visibleFeatures.map(renderLink)}
            </div>
          </div>
        )}

        {upcomingLinks.length > 0 && !collapsed && (
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
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <span
                title={user.fullName || user.username}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(
                  user.fullName || user.username
                )}`}
                aria-hidden
              >
                {initials(user.fullName || user.username)}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                title="Çıkış yap"
                aria-label="Çıkış yap"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
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
          )}
        </div>
      )}
    </aside>
  );
}
