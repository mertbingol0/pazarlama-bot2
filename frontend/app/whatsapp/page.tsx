"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { API_BASE_URL, readJsonResponse } from "@/lib/api";
import { PageNavigation } from "@/components/PageNavigation";
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
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [canSendFreeText, setCanSendFreeText] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
      }>(response);

      if (response.ok && data.success) {
        setMessages(data.messages || []);
        setCanSendFreeText(Boolean(data.canSendFreeText));
      }
    } catch (error) {
      console.warn("Mesajlar alınamadı:", error);
    }
  }, []);

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

  // Yeni mesaj gelince en alta kaydır.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelect = (phone: string) => {
    setSelectedPhone(phone);
    setErrorMessage("");
    // Okundu işaretlenince listedeki rozet güncellensin.
    setConversations((current) =>
      current.map((conversation) =>
        conversation.phone === phone
          ? { ...conversation, unreadCount: 0 }
          : conversation
      )
    );
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
              Whats<span className="text-emerald-500">App</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
              API numarası üzerinden gelen/giden tüm konuşmaları buradan yönetin.
            </p>
          </div>
        </header>

        <div className="grid gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[20rem_minmax(0,1fr)] lg:h-[calc(100vh-16rem)]">
          {/* Sol: sohbet listesi */}
          <aside className="flex flex-col border-b border-slate-100 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              Sohbetler ({conversations.length})
            </div>

            <div className="max-h-[24rem] flex-1 overflow-y-auto lg:max-h-none">
              {conversations.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">
                  Henüz konuşma yok. Gelen/giden mesajlar burada listelenir.
                </p>
              ) : (
                conversations.map((conversation) => {
                  const isActive = conversation.phone === selectedPhone;

                  return (
                    <button
                      key={conversation.contactKey}
                      type="button"
                      onClick={() => handleSelect(conversation.phone)}
                      className={`flex w-full items-start justify-between gap-2 border-b border-slate-50 px-4 py-3 text-left transition ${
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
                <div className="border-b border-slate-100 px-5 py-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedConversation?.businessName || selectedPhone}
                  </p>
                  <p className="text-xs text-slate-400">{selectedPhone}</p>
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
                            className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                              isOutgoing
                                ? "bg-emerald-500 text-white"
                                : "border border-slate-200 bg-white text-slate-700"
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
                  <div ref={messagesEndRef} />
                </div>

                {!canSendFreeText && (
                  <div className="border-t border-amber-100 bg-amber-50 px-5 py-2 text-xs text-amber-700">
                    24 saatlik mesajlaşma penceresi kapalı. Serbest metin Meta
                    tarafından reddedilebilir; bu durumda onaylı template
                    gerekir.
                  </div>
                )}

                {errorMessage && (
                  <div className="border-t border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">
                    {errorMessage}
                  </div>
                )}

                <div className="flex items-end gap-2 border-t border-slate-100 p-3">
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
                    className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
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
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
