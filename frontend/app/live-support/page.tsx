"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { API_BASE_URL, readJsonResponse } from "@/lib/api";
import { PageNavigation } from "@/components/PageNavigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type LiveSupportLead = {
  id: string | number;
  phone: string;
  buttonText?: string;
  status?: "info_requested" | "called" | "pending";
  createdAt?: string;
  updatedAt?: string;
  seenAt?: string | null;
  note?: string;
};

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

function getStatusLabel(status?: LiveSupportLead["status"]) {
  if (status === "called") return "Arandı";
  if (status === "info_requested") return "Bilgi istiyor";
  if (status === "pending") return "Beklemede";

  return "Bilgi istiyor";
}

function getStatusClassName(status?: LiveSupportLead["status"]) {
  if (status === "called") {
    return "bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "info_requested") {
    return "bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  return "bg-blue-50 text-blue-700 hover:bg-blue-50";
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
              Template mesajında “Bilgi almak istiyorum” butonuna tıklayan
              telefon numaraları burada listelenir.
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="rounded-3xl border border-emerald-100/80 bg-white shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">Toplam Talep</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {leads.length}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-emerald-100/80 bg-white shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">Yeni / Görülmemiş</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {newLeadIds.size}
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Bilgi Almak İsteyen Telefon Numaraları
              </CardTitle>

              <p className="mt-1 text-sm text-slate-500">
                Pazarlama ekibi bu numaralarla daha sonra WhatsApp Business veya
                telefon üzerinden iletişime geçebilir.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearLiveSupportLeads}
                disabled={isLoading || leads.length === 0}
                className="h-9 rounded-xl border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Temizle
              </Button>

              <Badge className="w-fit rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                {leads.length} kayıt
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading && (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Canlı destek talepleri yükleniyor...
              </p>
            )}

            {!isLoading && successMessage && (
              <p className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                {successMessage}
              </p>
            )}

            {!isLoading && errorMessage && (
              <p className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            {!isLoading && leads.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Henüz canlı destek talebi bulunamadı.
                </p>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Backend webhook bağlantısı tamamlandığında, “Bilgi almak
                  istiyorum” butonuna tıklayan numaralar burada otomatik
                  listelenecek.
                </p>
              </div>
            )}

            {!isLoading && leads.length > 0 && (
              <div className="space-y-4">
                {leads.map((lead) => {
                  const leadId = String(lead.id);
                  const normalizedPhone = normalizeWhatsAppPhone(lead.phone);
                  const isNewLead = newLeadIds.has(leadId);

                  return (
                    <div
                      key={leadId}
                      className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${
                        isNewLead
                          ? "border-amber-300 bg-amber-50/60 shadow-amber-100"
                          : "border-slate-200 bg-white hover:border-emerald-100"
                      }`}
                    >
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_220px]">
                        <div>
                          <p className="text-xs font-medium text-slate-400">
                            Telefon Numarası
                          </p>

                          <p className="mt-1 break-all text-lg font-semibold text-slate-900">
                            {lead.phone}
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            Tıklanan buton:{" "}
                            <span className="font-medium text-slate-600">
                              {lead.buttonText || "Bilgi almak istiyorum"}
                            </span>
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Tarih: {formatDate(lead.createdAt)}
                          </p>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-medium text-slate-400">
                            Durum
                          </p>

                          <Badge
                            className={`rounded-full ${getStatusClassName(
                              lead.status
                            )}`}
                          >
                            {getStatusLabel(lead.status)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyPhone(lead.phone)}
                          >
                            Telefonu Kopyala
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
                              WhatsApp’ta Aç
                            </a>
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <label className="text-xs font-medium text-slate-400">
                          Not
                        </label>

                        <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_140px]">
                          <textarea
                            value={notes[leadId] || ""}
                            onChange={(event) =>
                              handleNoteChange(lead.id, event.target.value)
                            }
                            rows={2}
                            placeholder="Bu numara için not ekle..."
                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                          />

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleSaveNote(lead.id)}
                            disabled={savingLeadId === lead.id}
                            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {savingLeadId === lead.id
                              ? "Kaydediliyor..."
                              : "Notu Kaydet"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
