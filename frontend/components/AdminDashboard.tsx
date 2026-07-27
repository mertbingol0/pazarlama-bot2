"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Users2,
  CalendarClock,
  Handshake,
  StickyNote,
  MessagesSquare,
  Phone,
  MapPin,
  MessageCircle,
  X,
} from "lucide-react";

import {
  getDashboardStats,
  getContactedBusinesses,
  TEAM_LABELS,
  CHANNEL_LABELS,
  OUTCOME_LABELS,
  type DashboardStats,
  type OutcomeCounts,
  type ContactedBusiness,
  type Team,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";

type StatCardDef = {
  key: keyof OutcomeCounts | "totalContacted" | "totalNotes";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  classes: string;
};

const OUTCOME_CARDS: StatCardDef[] = [
  {
    key: "record_taken",
    label: "Kayıt Alındı",
    icon: CheckCircle2,
    classes: "text-emerald-600 bg-emerald-50",
  },
  {
    key: "to_meet",
    label: "Yüz Yüze Görüşülecek",
    icon: Handshake,
    classes: "text-orange-600 bg-orange-50",
  },
  {
    key: "follow_up",
    label: "Daha Sonra Görüşülecek",
    icon: CalendarClock,
    classes: "text-yellow-600 bg-yellow-50",
  },
  {
    key: "rejected",
    label: "Reddedildi",
    icon: XCircle,
    classes: "text-red-600 bg-red-50",
  },
];

const OUTCOME_BAR: { key: string; label: string; color: string }[] = [
  { key: "record_taken", label: "Kayıt Alındı", color: "bg-emerald-500" },
  { key: "to_meet", label: "Yüz Yüze", color: "bg-orange-500" },
  { key: "follow_up", label: "Daha Sonra", color: "bg-yellow-400" },
  { key: "rejected", label: "Reddedildi", color: "bg-red-500" },
  { key: "other", label: "Diğer", color: "bg-slate-300" },
];

const CHANNEL_CARDS: { key: "whatsapp" | "call" | "face_to_face"; label: string }[] = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "call", label: "Telefon" },
  { key: "face_to_face", label: "Yüz Yüze" },
];

const OUTCOME_DOT: Record<string, string> = {
  record_taken: "bg-emerald-500",
  to_meet: "bg-orange-500",
  follow_up: "bg-yellow-400",
  rejected: "bg-red-500",
};

// Detay paneli için sonuç bazlı renk tonları.
const OUTCOME_TONE: Record<
  string,
  { headBg: string; headText: string; chip: string; dot: string }
