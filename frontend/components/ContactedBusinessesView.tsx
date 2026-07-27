"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  getAssignableUsers,
  getContactedBusinesses,
  getWhatsAppConversation,
  saveBusinessInteraction,
  sendWhatsAppMessage,
  addBusinessNote,
  updateBusinessStatus,
  OUTCOME_LABELS,
  OUTCOME_OPTIONS,
  TEAM_LABELS,
  type AssignableUser,
  type ContactedBusiness,
  type ContactedFilters,
  type BusinessNote,
  type NoteCategory,
  type OutcomeTone,
  type Team,
  type LoginUser,
  type WhatsAppChatMessage,
} from "@/lib/api";
import type { LeadStatus } from "@/types/business";
import { loadAuth } from "@/lib/auth-storage";
import { locations } from "@/lib/tr-locations";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { downloadContactedBusinessesAsCsv } from "@/lib/export";

// Görüşme sonucu rozet renkleri.
const OUTCOME_TONE: Record<string, OutcomeTone> = {
  record_taken: "green",
  to_meet: "orange",
  follow_up: "yellow",
  rejected: "red",
};

const TONE_BADGE: Record<OutcomeTone, string> = {
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  orange: "bg-orange-50 text-orange-700",
  yellow: "bg-yellow-50 text-yellow-700",
  gray: "bg-slate-100 text-slate-500",
};

// İşletme durumu flag'i (belirgin). Yalnızca admin değiştirir.
const STATUS_META: Record<LeadStatus, { label: string; flag: string }> = {
  approved: { label: "Onaylandı", flag: "bg-emerald-500 text-white" },
  rejected: { label: "Reddedildi", flag: "bg-red-500 text-white" },
  pending: { label: "Beklemede", flag: "bg-amber-400 text-white" },
};
const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "pending", label: "Beklemede" },
  { value: "approved", label: "Onaylandı" },
  { value: "rejected", label: "Reddedildi" },
];

// Birim not sütunları (soldan sağa). WP yalnızca WhatsApp sohbetinden beslenir.
const NOTE_COLUMNS: { category: NoteCategory; label: string }[] = [
  { category: "wp", label: "WP Notları" },
  { category: "saha", label: "Saha Ekibi" },
  { category: "cagri", label: "Canlı Destek & Çağrı Merkezi" },
  { category: "admin", label: "Admin" },
];

// Kullanıcının yazabileceği sütun (WP hariç; o sohbetten gelir).
function myNoteCategory(user: LoginUser | null): NoteCategory | null {
  if (!user) return null;
  if (user.role === "admin") return "admin";
  if (user.team === "saha_pazarlama") return "saha";
  if (user.team === "cagri_merkezi") return "cagri";
  return null; // reklam_pazarlama vb. → not ekleyemez
}

