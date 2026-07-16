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
  Menu,
  X,
} from "lucide-react";

import { loadAuth, clearAuth } from "@/lib/auth-storage";
import { API_BASE_URL, TEAM_LABELS, type Team, type LoginUser } from "@/lib/api";

type SidebarLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  badge?: "liveSupport" | "contacted" | "recorded";
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
    badge: "contacted",
  },
  {
    label: "Kayıt Alınan İşletmeler",
    href: "/recorded-businesses",
    icon: ClipboardCheck,
    badge: "recorded",
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
  const [contactedCount, setContactedCount] = useState(0);
  const [recordedCount, setRecordedCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setUser(loadAuth()?.user ?? null);
  }, [pathname]);

  // Daraltma durumu localStorage'da kalıcı.
  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);

  // md breakpoint (768px) — collapsed sadece masaüstünde etkili olsun,
  // mobil drawer her zaman tam genişlikte açılsın.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Sayfa değişince mobil drawer'ı kapat.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Drawer açıkken arka plan kaydırmasını engelle.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // collapsed sadece masaüstünde görsel etki göstersin.
  const showCollapsed = isDesktop && collapsed;

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

  // Görüşülen/Kayıt Alınan bildirim rozeti: son ziyaretten (localStorage) sonra
  // aktivitesi olan işletmeleri say. İlk açılışta "görüldü" = now (rozet 0 başlar).
  useEffect(() => {
    const getSince = (key: string) => {
      let value = localStorage.getItem(key);
      if (!value) {
        value = new Date().toISOString();
        localStorage.setItem(key, value);
      }
      return value;
    };

    const fetchCounts = async () => {
      try {
        const [talkedRes, recordedRes] = await Promise.all([
          fetch(
            `${API_BASE_URL}/api/businesses/contacted-counts?since=${encodeURIComponent(
              getSince("contacted-seen")
            )}`
          ).then((r) => r.json()),
          fetch(
            `${API_BASE_URL}/api/businesses/contacted-counts?since=${encodeURIComponent(
              getSince("recorded-seen")
            )}`
          ).then((r) => r.json()),
        ]);
        if (talkedRes?.success) setContactedCount(Number(talkedRes.talked || 0));
        if (recordedRes?.success)
          setRecordedCount(Number(recordedRes.recorded || 0));
      } catch (error) {
        console.warn("Bildirim sayıları alınamadı:", error);
      }
    };

    void fetchCounts();
    const intervalId = window.setInterval(fetchCounts, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Sayfaya girilince o kategoriyi "görüldü" işaretle, rozeti sıfırla.
  useEffect(() => {
    if (pathname.startsWith("/contacted-businesses")) {
      localStorage.setItem("contacted-seen", new Date().toISOString());
      setContactedCount(0);
    }
    if (pathname.startsWith("/recorded-businesses")) {
      localStorage.setItem("recorded-seen", new Date().toISOString());
      setRecordedCount(0);
    }
  }, [pathname]);

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
    const badgeCount =
      link.badge === "liveSupport"
        ? unseenCount
        : link.badge === "contacted"
          ? contactedCount
          : link.badge === "recorded"
            ? recordedCount
            : 0;
    const showBadge = Boolean(link.badge) && !isActive && badgeCount > 0;

    return (
      <Link
        key={link.href}
        href={link.href}
        title={showCollapsed ? link.label : undefined}
        className={`relative flex items-center rounded-xl py-2 text-sm font-medium transition ${
          showCollapsed ? "justify-center px-2" : "gap-3 px-3"
        } ${
          isActive
            ? "bg-slate-950 text-white"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!showCollapsed && <span>{link.label}</span>}
        {showBadge &&
          (showCollapsed ? (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          ) : (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-none text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ))}
      </Link>
    );
  };

  return (
    <>
      {/* Mobil hamburger butonu */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        title="Menüyü aç"
        aria-label="Menüyü aç"
        aria-expanded={mobileOpen}
        className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobil arka plan katmanı */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:sticky md:top-0 md:z-0 md:translate-x-0 md:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${showCollapsed ? "md:w-16" : "md:w-60"}`}
      >
      <div
        className={`flex py-5 ${
          showCollapsed ? "flex-col items-center gap-3 px-2" : "items-center gap-2 px-5"
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        {!showCollapsed && (
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">Menü</div>
            <div className="text-[11px] text-slate-400">Yeni özellikler</div>
          </div>
        )}
        {/* Mobilde drawer'ı kapatma butonu */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          title="Menüyü kapat"
          aria-label="Menüyü kapat"
          className="ml-auto rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Masaüstünde daralt/genişlet butonu */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={showCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          aria-label={showCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          className={`hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 md:inline-flex ${
            showCollapsed ? "" : "ml-auto"
          }`}
        >
          {showCollapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        <div>
          {!showCollapsed && (
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
            {!showCollapsed && (
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Yönetim
              </p>
            )}
            <div className="flex flex-col gap-1">
              {visibleFeatures.map(renderLink)}
            </div>
          </div>
        )}

        {upcomingLinks.length > 0 && !showCollapsed && (
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
          {showCollapsed ? (
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
    </>
  );
}
