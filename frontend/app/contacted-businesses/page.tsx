"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { StickyNote, ArrowDown, Clock } from "lucide-react";

import { PageNavigation } from "@/components/PageNavigation";
import {
  getContactedBusinesses,
  saveBusinessInteraction,
  addBusinessNote,
  CHANNEL_LABELS,
  OUTCOME_LABELS,
  OUTCOME_OPTIONS,
  TEAM_LABELS,
  type ContactedBusiness,
  type ContactedFilters,
  type BusinessNote,
  type OutcomeTone,
  type Team,
} from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { downloadContactedBusinessesAsCsv } from "@/lib/export";

type Category = {
  key: string;
  outcome: string | null;
  label: string;
  tone: OutcomeTone;
};

// Görüşme sonucu kategorileri (sabit sıra).
const CATEGORIES: Category[] = [
  { key: "record_taken", outcome: "record_taken", label: "Kayıt Alındı", tone: "green" },
  { key: "to_meet", outcome: "to_meet", label: "Yüz Yüze Görüşülecek", tone: "orange" },
  { key: "follow_up", outcome: "follow_up", label: "Daha Sonra Görüşülecek", tone: "yellow" },
  { key: "rejected", outcome: "rejected", label: "Reddedildi", tone: "red" },
  { key: "__other__", outcome: null, label: "Belirtilmemiş", tone: "gray" },
];

const TONE: Record<
  OutcomeTone,
  { strip: string; badge: string; dot: string }