> = {
  record_taken: {
    headBg: "bg-emerald-50",
    headText: "text-emerald-700",
    chip: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  to_meet: {
    headBg: "bg-orange-50",
    headText: "text-orange-700",
    chip: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  follow_up: {
    headBg: "bg-yellow-50",
    headText: "text-yellow-700",
    chip: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-400",
  },
  rejected: {
    headBg: "bg-red-50",
    headText: "text-red-700",
    chip: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
  default: {
    headBg: "bg-slate-50",
    headText: "text-slate-700",
    chip: "bg-slate-100 text-slate-600",
    dot: "bg-slate-300",
  },
};

const CHANNEL_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  whatsapp: MessageCircle,
  call: Phone,
  face_to_face: Handshake,
};

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-amber-500",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("tr-TR");
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("tr-TR");
}

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function timeAgo(value?: string | null) {
  if (!value) return "";
  const t = new Date(String(value).replace(" ", "T") + "Z").getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [contacted, setContacted] = useState<ContactedBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  // Tıklanan sonuç kartı (detay listesi için).
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);

  // Yarım seçim (sadece "from" var, "to" henüz yok) fetch tetiklemesin —
  // aksi halde her range seçimi iki isteğe (partial + tam) sebep olur.
  const rangeIncomplete =
    (dateRange.from && !dateRange.to) || (!dateRange.from && dateRange.to);

  useEffect(() => {
    if (rangeIncomplete) return;
    let active = true;
    const filters: { from?: string; to?: string } = {};
    if (dateRange.from && dateRange.to) {
      filters.from = dateRange.from;
      filters.to = dateRange.to;
    }
    // Not: setState yalnızca async callback'lerde (senkron effect gövdesinde değil).
    Promise.all([getDashboardStats(filters), getContactedBusinesses(filters)])
      .then(([s, list]) => {
        if (active) {
          setStats(s);
          setContacted(list);
          setSelectedOutcome(null);
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
  }, [dateRange.from, dateRange.to, rangeIncomplete]);

  const detailBusinesses = selectedOutcome
    ? contacted.filter((b) => b.interaction?.outcome === selectedOutcome)
    : [];

  const o = stats?.outcomes;
  const formatTr = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("tr-TR");
  const periodLabel = (() => {
    const { from, to } = dateRange;
    if (from && to) {
      return from === to ? formatTr(from) : `${formatTr(from)} – ${formatTr(to)}`;
    }
    return "Bugün (son 24 saat)";
  })();

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Yönetim Paneli
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {periodLabel} için ekiplerin görüşme sonuçları.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">
              Tarih aralığı
            </label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Bugün (son 24 saat)"
              clearLabel="Temizle"
              align="end"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : isLoading && !stats ? (
        <p className="text-sm text-slate-500">Yükleniyor...</p>
      ) : (
        <>
          {/* Sonuç kartları (tıklanınca detay) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OUTCOME_CARDS.map((c) => {
              const Icon = c.icon;
              const value = o ? (o[c.key as keyof OutcomeCounts] as number) : 0;
              const [textClass, bgClass] = c.classes.split(" ");
              const isActive = selectedOutcome === c.key;
              return (
                <button
                  type="button"
                  key={c.key}
                  onClick={() =>
                    setSelectedOutcome((prev) =>
                      prev === c.key ? null : (c.key as string)
                    )
                  }
                  className="text-left"
                >
                  <Card
                    className={`rounded-2xl bg-white transition hover:-translate-y-0.5 hover:shadow-md ${
                      isActive ? "ring-2 ring-slate-900/10" : ""
                    }`}
                  >
                    <CardContent className="flex items-center justify-between p-5">
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          {c.label}
                        </p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">
                          {value}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {isActive ? "Listeyi gizle" : "Detayları gör"}
                        </p>
                      </div>
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgClass} ${textClass}`}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>

          {/* Seçilen sonucun işletme detayları (renkli kartlar) */}
          {selectedOutcome &&
            (() => {
              const tone = OUTCOME_TONE[selectedOutcome] || OUTCOME_TONE.default;
              return (
                <div
                  className="mt-4 overflow-hidden rounded-2xl bg-white"
                >
                  <div
                    className={`flex items-center justify-between px-4 py-3 ${tone.headBg}`}
                  >
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                      <span className={tone.headText}>
                        {OUTCOME_LABELS[selectedOutcome] || selectedOutcome}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${tone.chip}`}
                      >
                        {detailBusinesses.length}
                      </span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSelectedOutcome(null)}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-white/60 hover:text-slate-700"
                      aria-label="Kapat"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {detailBusinesses.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-slate-400">
                      Bu kategoride işletme yok.
                    </p>
                  ) : (
                    <ul className="grid gap-3 p-4 sm:grid-cols-2">
                      {detailBusinesses.map((b) => {
                        const meta = [b.category, b.district, b.city]
                          .filter(Boolean)
                          .join(" · ");
                        const i = b.interaction;
                        const ChannelIcon =
                          (i?.channel && CHANNEL_ICON[i.channel]) || null;
                        const personnel = i?.userFullName || i?.userUsername || null;

                        return (
                          <li
                            key={b.id}
                            className="rounded-xl bg-white p-3 transition hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {b.name || "İsimsiz işletme"}
                                </p>
                                {meta && (
                                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{meta}</span>
                                  </p>
                                )}
                              </div>
                              {b.notes.length > 0 && (
                                <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                  <StickyNote className="h-3 w-3" />
                                  {b.notes.length}
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {b.phone && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  {b.phone}
                                </span>
                              )}
                              {i?.channel && CHANNEL_LABELS[i.channel] && (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tone.chip}`}
                                >
                                  {ChannelIcon && (
                                    <ChannelIcon className="h-3 w-3" />
                                  )}
                                  {CHANNEL_LABELS[i.channel]}
                                </span>
                              )}
                            </div>

                            {personnel && (
                              <div className="mt-2 flex items-center gap-2">
                                <span
                                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${avatarColor(
                                    personnel
                                  )}`}
                                  aria-hidden
                                >
                                  {initials(personnel)}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {personnel}
                                </span>
                              </div>
                            )}

                            {b.notes.length > 0 && (
                              <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs leading-relaxed text-slate-600">
                                {b.notes[0].note}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })()}

          {/* Özet kartları */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={MessagesSquare}
              label="Toplam İletişim"
              value={stats?.totalContacted ?? 0}
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Başarı Oranı"
              value={`%${pct(o?.record_taken ?? 0, o?.total ?? 0)}`}
            />
            <SummaryCard
              icon={StickyNote}
              label="Eklenen Not"
              value={stats?.totalNotes ?? 0}
            />
            <SummaryCard
              icon={Users2}
              label="Aktif Personel"
              value={stats?.byPersonnel.filter((p) => p.userId).length ?? 0}
            />
          </div>

          {/* Dağılım: sonuç çubuğu + kanal kırılımı */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl bg-white">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Sonuç Dağılımı
                </h3>
                {o && o.total > 0 ? (
                  <>
                    <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
                      {OUTCOME_BAR.map((seg) => {
                        const v = (o[seg.key as keyof OutcomeCounts] as number) || 0;
                        if (v === 0) return null;
                        return (
                          <div
                            key={seg.key}
                            className={seg.color}
                            style={{ width: `${(v / o.total) * 100}%` }}
                            title={`${seg.label}: ${v}`}
                          />
                        );
                      })}
                    </div>
                    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {OUTCOME_BAR.map((seg) => {
                        const v = (o[seg.key as keyof OutcomeCounts] as number) || 0;
                        return (
                          <li
                            key={seg.key}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="flex items-center gap-1.5 text-slate-600">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${seg.color}`}
                              />
                              {seg.label}
                            </span>
                            <span className="font-medium text-slate-800">
                              {v}{" "}
                              <span className="text-slate-400">
                                (%{pct(v, o.total)})
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">Veri yok.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl bg-white">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  İletişim Kanalı
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {CHANNEL_CARDS.map((ch) => {
                    const v = stats?.channels?.[ch.key] ?? 0;
                    const total = stats?.channels?.total ?? 0;
                    return (
                      <div
                        key={ch.key}
                        className="rounded-xl bg-slate-50 p-3 text-center"
                      >
                        <p className="text-2xl font-bold text-slate-900">{v}</p>
                        <p className="text-xs font-medium text-slate-500">
                          {ch.label}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          %{pct(v, total)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Birim ve personel kırılımı */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <BreakdownTable
              title="Birim Bazlı"
              firstHeader="Birim"
              rows={(stats?.byTeam ?? []).map((t) => ({
                label: TEAM_LABELS[t.team as Team] || t.team,
                sub: null,
                counts: t,
              }))}
            />
            <BreakdownTable
              title="Personel Bazlı"
              firstHeader="Personel"
              rows={(stats?.byPersonnel ?? []).map((p) => ({
                label: p.fullName || p.username || "Bilinmeyen",
                sub: p.team ? TEAM_LABELS[p.team] || p.team : null,
                counts: p,
              }))}
            />
          </div>

          {/* Son aktiviteler akışı */}
          <Card className="mt-6 rounded-2xl bg-white">
            <CardContent className="p-0">
              <div className="px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  Son Aktiviteler
                </h3>
              </div>
              {!stats || stats.recentActivity.length === 0 ? (
                <p className="px-4 py-4 text-sm text-slate-400">
                  Bu dönemde aktivite yok.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {stats.recentActivity.map((a, idx) => (
                    <li key={idx} className="flex items-start gap-3 px-4 py-2.5">
                      {a.type === "interaction" ? (
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                            (a.outcome && OUTCOME_DOT[a.outcome]) || "bg-slate-300"
                          }`}
                        />
                      ) : (
                        <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700">
                          <span className="font-semibold text-slate-900">
                            {a.userName || "Bilinmeyen"}
                          </span>{" "}
                          {a.type === "interaction" ? (
                            <>
                              <span className="text-slate-500">
                                {a.businessName || "işletme"}
                              </span>{" "}
                              görüşmesini{" "}
                              <span className="font-medium">
                                {(a.outcome && OUTCOME_LABELS[a.outcome]) ||
                                  "güncelledi"}
                              </span>
                              {a.channel && CHANNEL_LABELS[a.channel] && (
                                <span className="text-slate-400">
                                  {" "}
                                  · {CHANNEL_LABELS[a.channel]}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-slate-500">
                                {a.businessName || "işletme"}
                              </span>{" "}
                              için not ekledi
                            </>
                          )}
                        </p>
                        {a.type === "note" && a.note && (
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-slate-500">
                            “{a.note}”
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 text-[11px] text-slate-400">
                        {timeAgo(a.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <Card className="rounded-2xl bg-white">
      <CardContent className="flex items-center gap-3 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownTable({
  title,
  firstHeader,
  rows,
}: {
  title: string;
  firstHeader: string;
  rows: { label: string; sub: string | null; counts: OutcomeCounts }[];
}) {
  return (
    <Card className="rounded-2xl bg-white">
      <CardContent className="p-0">
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">Veri yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">{firstHeader}</th>
                  <th className="px-2 py-2 text-center font-medium">Toplam</th>
                  <th className="px-2 py-2 text-center font-medium text-emerald-600">
                    Kayıt
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-orange-600">
                    Yüz yüze
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-yellow-600">
                    Sonra
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-red-600">
                    Ret
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{r.label}</div>
                      {r.sub && (
                        <div className="text-xs text-slate-400">{r.sub}</div>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center font-semibold text-slate-900">
                      {r.counts.total}
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-600">
                      {r.counts.record_taken}
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-600">
                      {r.counts.to_meet}
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-600">
                      {r.counts.follow_up}
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-600">
                      {r.counts.rejected}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