// Türkçe diakritikleri sadeleştir (adres içinde il/ilçe araması için).
function normLoc(value?: string | null) {
  return (value || "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replaceAll("İ", "i");
}

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

// interaction.meetingAt (UTC "YYYY-MM-DD HH:MM:SS") -> datetime-local ("YYYY-MM-DDTHH:MM")
function utcToLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(String(value).replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// datetime-local ("YYYY-MM-DDTHH:MM") -> UTC "YYYY-MM-DD HH:MM:SS"
function localInputToUtc(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function userLabel(user: AssignableUser) {
  return user.fullName ? `${user.fullName} (${user.username})` : user.username;
}

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

// Tek bir birim sütunu hücresi: o birimin notları + (yetki varsa) ekleme kutusu.
function NoteCell({
  notes,
  category,
  canAdd,
  onAdd,
}: {
  notes: BusinessNote[];
  category: NoteCategory;
  canAdd: boolean;
  onAdd: (category: NoteCategory, text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ordered = [...notes].sort((a, b) =>
    String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
  );

  const handleAdd = async () => {
    const value = text.trim();
    if (!value) return;
    setSaving(true);
    setError(null);
    try {
      await onAdd(category, value);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not eklenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <td className="min-w-[220px] max-w-[280px] border-l border-slate-100 p-2 align-top">
      <div className="flex flex-col gap-1.5">
        {/* Sabit yükseklik (144px): çok not olursa satır büyümez, içeride kaydırılır. */}
        <div className="flex h-36 flex-col gap-1.5 overflow-y-auto pr-1">
          {ordered.length === 0 && (
            <p className="px-1 py-0.5 text-[11px] text-slate-300">Not yok</p>
          )}
          {ordered.map((n) => {
          const author = n.userFullName || n.userUsername || "Bilinmeyen";
          return (
            <div key={n.id} className="rounded-lg bg-slate-50 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${avatarColor(
                      author
                    )}`}
                    aria-hidden
                  >
                    {initials(author)}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700">
                    {author}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {formatDateTime(n.createdAt)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                {n.note}
              </p>
            </div>
          );
          })}
        </div>

        {canAdd && (
          <div className="mt-1 flex flex-col gap-1">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Not ekle..."
              className="min-h-[36px] rounded-lg bg-white text-xs"
              rows={2}
            />
            <Button
              type="button"
              onClick={handleAdd}
              disabled={saving || !text.trim()}
              className="h-7 self-end rounded-lg bg-emerald-500 px-3 text-xs text-white hover:bg-emerald-600"
            >
              {saving ? "..." : "Ekle"}
            </Button>
            {error && <p className="text-[11px] text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </td>
  );
}

// WP sütunu: WhatsApp / Notlar geçişli hücre. WhatsApp'ta o işletmenin sohbet
// geçmişi (baloncuklar) gösterilir; Notlar'da mevcut WP notları listelenir.
// canSend true iken (yalnızca admin) WhatsApp sekmesinde manuel mesaj kutusu açılır.
function WpCell({
  notes,
  phone,
  businessId,
  canSend,
}: {
  notes: BusinessNote[];
  phone: string | null;
  businessId: number;
  canSend: boolean;
}) {
  const [view, setView] = useState<"whatsapp" | "notes">("notes");
  const [messages, setMessages] = useState<WhatsAppChatMessage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const ordered = [...notes].sort((a, b) =>
    String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
  );

  // WhatsApp sekmesi ilk kez açıldığında sohbeti çek (istek anında, sayfa yükünde değil).
  const showWhatsApp = () => {
    setView("whatsapp");
    if (messages !== null || loading || !phone) return;
    setLoading(true);
    setError(null);
    getWhatsAppConversation(phone)
      .then(setMessages)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Sohbet getirilemedi.")
      )
      .finally(() => setLoading(false));
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await sendWhatsAppMessage({ businessId, message: text });
      setDraft("");
      // Baloncuğu anında göster; arka planda sohbeti yeniden çekerek gerçek kayıtla eşitle.
      const optimistic: WhatsAppChatMessage = {
        id: `local-${Date.now()}`,
        direction: "outgoing",
        type: "text",
        text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => (prev ? [...prev, optimistic] : [optimistic]));
      if (phone) {
        getWhatsAppConversation(phone)
          .then(setMessages)
          .catch(() => {
            // yenileme başarısızsa iyimser mesaj listede kalır
          });
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Mesaj gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  const tab = (active: boolean) =>
    `flex-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
      active ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
    }`;

  return (
    <td className="min-w-[220px] max-w-[280px] border-l border-slate-100 p-2 align-top">
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1">
          <button type="button" onClick={showWhatsApp} className={tab(view === "whatsapp")}>
            WhatsApp
          </button>
          <button type="button" onClick={() => setView("notes")} className={tab(view === "notes")}>
            Notlar
          </button>
        </div>

        <div className="flex h-36 flex-col gap-1.5 overflow-y-auto pr-1">
          {view === "notes" ? (
            ordered.length === 0 ? (
              <p className="px-1 py-0.5 text-[11px] text-slate-300">Not yok</p>
            ) : (
              ordered.map((n) => {
                const author = n.userFullName || n.userUsername || "Bilinmeyen";
                return (
                  <div key={n.id} className="rounded-lg bg-slate-50 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${avatarColor(
                            author
                          )}`}
                          aria-hidden
                        >
                          {initials(author)}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700">
                          {author}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                      {n.note}
                    </p>
                  </div>
                );
              })
            )
          ) : !phone ? (
            <p className="px-1 py-0.5 text-[11px] text-slate-300">Telefon yok</p>
          ) : loading ? (
            <p className="px-1 py-0.5 text-[11px] text-slate-400">Yükleniyor...</p>
          ) : error ? (
            <p className="px-1 py-0.5 text-[11px] text-red-500">{error}</p>
          ) : messages && messages.length === 0 ? (
            <p className="px-1 py-0.5 text-[11px] text-slate-300">Mesaj yok</p>
          ) : (
            (messages || []).map((m) => {
              const isOut = m.direction === "outgoing";
              return (
                <div key={m.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-2.5 py-1.5 text-xs ${
                      isOut ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <p
                      className={`mt-0.5 text-right text-[9px] ${
                        isOut ? "text-emerald-50" : "text-slate-400"
                      }`}
                    >
                      {formatDateTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {view === "whatsapp" && canSend && phone && (
          <div className="mt-1 flex flex-col gap-1">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Mesaj yaz..."
              className="min-h-[36px] rounded-lg bg-white text-xs"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              className="h-7 self-end rounded-lg bg-emerald-500 px-3 text-xs text-white hover:bg-emerald-600"
            >
              {sending ? "..." : "Gönder"}
            </Button>
            {sendError && <p className="text-[11px] text-red-600">{sendError}</p>}
          </div>
        )}
      </div>
    </td>
  );
}

// mode "talked" = Görüşülen (record_taken hariç), "recorded" = Kayıt Alınan (sadece record_taken).
export function ContactedBusinessesView({
  mode = "talked",
  title,
  description,
}: {
  mode?: "talked" | "recorded";
  title: string;
  description: string;
}) {
  const [businesses, setBusinesses] = useState<ContactedBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<LoginUser | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);

  // Filtre alanları (tarih/metin sunucuda; şehir/ilçe/kullanıcı/sıralama istemcide)
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState(""); // işletme kategorisi
  const [userFilter, setUserFilter] = useState(""); // interaction.userId (string)
  const [sortOrder, setSortOrder] = useState<
    "recent" | "oldest" | "last_note"
  >("recent");
  const [isFiltered, setIsFiltered] = useState(false);

  useEffect(() => {
    setUser(loadAuth()?.user ?? null);
  }, []);

  const myCategory = myNoteCategory(user);
  const isAdmin = user?.role === "admin";

  // Personel atama listesi — yalnızca admin ilk açılışta çeker.
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    getAssignableUsers()
      .then((users) => {
        if (active) setAssignableUsers(users);
      })
      .catch(() => {
        /* sessizce yoksay; dropdown boş kalır */
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

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
  // Yarım seçim (sadece "from" var, "to" henüz yok) fetch tetiklemesin —
  // aksi halde her range seçimi iki isteğe (partial + tam) sebep olur.
  const rangeIncomplete =
    (dateRange.from && !dateRange.to) || (!dateRange.from && dateRange.to);

  useEffect(() => {
    if (rangeIncomplete) return;
    const handle = window.setTimeout(() => {
      const filters: ContactedFilters = {};
      if (dateRange.from) filters.from = dateRange.from;
      if (dateRange.to) filters.to = dateRange.to;
      if (query.trim()) filters.q = query.trim();
      loadData(filters, Object.keys(filters).length > 0);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query, dateRange.from, dateRange.to, rangeIncomplete, loadData]);

  const handleClearFilters = () => {
    setDateRange({ from: "", to: "" });
    setQuery("");
    setCityFilter("");
    setDistrictFilter("");
    setSectorFilter("");
    setUserFilter("");
    setSortOrder("recent");
  };

  // Bu sayfanın moduna giren işletmeler.
  const inMode = useCallback(
    (b: ContactedBusiness) => {
      const isRecorded = b.interaction?.outcome === "record_taken";
      return mode === "recorded" ? isRecorded : !isRecorded;
    },
    [mode]
  );

  const modeBusinesses = businesses.filter(inMode);

  // Şehir/ilçe seçenekleri tüm Türkiye listesinden; eşleştirme adres metnine göre.
  const trSort = (a: string, b: string) => a.localeCompare(b, "tr");
  const cityOptions = locations.map((c) => c.label);
  const districtOptions =
    locations.find((c) => c.label === cityFilter)?.districts.map((d) => d.label) ??
    [];
  const sectorOptions = Array.from(
    new Set(modeBusinesses.map((b) => b.category).filter(Boolean) as string[])
  ).sort(trSort);
  const userOptions = Array.from(
    new Map(
      modeBusinesses
        .filter((b) => b.interaction?.userId != null)
        .map((b) => [
          String(b.interaction!.userId),
          b.interaction!.userFullName ||
            b.interaction!.userUsername ||
            `#${b.interaction!.userId}`,
        ])
    ).entries()
  ).sort((a, b) => trSort(a[1], b[1]));

  // Görüşme zamanı (sıralama için).
  const contactTime = (b: ContactedBusiness) =>
    b.interaction?.updatedAt || b.activityAt || "";

  // İşletmenin son not oluşturma zamanı; not yoksa boş string (en sona düşer).
  const lastNoteTime = (b: ContactedBusiness) => {
    let max = "";
    for (const n of b.notes) {
      const t = n.createdAt || "";
      if (t > max) max = t;
    }
    return max;
  };

  const visibleBusinesses = modeBusinesses
    .filter((b) => {
      // İl/ilçe: adres + (varsa) yapısal alanlar üzerinde metin eşleşmesi.
      const locText = normLoc(
        [b.address, b.city, b.district].filter(Boolean).join(" ")
      );
      if (cityFilter && !locText.includes(normLoc(cityFilter))) return false;
      if (districtFilter && !locText.includes(normLoc(districtFilter)))
        return false;
      if (sectorFilter && b.category !== sectorFilter) return false;
      if (userFilter && String(b.interaction?.userId ?? "") !== userFilter)
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === "last_note") {
        const ta = lastNoteTime(a);
        const tb = lastNoteTime(b);
        // Notu olmayanlar en sona; aynı olanlar arasında görüşme zamanına göre.
        if (!ta && !tb) return contactTime(b).localeCompare(contactTime(a));
        if (!ta) return 1;
        if (!tb) return -1;
        return tb.localeCompare(ta);
      }
      const ta = contactTime(a);
      const tb = contactTime(b);
      return sortOrder === "recent" ? tb.localeCompare(ta) : ta.localeCompare(tb);
    });

  const handleDownloadView = () => {
    downloadContactedBusinessesAsCsv(
      visibleBusinesses,
      isFiltered ? "filtre" : "son-24-saat"
    );
  };

  const [downloadingAll, setDownloadingAll] = useState(false);
  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      const all = await getContactedBusinesses({ all: true });
      downloadContactedBusinessesAsCsv(all.filter(inMode), "tum-zamanlar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tüm kayıtlar indirilemedi.");
    } finally {
      setDownloadingAll(false);
    }
  };

  // Görüşme sonucunu değiştir (kart/satır otomatik ilgili sayfaya taşınır).
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

  // Admin: bir işletmeye personel ata (mevcut kanal/sonuç korunur).
  const handleAssignedUserChange = async (
    business: ContactedBusiness,
    assignedUserId: number | null
  ) => {
    try {
      const updated = await saveBusinessInteraction(business.id, {
        channel: business.interaction?.channel ?? null,
        outcome: business.interaction?.outcome ?? null,
        assignedUserId,
      });
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === business.id ? { ...b, interaction: updated } : b
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Personel atanamadı.");
    }
  };

  // Admin: randevu (görüşme) tarihini kaydet. Boş string temizler.
  const handleMeetingAtChange = async (
    business: ContactedBusiness,
    localValue: string
  ) => {
    try {
      const updated = await saveBusinessInteraction(business.id, {
        channel: business.interaction?.channel ?? null,
        outcome: business.interaction?.outcome ?? null,
        assignedUserId: business.interaction?.userId ?? null,
        meetingAt: localValue ? localInputToUtc(localValue) : null,
      });
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === business.id ? { ...b, interaction: updated } : b
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Randevu tarihi kaydedilemedi."
      );
    }
  };

  // İşletme durumunu değiştir (yalnızca admin). İyimser güncelle, hatada geri al.
  const handleStatusChange = async (
    business: ContactedBusiness,
    status: LeadStatus
  ) => {
    const previous = business.status;
    setBusinesses((prev) =>
      prev.map((b) => (b.id === business.id ? { ...b, status } : b))
    );
    try {
      await updateBusinessStatus(business.id, status);
    } catch (err) {
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === business.id ? { ...b, status: previous } : b
        )
      );
      setError(err instanceof Error ? err.message : "Durum güncellenemedi.");
    }
  };

  // Bir sütundan not eklenince ilgili işletmenin notlarına ekle.
  const handleAddNote = async (
    business: ContactedBusiness,
    category: NoteCategory,
    text: string
  ) => {
    const note = await addBusinessNote(business.id, text, category);
    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === business.id ? { ...b, notes: [...b.notes, note] } : b
      )
    );
  };

  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-[110rem]">
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
          </div>

          <div className="mt-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {isFiltered ? "Filtre sonuçları gösteriliyor." : description}
            </p>
          </div>
        </header>

        {/* Filtre / canlı arama */}
        <div className="mb-6 rounded-2xl bg-white p-4">
          <div className="grid items-end gap-3 sm:grid-cols-3">
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
                Tarih aralığı
              </label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
              />
            </div>
          </div>

          <div className="mt-2 grid items-end gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Şehir</label>
              <Select
                value={cityFilter || "__all__"}
                onValueChange={(v) => {
                  setCityFilter(v === "__all__" ? "" : v);
                  setDistrictFilter("");
                }}
              >
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue placeholder="Tüm şehirler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tüm şehirler</SelectItem>
                  {cityOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">İlçe</label>
              <Select
                value={districtFilter || "__all__"}
                onValueChange={(v) =>
                  setDistrictFilter(v === "__all__" ? "" : v)
                }
              >
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue placeholder="Tüm ilçeler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tüm ilçeler</SelectItem>
                  {districtOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Sektör</label>
              <Select
                value={sectorFilter || "__all__"}
                onValueChange={(v) => setSectorFilter(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue placeholder="Tüm sektörler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tüm sektörler</SelectItem>
                  {sectorOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">
                Personel
              </label>
              <Select
                value={userFilter || "__all__"}
                onValueChange={(v) => setUserFilter(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue placeholder="Tüm personel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tüm personel</SelectItem>
                  {userOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">
                Sıralama
              </label>
              <Select
                value={sortOrder}
                onValueChange={(v) =>
                  setSortOrder(v as "recent" | "oldest" | "last_note")
                }
              >
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Son görüşülen</SelectItem>
                  <SelectItem value="oldest">İlk görüşülen</SelectItem>
                  <SelectItem value="last_note">Son not bırakılan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <span>
                Yazdıkça otomatik aranır. Filtre girilmezse son 24 saatteki
                işletmeler gösterilir; tarih aralığıyla geçmişte arayabilirsiniz.
              </span>
              {isLoading && visibleBusinesses.length > 0 && (
                <span className="shrink-0 text-emerald-600">Aranıyor...</span>
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
              className="h-9 shrink-0 rounded-xl"
            >
              Temizle
            </Button>
          </div>
        </div>

        {/* CSV indirme */}
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadView}
            disabled={visibleBusinesses.length === 0}
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

        {isLoading && visibleBusinesses.length === 0 ? (
          <p className="text-sm text-slate-500">Yükleniyor...</p>
        ) : error ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : visibleBusinesses.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">
            {isFiltered ||
            cityFilter ||
            districtFilter ||
            sectorFilter ||
            userFilter
              ? "Bu filtreyle eşleşen işletme bulunamadı."
              : mode === "recorded"
                ? "Bugün kayıt alınan işletme yok. Görüşülen İşletmeler sayfasından sonucu 'Kayıt Alındı' yapın."
                : "Bugün görüşülen işletme yok. İşletme Araştırması sayfasından bir işletmeyle görüşme kaydedin."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="p-3">Personel</th>
                  <th className="p-3">İşletme</th>
                  {NOTE_COLUMNS.map((col) => (
                    <th key={col.category} className="border-l border-slate-100 p-3">
                      {col.label}
                    </th>
                  ))}
                  <th className="border-l border-slate-100 p-3 text-center">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleBusinesses.map((business) => {
                  const interaction = business.interaction;
                  const personnel =
                    interaction?.userFullName ||
                    interaction?.userUsername ||
                    null;
                  const teamLabel = interaction?.team
                    ? TEAM_LABELS[interaction.team as Team] || interaction.team
                    : null;
                  const meta = [business.category, business.district, business.city]
                    .filter(Boolean)
                    .join(" · ");
                  const outcome = interaction?.outcome;
                  const tone = outcome ? OUTCOME_TONE[outcome] || "gray" : "gray";

                  return (
                    <tr
                      key={business.id}
                      className="border-b border-slate-100 align-top"
                    >
                      {/* Görüşmeyi başlatan personel + (admin) atama/randevu */}
                      <td className="min-w-[190px] p-3 align-top">
                        {personnel ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(
                                personnel
                              )}`}
                              aria-hidden
                            >
                              {initials(personnel)}
                            </span>
                            <div className="leading-tight">
                              <p className="text-xs font-semibold text-slate-800">
                                {personnel}
                              </p>
                              {teamLabel && (
                                <p className="text-[10px] text-slate-400">
                                  {teamLabel}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}

                        {/* Randevu tarihi (herkes görür; admin değiştirir) */}
                        {interaction?.meetingAt && (
                          <p className="mt-2 text-[11px] text-slate-500">
                            Randevu: {formatDateTime(interaction.meetingAt)}
                          </p>
                        )}

                        {isAdmin && (
                          <div className="mt-2 flex flex-col gap-1.5">
                            <Select
                              value={
                                interaction?.userId
                                  ? String(interaction.userId)
                                  : ""
                              }
                              onValueChange={(value) =>
                                handleAssignedUserChange(
                                  business,
                                  value ? Number(value) : null
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-full rounded-lg bg-white text-xs">
                                <SelectValue placeholder="Personel ata" />
                              </SelectTrigger>
                              <SelectContent>
                                {assignableUsers.map((u) => (
                                  <SelectItem key={u.id} value={String(u.id)}>
                                    {userLabel(u)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-medium text-slate-500">
                                Randevu tarihi
                              </label>
                              <Input
                                type="datetime-local"
                                defaultValue={utcToLocalInput(
                                  interaction?.meetingAt
                                )}
                                onBlur={(e) => {
                                  const next = e.currentTarget.value;
                                  const current = utcToLocalInput(
                                    interaction?.meetingAt
                                  );
                                  if (next !== current) {
                                    handleMeetingAtChange(business, next);
                                  }
                                }}
                                className="h-8 rounded-lg bg-white text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* İşletme adı + meta + görüşme sonucu */}
                      <td className="min-w-[200px] max-w-[260px] border-l border-slate-100 p-3 align-top">
                        <p className="text-sm font-semibold text-slate-900">
                          {business.name || "İsimsiz işletme"}
                        </p>
                        {meta && (
                          <p className="mt-0.5 text-xs text-slate-400">{meta}</p>
                        )}
                        {business.phone && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {business.phone}
                          </p>
                        )}
                        {outcome && OUTCOME_LABELS[outcome] && (
                          <span
                            className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_BADGE[tone]}`}
                          >
                            {OUTCOME_LABELS[outcome]}
                          </span>
                        )}
                        <div className="mt-2">
                          <Select
                            value={outcome || ""}
                            onValueChange={(value) =>
                              handleOutcomeChange(business, value)
                            }
                          >
                            <SelectTrigger className="h-8 w-full rounded-lg bg-white text-xs">
                              <SelectValue placeholder="Sonuç değiştir" />
                            </SelectTrigger>
                            <SelectContent>
                              {OUTCOME_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>

                      {/* Birim not sütunları */}
                      {NOTE_COLUMNS.map((col) => {
                        const colNotes = business.notes.filter(
                          (n) => n.category === col.category
                        );
                        // WP sütunu: WhatsApp sohbeti / Notlar geçişli özel hücre.
                        // Manuel mesaj kutusu yalnızca admin için açılır.
                        if (col.category === "wp") {
                          return (
                            <WpCell
                              key={col.category}
                              notes={colNotes}
                              phone={business.phone}
                              businessId={business.id}
                              canSend={isAdmin}
                            />
                          );
                        }
                        return (
                          <NoteCell
                            key={col.category}
                            category={col.category}
                            notes={colNotes}
                            canAdd={myCategory === col.category}
                            onAdd={(category, text) =>
                              handleAddNote(business, category, text)
                            }
                          />
                        );
                      })}

                      {/* İşletme durumu flag'i (en sonda, sadece admin değiştirir) */}
                      <td className="min-w-[150px] border-l border-slate-100 p-3 text-center align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold shadow-sm ${
                            STATUS_META[business.status]?.flag ||
                            STATUS_META.pending.flag
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full bg-white/90" />
                          {STATUS_META[business.status]?.label ||
                            STATUS_META.pending.label}
                        </span>
                        {isAdmin && (
                          <div className="mt-2">
                            <Select
                              value={business.status}
                              onValueChange={(value) =>
                                handleStatusChange(business, value as LeadStatus)
                              }
                            >
                              <SelectTrigger className="h-8 w-full rounded-lg bg-white text-xs">
                                <SelectValue placeholder="Durum değiştir" />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
