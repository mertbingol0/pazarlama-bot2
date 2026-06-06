"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { API_BASE_URL, readJsonResponse } from "@/lib/api";
import { PageNavigation } from "@/components/PageNavigation";
import { SocialChip } from "@/components/contact-icons";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type LiveSupportStatus = "info_requested" | "follow_up" | "not_interested";

type LiveSupportResult =
  | "pending"
  | "to_meet"
  | "contacted"
  | "record_taken"
  | "rejected"
  | "completed";

type LiveSupportLead = {
  id: string | number;
  phone: string;
  buttonText?: string;
  status?: LiveSupportStatus | "called" | "pending";
  result?: LiveSupportResult;
  meetingAt?: string | null;
  assignedTo?: string | null;
  createdAt?: string;
  updatedAt?: string;
  seenAt?: string | null;
  note?: string;

  businessId?: string | number | null;
  businessName?: string | null;
  email?: string | null;
  instagram?: string | null;
  socials?: string | null;
  address?: string | null;
  website?: string | null;

  conversation?: ConversationMessage[];
};

type ConversationMessage = {
  id: number | string;
  direction: "outgoing" | "incoming";
  type?: string;
  text: string;
  messageId?: string | null;
  createdAt?: string;
};

const RESULT_OPTIONS: { value: LiveSupportResult; label: string }[] = [
  { value: "pending", label: "İşlem bekliyor" },
  { value: "to_meet", label: "Görüşülecek" },
  { value: "contacted", label: "Görüşüldü" },
  { value: "record_taken", label: "Kayıt alındı" },
  { value: "rejected", label: "Reddedildi" },
  { value: "completed", label: "Tamamlandı" },
];

const PERSONNEL = ["Gonca Dumanlı", "Onurhan Keydal"];

// Tüm kartların aynı sütunlara hizalanması için ortak ızgara şablonu
// (tablo görünümü). Başlık satırı ve her kayıt bu şablonu kullanır.
const GRID_COLS =
  "grid grid-cols-[minmax(15rem,1.3fr)_13rem_minmax(14rem,1fr)_18rem]";

type CategoryKey =
  | "to_meet"
  | "info_requested"
  | "follow_up"
  | "not_interested";

const SUPPORT_CATEGORIES: {
  key: CategoryKey;
  title: string;
  description: string;
  headerClass: string;
  countClass: string;
}[] = [
  {
    key: "to_meet",
    title: "Görüşülecekler",
    description: "Görüşülecek + tarih belirlenmiş talepler",
    headerClass: "text-violet-700",
    countClass: "bg-violet-50 text-violet-700",
  },
  {
    key: "info_requested",
    title: "İlgilenenler",
    description: "Bilgi almak isteyenler",
    headerClass: "text-emerald-700",
    countClass: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "follow_up",
    title: "Daha Sonra Dönecekler",
    description: "Sonra aranacaklar",
    headerClass: "text-amber-700",
    countClass: "bg-amber-50 text-amber-700",
  },
  {
    key: "not_interested",
    title: "İlgilenmeyenler",
    description: "Görüşmeyi sonlandıranlar",
    headerClass: "text-red-700",
    countClass: "bg-red-50 text-red-700",
  },
];

// Bir lead'in hangi kategoriye düştüğünü belirler. Sonucu "Görüşülecek" ve
// görüşme tarihi belirlenmişse, statüsünden bağımsız olarak Görüşülecekler'e
// taşınır; aksi halde butona göre (status) sınıflanır.
function getLeadCategory(lead: LiveSupportLead): CategoryKey {
  if (lead.result === "to_meet" && lead.meetingAt) {
    return "to_meet";
  }

  if (lead.status === "follow_up") return "follow_up";
  if (lead.status === "not_interested") return "not_interested";

  return "info_requested";
}

type BackendErrorResponse = {
  message?: string;
  error?: string;
};

type LiveSupportResponse = BackendErrorResponse & {
  success: boolean;
  count: number;
  leads: LiveSupportLead[];
};