> = {
  green: {
    strip: "border-l-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  red: {
    strip: "border-l-red-500",
    badge: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  orange: {
    strip: "border-l-orange-500",
    badge: "bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
  yellow: {
    strip: "border-l-yellow-400",
    badge: "bg-yellow-50 text-yellow-700",
    dot: "bg-yellow-400",
  },
  gray: {
    strip: "border-l-slate-300",
    badge: "bg-slate-100 text-slate-500",
    dot: "bg-slate-300",
  },
};

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(String(value).replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Not yazarı için baş harf avatarı.
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
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toLocaleUpperCase("tr-TR");
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("tr-TR");
}

function categoryKeyFor(business: ContactedBusiness) {
  const outcome = business.interaction?.outcome;
  if (outcome && CATEGORIES.some((c) => c.outcome === outcome)) {
    return outcome;
  }
  return "__other__";
}

function ContactedCard({
  business,
  tone,
  onOutcomeChange,
  onNoteAdded,
}: {
  business: ContactedBusiness;
  tone: OutcomeTone;
  onOutcomeChange: (
    business: ContactedBusiness,
    outcome: string
  ) => Promise<void>;
  onNoteAdded: (businessId: number, note: BusinessNote) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [savingOutcome, setSavingOutcome] = useState(false);
  const interaction = business.interaction;
  const meta = [business.category, business.district, business.city]
    .filter(Boolean)
    .join(" · ");

  // Yeni not ekleme
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Eskiden yeniye sıralı (yeni eklenen en altta).
  const orderedNotes = [...business.notes].sort((a, b) => {
    const byDate = String(a.createdAt || "").localeCompare(
      String(b.createdAt || "")
    );
    return byDate !== 0 ? byDate : a.id - b.id;
  });

  const handleAddNote = async () => {
    const text = newNote.trim();
    if (!text) return;
    setAddingNote(true);
    setNoteError(null);
    try {
      const note = await addBusinessNote(business.id, text);
      onNoteAdded(business.id, note);
      setNewNote("");
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Not eklenemedi.");
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div
      className="rounded-2xl bg-white shadow-sm"
    >
      <div className="flex items-start gap-2 p-4">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Detayı kapat" : "Detayı aç"}
          className="mt-0.5 shrink-0 rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
          >
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              {business.name || "İsimsiz işletme"}
            </h3>
            {interaction?.outcome && OUTCOME_LABELS[interaction.outcome] && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[tone].badge}`}
              >
                {OUTCOME_LABELS[interaction.outcome]}
              </span>
            )}
            {business.notes.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                {business.notes.length} not
              </span>
            )}
          </div>

          {meta && <p className="mt-0.5 text-xs text-slate-400">{meta}</p>}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {business.phone && <span>{business.phone}</span>}
            {interaction?.channel && CHANNEL_LABELS[interaction.channel] && (
              <span>Kanal: {CHANNEL_LABELS[interaction.channel]}</span>
            )}
          </div>
        </div>

        {/* Sağ taraf: görüşen personel profili + görüşme tarih/saati */}
        {(() => {
          const personnel =
            interaction?.userFullName || interaction?.userUsername || null;
          if (!personnel) return null;
          const teamLabel = interaction?.team
            ? TEAM_LABELS[interaction.team as Team] || interaction.team
            : null;
          const meetingAt = interaction?.updatedAt || business.activityAt;
          return (
            <div className="flex shrink-0 flex-col items-end gap-1.5 pl-2">
              <div className="flex items-center gap-2">
                <div className="text-right leading-tight">
                  <p className="text-xs font-semibold text-slate-800">
                    {personnel}
                  </p>
                  {teamLabel && (
                    <p className="text-[10px] text-slate-400">{teamLabel}</p>
                  )}
                </div>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(
                    personnel
                  )}`}
                  aria-hidden
                >
                  {initials(personnel)}
                </span>
              </div>
              {meetingAt && (
                <p className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(meetingAt)}
                </p>
              )}
            </div>
          );
        })()}
      </div>

      {isOpen && (
        <div className="px-4 py-3">
          {/* İletişim bilgileri */}
          <div className="grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
            {business.address && <span>Adres: {business.address}</span>}
            {business.email && <span>E-posta: {business.email}</span>}
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:underline"
              >
                Web sitesi
              </a>
            )}
            {interaction?.updatedAt && (
              <span>Son güncelleme: {formatDateTime(interaction.updatedAt)}</span>
            )}
          </div>

          {/* Görüşme sonucunu değiştir (kart ilgili kategoriye taşınır).
              Kayıt alınanlarda sonuç değiştirmeye gerek yok → gizlenir. */}
          {interaction?.outcome !== "record_taken" && (
          <div className="mt-3 flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">
              Görüşme Sonucu
            </label>
            <div className="flex items-center gap-2">
              <Select
                value={interaction?.outcome || ""}
                onValueChange={async (value) => {
                  setSavingOutcome(true);
                  try {
                    await onOutcomeChange(business, value);
                  } finally {
                    setSavingOutcome(false);
                  }
                }}
              >
                <SelectTrigger className="h-9 w-full max-w-xs rounded-xl bg-white">
                  <SelectValue placeholder="Sonuç seçin" />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {savingOutcome && (
                <span className="text-xs text-slate-400">Taşınıyor...</span>
              )}
            </div>
          </div>
          )}

          {/* Personel notları */}
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-slate-800">
                Personel Notları
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                {business.notes.length}
              </span>
            </div>

            {orderedNotes.length === 0 ? (
              <p className="rounded-xl px-3 py-3 text-xs text-slate-400">
                Bu işletme için henüz not eklenmemiş.
              </p>
            ) : (
              <ol className="flex flex-col">
                {orderedNotes.map((note, index) => {
                  const author =
                    note.userFullName || note.userUsername || "Bilinmeyen";
                  const teamLabel = note.team
                    ? TEAM_LABELS[note.team as Team] || note.team
                    : null;

                  return (
                    <li key={note.id} className="flex flex-col">
                      {/* Önceki nottan bu nota doğru yeşil ok (sürecin devamı) */}
                      {index > 0 && (
                        <div className="flex justify-center py-1" aria-hidden>
                          <ArrowDown className="h-4 w-4 text-emerald-500" />
                        </div>
                      )}

                      <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(
                            author
                          )}`}
                          aria-hidden
                        >
                          {initials(author)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold text-slate-800">
                                {author}
                              </span>
                              {teamLabel && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                  {teamLabel}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {formatDateTime(note.createdAt)}
                            </span>
                          </div>

                          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                            {note.note}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Yeni not ekle */}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Yeni not ekle..."
                className="min-h-[40px] flex-1 rounded-xl bg-white"
                rows={2}
              />
              <Button
                type="button"
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                className="h-9 self-start rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
              >
                {addingNote ? "Ekleniyor..." : "Not Ekle"}
              </Button>
            </div>
            {noteError && (
              <p className="mt-1 text-xs text-red-600">{noteError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContactedBusinessesPage() {
  const [businesses, setBusinesses] = useState<ContactedBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtre alanları
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [query, setQuery] = useState("");
  // Uygulanan filtre var mı (başlık göstergesi için)
  const [isFiltered, setIsFiltered] = useState(false);

  const loadData = useCallback(
    (filters: ContactedFilters, filtered: boolean) => {
      setIsLoading(true);
      setError(null);
      setIsFiltered(filtered);
      getContactedBusinesses(filters)
        .then((list) => setBusinesses(list))
        .catch((err) =>
          setError(err instanceof Error ? err.message : "Veriler getirilemedi.")
        )
        .finally(() => setIsLoading(false));
    },
    []
  );

  // Canlı arama: metin/tarih değiştikçe (debounce) otomatik sorgula.
  // İlk yükleme de bu effect'ten gelir (filtre boşsa son 24 saat).
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const filters: ContactedFilters = {};
      if (fromDate) filters.from = fromDate;
      if (toDate) filters.to = toDate;
      if (query.trim()) filters.q = query.trim();
      loadData(filters, Object.keys(filters).length > 0);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [query, fromDate, toDate, loadData]);

  const handleClearFilters = () => {
    setFromDate("");
    setToDate("");
    setQuery("");
    // Alanlar temizlenince yukarıdaki effect otomatik varsayılan veriyi getirir.
  };

  // CSV: mevcut görünüm (uygulanan filtre / son 24 saat).
  const handleDownloadView = () => {
    downloadContactedBusinessesAsCsv(
      businesses,
      isFiltered ? "filtre" : "son-24-saat"
    );
  };

  // CSV: tüm zamanlar (görünümü değiştirmeden ayrı sorgu).
  const [downloadingAll, setDownloadingAll] = useState(false);
  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      const all = await getContactedBusinesses({ all: true });
      downloadContactedBusinessesAsCsv(all, "tum-zamanlar");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Tüm kayıtlar indirilemedi."
      );
    } finally {
      setDownloadingAll(false);
    }
  };

  // Görüşme sonucunu değiştir: mevcut kanal + personeli koru, sadece sonucu
  // güncelle. State güncellenince kart otomatik yeni kategoriye taşınır.
  const handleOutcomeChange = async (
    business: ContactedBusiness,
    outcome: string
  ) => {
    const updated = await saveBusinessInteraction(business.id, {
      channel: business.interaction?.channel ?? null,
      outcome,
      assignedUserId: business.interaction?.userId ?? null,
    });

    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === business.id ? { ...b, interaction: updated } : b
      )
    );
  };

  // Yeni not eklenince ilgili işletmenin notlarına ekle (kaynak: tek state).
  const handleNoteAdded = (businessId: number, note: BusinessNote) => {
    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === businessId ? { ...b, notes: [...b.notes, note] } : b
      )
    );
  };

  const grouped = CATEGORIES.map((category) => ({
    ...category,
    items: businesses.filter((b) => categoryKeyFor(b) === category.key),
  }));

  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
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

          <div className="mt-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              İletişime Geçilen İşletmeler
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {isFiltered
                ? "Filtre sonuçları gösteriliyor."
                : "Bugün (son 24 saat) iletişime geçilen işletmeler, görüşme sonucuna göre kategorilenmiş olarak listelenir."}
            </p>
          </div>
        </header>

        {/* Filtre / canlı arama */}
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">
                İsim / adres / telefon / e-posta
              </label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Yazdıkça arar..."
                className="h-9 rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">
                Başlangıç
              </label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Bitiş</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 rounded-xl"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
              className="h-9 rounded-xl"
            >
              Temizle
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span>
              Yazdıkça otomatik aranır. Filtre girilmezse son 24 saatteki
              işletmeler gösterilir; tarih aralığıyla geçmişte arayabilirsiniz.
            </span>
            {isLoading && businesses.length > 0 && (
              <span className="shrink-0 text-emerald-600">Aranıyor...</span>
            )}
          </p>
        </div>

        {/* CSV indirme */}
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadView}
            disabled={businesses.length === 0}
            className="rounded-xl"
          >
            CSV İndir{isFiltered ? " (filtre)" : " (son 24 saat)"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            className="rounded-xl"
          >
            {downloadingAll ? "İndiriliyor..." : "Tümünü İndir (CSV)"}
          </Button>
        </div>

        {isLoading && businesses.length === 0 ? (
          <p className="text-sm text-slate-500">Yükleniyor...</p>
        ) : error ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : businesses.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">
            {isFiltered
              ? "Bu filtreyle eşleşen işletme bulunamadı."
              : "Bugün iletişime geçilen işletme yok. İşletme Araştırması sayfasından bir işletmeyle görüşme kaydedin."}
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((category) =>
              category.items.length === 0 ? null : (
                <section key={category.key}>
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${TONE[category.tone].dot}`}
                    />
                    <h2 className="text-base font-semibold text-slate-900">
                      {category.label}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      {category.items.length}
                    </span>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {category.items.map((business) => (
                      <ContactedCard
                        key={business.id}
                        business={business}
                        tone={category.tone}
                        onOutcomeChange={handleOutcomeChange}
                        onNoteAdded={handleNoteAdded}
                      />
                    ))}
                  </div>
                </section>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
