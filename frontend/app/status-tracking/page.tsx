"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Handshake,
  CalendarClock,
  MessagesSquare,
  StickyNote,
} from "lucide-react";

import { PageNavigation } from "@/components/PageNavigation";
import { loadAuth } from "@/lib/auth-storage";
import {
  getMyStats,
  getMyContacted,
  getDashboardStats,
  OUTCOME_LABELS,
  CHANNEL_LABELS,
  TEAM_LABELS,
  type DashboardStats,
  type DashboardPersonnelRow,
  type ContactedBusiness,
  type Team,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

type Period = "month" | "all";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function firstOfMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}
function rangeFor(period: Period) {
  return period === "month"
    ? { from: firstOfMonthStr(), to: todayStr() }
    : { from: "2000-01-01", to: todayStr() };
}

const OUTCOME_TONE: Record<string, string> = {
  record_taken: "bg-emerald-500",
  to_meet: "bg-orange-500",
  follow_up: "bg-yellow-400",
  rejected: "bg-red-500",
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
function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(String(value).replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StatusTrackingPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [period, setPeriod] = useState<Period>("month");

  useEffect(() => {
    setIsAdmin(loadAuth()?.user?.role === "admin");
    setReady(true);
  }, []);

  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              aria-label="Ana sayfaya git"
              className="flex flex-col items-end leading-none"
            >
              <span className="text-3xl font-semibold tracking-tight text-slate-700">
                Jefedes<span className="text-emerald-500">.</span>
              </span>
              <span className="-mt-0.5 -translate-x-1 text-xs font-medium tracking-wide text-slate-400">
                Lead Flow
              </span>
            </Link>
            <PageNavigation />
          </div>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                Durum Takip
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {isAdmin
                  ? "Personel bazlı performans dashboard'ları."
                  : "Kendi görüşmeleriniz ve işletmeleriniz."}
              </p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-xl bg-white p-1">
              {(["month", "all"] as Period[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    period === p
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {p === "month" ? "Bu Ay" : "Tüm Zamanlar"}
                </button>
              ))}
            </div>
          </div>
        </header>

        {!ready ? (
          <p className="text-sm text-slate-500">Yükleniyor...</p>
        ) : isAdmin ? (
          <AdminView period={period} />
        ) : (
          <PersonnelView period={period} />
        )}
      </div>
    </main>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent: string;
}) {
  const [, text, bg] = accent.split(" ");
  return (
    <Card className="rounded-2xl bg-white shadow-sm">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${text}`}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function PersonnelView({ period }: { period: Period }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [businesses, setBusinesses] = useState<ContactedBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const range = rangeFor(period);
    Promise.all([getMyStats(range), getMyContacted(range)])
      .then(([s, list]) => {
        if (active) {
          setStats(s);
          setBusinesses(list);
          setError(null);
        }
      })
      .catch((err) => {
        if (active)
          setError(err instanceof Error ? err.message : "Veriler getirilemedi.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period]);

  if (error)
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  if (isLoading && !stats)
    return <p className="text-sm text-slate-500">Yükleniyor...</p>;

  const o = stats?.outcomes;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          icon={MessagesSquare}
          label="Toplam Görüşme"
          value={stats?.totalContacted ?? 0}
          accent="border-l-slate-400 text-slate-600 bg-slate-100"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Kayıt Alındı"
          value={o?.record_taken ?? 0}
          accent="border-l-emerald-500 text-emerald-600 bg-emerald-50"
        />
        <KpiCard
          icon={Handshake}
          label="Yüz Yüze"
          value={o?.to_meet ?? 0}
          accent="border-l-orange-500 text-orange-600 bg-orange-50"
        />
        <KpiCard
          icon={CalendarClock}
          label="Daha Sonra"
          value={o?.follow_up ?? 0}
          accent="border-l-yellow-400 text-yellow-600 bg-yellow-50"
        />
        <KpiCard
          icon={XCircle}
          label="Reddedildi"
          value={o?.rejected ?? 0}
          accent="border-l-red-500 text-red-600 bg-red-50"
        />
        <KpiCard
          icon={StickyNote}
          label="Eklenen Not"
          value={stats?.totalNotes ?? 0}
          accent="border-l-indigo-500 text-indigo-600 bg-indigo-50"
        />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">
        İşletmelerim{" "}
        <span className="text-sm font-normal text-slate-400">
          ({businesses.length})
        </span>
      </h2>
      {businesses.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">
          Bu dönemde görüştüğünüz işletme yok.
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {businesses.map((b) => {
            const i = b.interaction;
            const meta = [b.category, b.district, b.city]
              .filter(Boolean)
              .join(" · ");
            return (
              <li
                key={b.id}
                className="rounded-xl bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {b.name || "İsimsiz işletme"}
                    </p>
                    {meta && (
                      <p className="text-xs text-slate-400">{meta}</p>
                    )}
                  </div>
                  {i?.outcome && OUTCOME_LABELS[i.outcome] && (
                    <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          OUTCOME_TONE[i.outcome] || "bg-slate-300"
                        }`}
                      />
                      {OUTCOME_LABELS[i.outcome]}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  {b.phone && <span>{b.phone}</span>}
                  {i?.channel && CHANNEL_LABELS[i.channel] && (
                    <span>{CHANNEL_LABELS[i.channel]}</span>
                  )}
                  {i?.updatedAt && (
                    <span className="text-slate-400">
                      {formatDateTime(i.updatedAt)}
                    </span>
                  )}
                  {b.notes.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                      {b.notes.length} not
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function AdminView({ period }: { period: Period }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDashboardStats(rangeFor(period))
      .then((s) => {
        if (active) {
          setStats(s);
          setError(null);
        }
      })
      .catch((err) => {
        if (active)
          setError(err instanceof Error ? err.message : "Veriler getirilemedi.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period]);

  if (error)
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  if (isLoading && !stats)
    return <p className="text-sm text-slate-500">Yükleniyor...</p>;

  const personnel = (stats?.byPersonnel ?? []).filter((p) => p.userId);

  if (personnel.length === 0)
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">
        Bu dönemde personel aktivitesi yok.
      </div>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {personnel.map((p) => (
        <PersonnelDashCard key={p.userId} p={p} />
      ))}
    </div>
  );
}

function PersonnelDashCard({ p }: { p: DashboardPersonnelRow }) {
  const name = p.fullName || p.username || "Bilinmeyen";
  const teamLabel = p.team ? TEAM_LABELS[p.team as Team] || p.team : null;
  const cells: { label: string; value: number; tone: string }[] = [
    { label: "Kayıt", value: p.record_taken, tone: "text-emerald-600" },
    { label: "Yüz yüze", value: p.to_meet, tone: "text-orange-600" },
    { label: "Daha sonra", value: p.follow_up, tone: "text-yellow-600" },
    { label: "Reddedildi", value: p.rejected, tone: "text-red-600" },
  ];

  return (
    <Card className="rounded-2xl bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(
              name
            )}`}
          >
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {name}
            </p>
            {teamLabel && (
              <p className="text-xs text-slate-400">{teamLabel}</p>
            )}
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold text-slate-900">{p.total}</p>
            <p className="text-[11px] text-slate-400">görüşme</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {cells.map((c) => (
            <div
              key={c.label}
              className="rounded-lg bg-slate-50 p-2 text-center"
            >
              <p className={`text-lg font-bold ${c.tone}`}>{c.value}</p>
              <p className="text-[10px] text-slate-400">{c.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