type UpdateLiveSupportLeadNoteResponse = BackendErrorResponse & {
  success: boolean;
  lead: LiveSupportLead;
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalizeWhatsAppPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function formatMessageTime(value?: string | null) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function splitSocialLinks(socials?: string | null) {
  return String(socials || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export default function LiveSupportPage() {
  const [leads, setLeads] = useState<LiveSupportLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set());
  const [savingLeadId, setSavingLeadId] = useState<string | number | null>(
    null
  );
  // Açık (genişletilmiş) kategoriler — varsayılan: Görüşülecekler açık.
  const [openCategories, setOpenCategories] = useState<Set<CategoryKey>>(
    new Set<CategoryKey>(["to_meet"])
  );

  const toggleCategory = (key: CategoryKey) => {
    setOpenCategories((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  useEffect(() => {
    const fetchLiveSupportLeads = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const response = await fetch(`${API_BASE_URL}/api/live-support-leads`);

        const data = await readJsonResponse<LiveSupportResponse>(response);

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Canlı destek talepleri getirilemedi.");
        }

        const incomingLeads = data.leads || [];

        const unseenLeadIds = incomingLeads
          .filter((lead) => !lead.seenAt)
          .map((lead) => String(lead.id));

        setNewLeadIds(new Set(unseenLeadIds));
        setLeads(incomingLeads);

        const initialNotes = incomingLeads.reduce(
          (acc: Record<string, string>, lead: LiveSupportLead) => {
            acc[String(lead.id)] = lead.note || "";
            return acc;
          },
          {}
        );

        setNotes(initialNotes);

        if (unseenLeadIds.length > 0) {
          try {
            await fetch(`${API_BASE_URL}/api/live-support-leads/mark-seen`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
            });
          } catch (error) {
            console.warn("Canlı destek bildirimleri görüldü yapılamadı:", error);
          }
        }
      } catch (error) {
        console.error("Canlı destek talepleri alınamadı:", error);

        setLeads([]);
        setNewLeadIds(new Set());
        setErrorMessage(
          "Backend endpoint hazır olmadığında bu liste boş görünür. Endpoint bağlanınca bilgiler burada listelenecek."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchLiveSupportLeads();
  }, []);

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setSuccessMessage("Telefon numarası kopyalandı.");
      setErrorMessage("");
    } catch {
      setErrorMessage("Telefon numarası kopyalanamadı.");
      setSuccessMessage("");
    }
  };

  const handleNoteChange = (leadId: string | number, value: string) => {
    setNotes((prev) => ({
      ...prev,
      [String(leadId)]: value,
    }));
  };

  const handleSaveNote = async (leadId: string | number) => {
    try {
      setSavingLeadId(leadId);
      setErrorMessage("");
      setSuccessMessage("");

      const note = notes[String(leadId)] || "";

      const response = await fetch(
        `${API_BASE_URL}/api/live-support-leads/${leadId}/note`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            note,
          }),
        }
      );

      const data = await readJsonResponse<UpdateLiveSupportLeadNoteResponse>(
        response
      );

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Canlı destek notu kaydedilemedi.");
      }

      setLeads((currentLeads) =>
        currentLeads.map((lead) =>
          String(lead.id) === String(leadId) ? data.lead : lead
        )
      );

      setNotes((currentNotes) => ({
        ...currentNotes,
        [String(leadId)]: data.lead.note || "",
      }));

      setSuccessMessage("Not başarıyla kaydedildi.");
    } catch (error) {
      console.error("Canlı destek notu kaydedilemedi:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Not kaydedilirken hata oluştu."
      );
    } finally {
      setSavingLeadId(null);
    }
  };

  const handleClearLiveSupportLeads = async () => {
    const confirmed = window.confirm(
      "Canlı destek kayıtlarını temizlemek istediğinize emin misiniz?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(`${API_BASE_URL}/api/live-support-leads`, {
        method: "DELETE",
      });

      const data = await readJsonResponse<{
        success: boolean;
        message?: string;
      }>(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Canlı destek kayıtları temizlenemedi.");
      }

      setLeads([]);
      setNotes({});
      setNewLeadIds(new Set());
      setSuccessMessage("Canlı destek kayıtları temizlendi.");
    } catch (error) {
      console.error("Canlı destek kayıtları temizlenemedi:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Canlı destek kayıtları temizlenemedi."
      );
    }
  };

  const handleUpdateLead = async (
    leadId: string | number,
    fields: Partial<
      Pick<LiveSupportLead, "result" | "meetingAt" | "assignedTo" | "note">
    >
  ) => {
    // İyimser güncelleme: önce UI'ı güncelle, sonra kaydet.
    setLeads((currentLeads) =>
      currentLeads.map((lead) =>
        String(lead.id) === String(leadId) ? { ...lead, ...fields } : lead
      )
    );

    try {
      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/live-support-leads/${leadId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        }
      );

      const data = await readJsonResponse<UpdateLiveSupportLeadNoteResponse>(
        response
      );

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Kayıt güncellenemedi.");
      }

      setLeads((currentLeads) =>
        currentLeads.map((lead) =>
          String(lead.id) === String(leadId) ? data.lead : lead
        )
      );

      setSuccessMessage("Kayıt güncellendi.");
    } catch (error) {
      console.error("Canlı destek kaydı güncellenemedi:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Kayıt güncellenemedi."
      );
    }
  };

  // Yatay kart: işletme bilgisi · kontroller · not bölümleri yan yana.
  const renderLeadCard = (lead: LiveSupportLead) => {
    const leadId = String(lead.id);
    const normalizedPhone = normalizeWhatsAppPhone(lead.phone);
    const isNewLead = newLeadIds.has(leadId);
    const socialLinks = splitSocialLinks(lead.socials || lead.instagram);
    // İlgilenmeyenler için personel atama ve görüşme tarihi gerekmez.
    const isNotInterested = getLeadCategory(lead) === "not_interested";

    return (
      <div
        key={leadId}
        className={`${GRID_COLS} transition ${
          isNewLead ? "bg-amber-50/50" : "bg-white hover:bg-slate-50/60"
        }`}
      >
        {/* 1) İşletme bilgisi */}
        <div className="min-w-0 p-3">
          <p className="break-words text-base font-semibold text-slate-900">
            {lead.businessName || "İşletme eşleştirilemedi"}
          </p>

          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
              Telefon
            </span>
            <span className="break-all text-sm font-semibold text-emerald-900">
              {lead.phone}
            </span>
          </div>

          {lead.email && (
            <p className="mt-2 break-all text-sm text-slate-600">
              <span className="font-medium text-slate-400">E-posta: </span>
              {lead.email}
            </p>
          )}

          {socialLinks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {socialLinks.map((link) => (
                <SocialChip key={link} url={link} />
              ))}
            </div>
          )}

          {lead.address && (
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {lead.address}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Badge variant="outline" className="rounded-full">
              {lead.buttonText || "—"}
            </Badge>
            <span>{formatDate(lead.createdAt)}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyPhone(lead.phone)}
            >
              Kopyala
            </Button>

            <Button
              size="sm"
              asChild
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              <a
                href={`https://wa.me/${normalizedPhone}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </Button>

            {lead.website && (
              <Button variant="outline" size="sm" asChild>
                <a href={lead.website} target="_blank" rel="noreferrer">
                  Web
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* 2) Sonuç · personel · görüşme tarihi */}
        <div className="space-y-3 p-3">
          <div>
            <label className="text-xs font-medium text-slate-400">Sonuç</label>
            <select
              value={lead.result || "pending"}
              onChange={(event) =>
                void handleUpdateLead(lead.id, {
                  result: event.target.value as LiveSupportResult,
                })
              }
              className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              {RESULT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {!isNotInterested && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-400">
                  Atanan Personel
                </label>
                <select
                  value={lead.assignedTo || ""}
                  onChange={(event) =>
                    void handleUpdateLead(lead.id, {
                      assignedTo: event.target.value,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Seçilmedi</option>
                  {PERSONNEL.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">
                  Görüşme Tarihi
                </label>
                <input
                  type="datetime-local"
                  value={(lead.meetingAt || "").slice(0, 16)}
                  onChange={(event) =>
                    void handleUpdateLead(lead.id, {
                      meetingAt: event.target.value,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </>
          )}
        </div>

        {/* 3) Not */}
        <div className="flex flex-col p-3">
          <label className="text-xs font-medium text-slate-400">Not</label>

          <textarea
            value={notes[leadId] || ""}
            onChange={(event) => handleNoteChange(lead.id, event.target.value)}
            rows={3}
            placeholder="Bu numara için not ekle..."
            className="mt-1 w-full flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSaveNote(lead.id)}
            disabled={savingLeadId === lead.id}
            className="mt-2 w-full rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {savingLeadId === lead.id ? "Kaydediliyor..." : "Notu Kaydet"}
          </Button>
        </div>

        {/* 4) O güne ait WhatsApp konuşması */}
        <div className="flex flex-col p-3">
          <label className="text-xs font-medium text-slate-400">
            Son WhatsApp Konuşması
          </label>

          <div className="mt-2 flex-1 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-2 lg:max-h-72">
            {!lead.conversation || lead.conversation.length === 0 ? (
              <p className="p-2 text-xs text-slate-400">
                Bu numarayla kayıtlı bir konuşma yok.
              </p>
            ) : (
              lead.conversation.map((message) => {
                const isOutgoing = message.direction === "outgoing";

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      isOutgoing ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3 py-1.5 text-xs ${
                        isOutgoing
                          ? "bg-emerald-500 text-white"
                          : "bg-white text-slate-700"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.text || "(boş mesaj)"}
                      </p>
                      <p
                        className={`mt-0.5 text-right text-[10px] ${
                          isOutgoing ? "text-emerald-50" : "text-slate-400"
                        }`}
                      >
                        {isOutgoing ? "Gönderildi" : "Gelen"} ·{" "}
                        {formatMessageTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

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
          <div className="mx-auto mt-8 max-w-3xl text-center">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Canlı <span className="text-emerald-500">Destek</span>
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
              Template mesajındaki butonlara (Bilgi almak istiyorum · Daha sonra
              dönüş yapacağım · İlgilenmiyorum) tıklayan müşteriler durumlarına
              göre aşağıda listelenir.
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="rounded-3xl bg-white">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">Toplam Talep</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {leads.length}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl bg-white">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">Yeni / Görülmemiş</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {newLeadIds.size}
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            {!isLoading && successMessage && (
              <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                {successMessage}
              </p>
            )}

            {!isLoading && errorMessage && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleClearLiveSupportLeads}
            disabled={isLoading || leads.length === 0}
            className="h-9 rounded-xl border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tümünü Temizle
          </Button>
        </div>

        {isLoading && (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Canlı destek talepleri yükleniyor...
          </p>
        )}

        {!isLoading && leads.length === 0 && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              Henüz canlı destek talebi bulunamadı.
            </p>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Müşteriler template butonlarına tıkladığında talepler burada
              durumlarına göre otomatik listelenecek.
            </p>
          </div>
        )}

        {!isLoading && leads.length > 0 && (
          <section className="mt-4 space-y-3">
            {SUPPORT_CATEGORIES.map((category) => {
              const categoryLeads = leads.filter(
                (lead) => getLeadCategory(lead) === category.key
              );
              const isOpen = openCategories.has(category.key);

              return (
                <Card
                  key={category.key}
                  className="overflow-hidden rounded-3xl bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.key)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        className={`text-slate-400 transition-transform ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      >
                        <path
                          d="M9 6l6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      <div>
                        <p
                          className={`text-base font-semibold ${category.headerClass}`}
                        >
                          {category.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {category.description}
                        </p>
                      </div>
                    </div>

                    <Badge className={`rounded-full ${category.countClass}`}>
                      {categoryLeads.length}
                    </Badge>
                  </button>

                  {isOpen && (
                    <div>
                      {categoryLeads.length === 0 ? (
                        <p className="m-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                          Bu kategoride kayıt yok.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <div className="min-w-[64rem]">
                            {/* Tablo başlığı */}
                            <div
                              className={`${GRID_COLS} bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500`}
                            >
                              <div className="px-3 py-2">
                                İşletme Bilgisi
                              </div>
                              <div className="px-3 py-2">
                                Sonuç & Atama
                              </div>
                              <div className="px-3 py-2">
                                Not
                              </div>
                              <div className="px-3 py-2">Son Konuşma</div>
                            </div>

                            {categoryLeads.map(renderLeadCard)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
