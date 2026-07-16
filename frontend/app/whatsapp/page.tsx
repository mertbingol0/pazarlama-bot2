"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { API_BASE_URL, addBusinessNote, readJsonResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";

type ConversationSummary = {
  contactKey: string;
  phone: string;
  businessName?: string | null;
  lastMessage?: { direction: string; text: string; type?: string } | null;
  lastMessageAt?: string | null;
  lastIncomingAt?: string | null;
  unreadCount: number;
  canSendFreeText: boolean;
};

type ChatMessage = {
  id: number | string;
  direction: "outgoing" | "incoming";
  type?: string;
  text: string;
  createdAt?: string;
};

type ContactBusiness = {
  id?: number | string;
  name?: string | null;
  source?: string | null;
  category?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  website?: string | null;
};

type ContactLead = {
  status?: string;
  result?: string;
  meetingAt?: string | null;
  assignedTo?: string | null;
};

const RESULT_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "İşlem bekliyor" },
  { value: "to_meet", label: "Görüşülecek" },
  { value: "contacted", label: "Görüşüldü" },
  { value: "record_taken", label: "Kayıt alındı" },
  { value: "rejected", label: "Reddedildi" },
  { value: "completed", label: "Tamamlandı" },
];

const TEMPLATE_OPTIONS: { value: string; label: string }[] = [
  { value: "jefedes_kuafor", label: "Jefedes Kuaför (jefedes_kuafor)" },
  { value: "otel", label: "Otel (otel)" },
  { value: "restoran_kafe", label: "Restoran & Kafe (restoran_kafe)" },
  { value: "dugun_davet", label: "Düğün & Davet (dugun_davet)" },
  { value: "spor", label: "Spor (spor)" },
  { value: "saglik", label: "Sağlık (saglik)" },
];
const TEMPLATE_LANGUAGE_CODE = "tr";

function formatSource(source?: string | null) {
  if (source === "google_places") return "Google Places";
  if (source === "google_maps") return "Google Maps";
  if (source === "website_scrape") return "Website";
  if (source === "manual") return "Manuel";
  return source || "—";
}

function formatTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(String(value).replace(" ", "T") + "Z"));
  } catch {
    return "";
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(String(value).replace(" ", "T") + "Z"));
  } catch {
    return "";
  }
}

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationQuery, setConversationQuery] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [canSendFreeText, setCanSendFreeText] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [business, setBusiness] = useState<ContactBusiness | null>(null);
  const [lead, setLead] = useState<ContactLead | null>(null);
  const [outcomeResult, setOutcomeResult] = useState("pending");
  const [meetingAt, setMeetingAt] = useState("");
  const [outcomeSaved, setOutcomeSaved] = useState(false);
  // WP notu (görüşülen/kayıt alınan tablosundaki "WP" sütununa düşer).
  const [wpNote, setWpNote] = useState("");
  const [wpSaving, setWpSaving] = useState(false);
  const [wpSaved, setWpSaved] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);

  const initializedPhoneRef = useRef<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/conversations`);
      const data = await readJsonResponse<{
        success: boolean;
        conversations: ConversationSummary[];
      }>(response);

      if (response.ok && data.success) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.warn("Sohbetler alınamadı:", error);
    }
  }, []);

  const fetchMessages = useCallback(async (phone: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/whatsapp/conversations/${encodeURIComponent(phone)}`
      );
      const data = await readJsonResponse<{
        success: boolean;
        messages: ChatMessage[];
        canSendFreeText: boolean;
        business: ContactBusiness | null;
        lead: ContactLead | null;
      }>(response);

      if (response.ok && data.success) {
        setMessages(data.messages || []);
        setCanSendFreeText(Boolean(data.canSendFreeText));
        setBusiness(data.business || null);
        setLead(data.lead || null);

        // Sonuç kontrollerini yalnızca sohbet ilk açıldığında doldur
        // (polling sırasında kullanıcının seçimini ezme).
        if (initializedPhoneRef.current !== phone) {
          initializedPhoneRef.current = phone;
          setOutcomeResult(data.lead?.result || "pending");
          setMeetingAt((data.lead?.meetingAt || "").slice(0, 16));
        }
      }
    } catch (error) {
      console.warn("Mesajlar alınamadı:", error);
    }
  }, []);

  const handleSaveOutcome = useCallback(
    async (result: string, nextMeetingAt: string) => {
      if (!selectedPhone) return;

      setOutcomeSaved(false);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/whatsapp/conversations/${encodeURIComponent(
            selectedPhone
          )}/outcome`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              result,
              meetingAt: nextMeetingAt || null,
            }),
          }
        );

        const data = await readJsonResponse<{ success: boolean; lead: ContactLead }>(
          response
        );

        if (response.ok && data.success) {
          setLead(data.lead || null);
          setOutcomeSaved(true);
          window.setTimeout(() => setOutcomeSaved(false), 2000);
        }
      } catch (error) {
        console.warn("Sonuç kaydedilemedi:", error);
      }
    },
    [selectedPhone]
  );

  // Sohbet listesini sık aralıklarla yenile (yenilemeden anlık güncelleme).
  useEffect(() => {
    void fetchConversations();
    const id = window.setInterval(() => void fetchConversations(), 3000);
    return () => window.clearInterval(id);
  }, [fetchConversations]);

  // Seçili sohbetin mesajlarını ~2 saniyede bir yenile.
  useEffect(() => {
    if (!selectedPhone) return;

    void fetchMessages(selectedPhone);
    const id = window.setInterval(() => void fetchMessages(selectedPhone), 2000);
    return () => window.clearInterval(id);
  }, [selectedPhone, fetchMessages]);

  // Sekme tekrar görünür/odaklanınca anında yenile.
  useEffect(() => {
    const refreshNow = () => {
      void fetchConversations();
      if (selectedPhone) void fetchMessages(selectedPhone);
    };

    window.addEventListener("focus", refreshNow);
    document.addEventListener("visibilitychange", refreshNow);

    return () => {
      window.removeEventListener("focus", refreshNow);
      document.removeEventListener("visibilitychange", refreshNow);
    };
  }, [selectedPhone, fetchConversations, fetchMessages]);

  const handleAddWpNote = async () => {
    const text = wpNote.trim();
    if (!text || !business?.id) return;
    setWpSaving(true);
    try {
      await addBusinessNote(business.id, text, "wp");
      setWpNote("");
      setWpSaved(true);
      window.setTimeout(() => setWpSaved(false), 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Not eklenemedi.");
    } finally {
      setWpSaving(false);
    }
  };

  const handleSelect = (phone: string) => {
    setSelectedPhone(phone);
    setErrorMessage("");
    initializedPhoneRef.current = null; // yeni sohbette sonuç kontrolleri yeniden yüklensin
    setBusiness(null);
    setLead(null);
    setWpNote("");
    setSelectedTemplate("");
    // Okundu işaretlenince listedeki rozet güncellensin.
    setConversations((current) =>
      current.map((conversation) =>
        conversation.phone === phone
          ? { ...conversation, unreadCount: 0 }
          : conversation
      )
    );
  };

  const handleSendTemplate = async () => {
    if (!selectedPhone || !selectedTemplate) return;

    setIsSendingTemplate(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/whatsapp/conversations/${encodeURIComponent(
          selectedPhone
        )}/send-template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateName: selectedTemplate,
            languageCode: TEMPLATE_LANGUAGE_CODE,
          }),
        }
      );

      const data = await readJsonResponse<{ success: boolean; message?: string }>(
        response
      );

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Template gönderilemedi.");
      }

      setSelectedTemplate("");
      await fetchMessages(selectedPhone);
      await fetchConversations();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Template gönderilemedi."
      );
    } finally {
      setIsSendingTemplate(false);
    }
  };

  const handleSend = async () => {
    if (!selectedPhone || !draft.trim()) return;

    setIsSending(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/whatsapp/conversations/${encodeURIComponent(
          selectedPhone
        )}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: draft.trim() }),
        }
      );

      const data = await readJsonResponse<{ success: boolean; message?: string }>(
        response
      );

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Mesaj gönderilemedi.");
      }

      setDraft("");
      await fetchMessages(selectedPhone);
      await fetchConversations();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Mesaj gönderilemedi."
      );
    } finally {
      setIsSending(false);
    }
  };

  const selectedConversation = conversations.find(
    (conversation) => conversation.phone === selectedPhone
  );

  // Arama: işletme adı veya telefon (rakam-dışı karakterler yok sayılır) üzerinde eşleşme.
  const searchTerm = conversationQuery.trim().toLocaleLowerCase("tr-TR");
  const searchDigits = conversationQuery.replace(/\D+/g, "");
  const filteredConversations = searchTerm
    ? conversations.filter((conversation) => {
        const name = (conversation.businessName || "").toLocaleLowerCase("tr-TR");
        const nameHit = name.includes(searchTerm);
        const phoneDigits = (conversation.phone || "").replace(/\D+/g, "");
        const phoneHit = searchDigits
          ? phoneDigits.includes(searchDigits)
          : (conversation.phone || "")
              .toLocaleLowerCase("tr-TR")
              .includes(searchTerm);
        return nameHit || phoneHit;
      })
    : conversations;

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

          </div>

          <div className="mx-auto mt-8 max-w-3xl text-center">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Whats<span className="text-emerald-500">App</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
              API numarası üzerinden gelen/giden tüm konuşmaları buradan yönetin.
            </p>
          </div>
        </header>

        <div className="grid gap-0 overflow-hidden rounded-3xl bg-white lg:grid-cols-[18rem_minmax(0,1fr)_17rem] lg:h-[calc(100vh-16rem)]">
          {/* Sol: sohbet listesi */}
          <aside className="flex min-h-0 flex-col">
            <div className="px-4 py-3 text-sm font-semibold text-slate-700">
              Sohbetler ({searchTerm
                ? `${filteredConversations.length}/${conversations.length}`
                : conversations.length})
            </div>

            <div className="px-4 pb-3">
              <input
                type="search"
                value={conversationQuery}
                onChange={(event) => setConversationQuery(event.target.value)}
                placeholder="İşletme adı veya telefon ara..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="min-h-0 max-h-[24rem] flex-1 overflow-y-auto lg:max-h-none">
              {conversations.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">
                  Henüz konuşma yok. Gelen/giden mesajlar burada listelenir.
                </p>
              ) : filteredConversations.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">
                  Aramayla eşleşen sohbet yok.
                </p>
              ) : (
                filteredConversations.map((conversation) => {
                  const isActive = conversation.phone === selectedPhone;

                  return (
                    <button
                      key={conversation.contactKey}
                      type="button"
                      onClick={() => handleSelect(conversation.phone)}
                      className={`flex w-full items-start justify-between gap-2 px-4 py-3 text-left transition ${
                        isActive ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {conversation.businessName || conversation.phone}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {conversation.lastMessage?.direction === "outgoing"
                            ? "Siz: "
                            : ""}
                          {conversation.lastMessage?.text || "—"}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-400">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-semibold text-white">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Sağ: konuşma */}
          <section className="flex min-h-[28rem] flex-col">
            {!selectedPhone ? (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-400">
                Bir sohbet seçin.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {business?.name ||
                        selectedConversation?.businessName ||
                        "İşletme eşleştirilemedi"}
                    </p>
                    <p className="text-xs text-slate-400">{selectedPhone}</p>
                  </div>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-slate-400">
                      Mesaj yok.
                    </p>
                  ) : (
                    messages.map((message) => {
                      const isOutgoing = message.direction === "outgoing";
                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            isOutgoing ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                              isOutgoing
                                ? "bg-emerald-500 text-white"
                                : "bg-white text-slate-700"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {message.text}
                            </p>
                            <p
                              className={`mt-1 text-right text-[10px] ${
                                isOutgoing ? "text-emerald-50" : "text-slate-400"
                              }`}
                            >
                              {formatDateTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {!canSendFreeText && (
                  <div className="bg-amber-50 px-5 py-2 text-xs text-amber-700">
                    24 saatlik mesajlaşma penceresi kapalı. Serbest metin Meta
                    tarafından reddedilebilir; bu durumda onaylı template
                    gerekir.
                  </div>
                )}

                {errorMessage && (
                  <div className="bg-red-50 px-5 py-2 text-xs text-red-700">
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-2 p-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTemplate}
                      onChange={(event) =>
                        setSelectedTemplate(event.target.value)
                      }
                      className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="">Template Seçiniz</option>
                      {TEMPLATE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => void handleSendTemplate()}
                      disabled={isSendingTemplate || !selectedTemplate}
                      className="h-10 rounded-xl bg-blue-500 px-5 text-white hover:bg-blue-600 disabled:opacity-60"
                    >
                      {isSendingTemplate ? "..." : "Template Gönder"}
                    </Button>
                  </div>
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                      rows={1}
                      placeholder="Mesaj yazın... (Enter ile gönder)"
                      className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                    <Button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={isSending || !draft.trim()}
                      className="h-10 rounded-xl bg-emerald-500 px-5 text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {isSending ? "..." : "Gönder"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* En sağ: talep durumu + işletme detayları (ince panel) */}
          <aside className="flex flex-col">
            {!selectedPhone ? (
              <div className="flex flex-1 items-center justify-center p-4 text-xs text-slate-400">
                Detaylar
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Talep Durumu
                  </p>

                  <label className="mt-3 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Sonuç
                  </label>
                  <select
                    value={outcomeResult}
                    onChange={(event) => {
                      const value = event.target.value;
                      setOutcomeResult(value);
                      void handleSaveOutcome(value, meetingAt);
                    }}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  >
                    {RESULT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <label className="mt-3 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Görüşme Tarihi
                  </label>
                  <input
                    type="datetime-local"
                    value={meetingAt}
                    onChange={(event) => {
                      const value = event.target.value;
                      setMeetingAt(value);
                      void handleSaveOutcome(outcomeResult, value);
                    }}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />

                  <p className="mt-2 text-[11px] text-slate-400">
                    {outcomeSaved
                      ? "✓ Canlı desteğe işlendi"
                      : "Seçim canlı desteğe yansır"}
                  </p>
                </div>

                {business && (
                  <div className="space-y-1 pt-3 text-xs text-slate-500">
                    <p className="font-semibold text-slate-600">İşletme</p>
                    <p>Kaynak: {formatSource(business.source)}</p>
                    {business.category && <p>Kategori: {business.category}</p>}
                    {(business.city || business.district) && (
                      <p>
                        {business.district ? `${business.district} ` : ""}
                        {business.city || ""}
                      </p>
                    )}
                    {business.address && (
                      <p className="leading-5">{business.address}</p>
                    )}
                    {business.website && (
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block break-all text-emerald-600 hover:text-emerald-700"
                      >
                        {business.website}
                      </a>
                    )}

                    {/* WP notu: Görüşülen/Kayıt Alınan tablosundaki WP sütununa işlenir. */}
                    <div className="pt-3">
                      <p className="font-semibold text-slate-600">WP Notu</p>
                      <textarea
                        value={wpNote}
                        onChange={(event) => setWpNote(event.target.value)}
                        placeholder="Bu firmaya not bırak..."
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                      />
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-600">
                          {wpSaved ? "✓ Not eklendi" : ""}
                        </span>
                        <Button
                          type="button"
                          onClick={handleAddWpNote}
                          disabled={wpSaving || !wpNote.trim()}
                          className="h-7 rounded-lg bg-emerald-500 px-3 text-xs text-white hover:bg-emerald-600"
                        >
                          {wpSaving ? "..." : "Not Ekle"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
