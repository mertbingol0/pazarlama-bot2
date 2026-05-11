"use client";

import { useEffect, useState } from "react";
import type { LeadStatus } from "@/types/business";
import {
  clearStoredLeadsByStatus,
  getStoredLeadsByStatus,
  saveLeadStatus,
  type StoredLeadItem,
} from "@/lib/lead-status-storage";

import { API_BASE_URL, getBusinessesByStatus } from "@/lib/api";

import { PageNavigation } from "@/components/PageNavigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type StoredLeadsPageProps = {
  status: "approved" | "rejected";
  title: string;
  description: string;
};

type BackendBusiness = {
  id?: string | number;
  name?: string;
  phone?: string;
  address?: string;
  website?: string;
  googleMapsUrl?: string;
  rating?: number | null;
  userRatingCount?: number | null;
  source?: string;
  status?: LeadStatus;
  updatedAt?: string;
};

type StatusUpdateResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

function getStatusClassName(status: LeadStatus) {
  if (status === "approved") {
    return "border-emerald-100 bg-emerald-50/80 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-red-100 bg-red-50/80 text-red-700";
  }

  return "border-orange-100 bg-orange-50/80 text-orange-700";
}

function formatSource(source?: string) {
  if (source === "google_places") return "Google Places";
  if (source === "google_maps") return "Google Maps";
  if (source === "website_scrape") return "Website";
  if (source === "backend") return "Backend";

  return source || "Bilinmiyor";
}

function getActionHref(lead: StoredLeadItem) {
  if (lead.type === "phone") {
    return `https://wa.me/${lead.value.replace(/\D/g, "")}`;
  }

  if (lead.type === "email") {
    return `mailto:${lead.value}`;
  }

  return lead.url || `https://instagram.com/${lead.value.replace("@", "")}`;
}

function getActionText(lead: StoredLeadItem) {
  if (lead.type === "phone") return "WhatsApp";
  if (lead.type === "email") return "Mail Gönder";
  return "Profili Aç";
}

function getTypeLabel(type: StoredLeadItem["type"]) {
  if (type === "phone") return "Telefon";
  if (type === "email") return "E-posta";
  return "Instagram";
}

function escapeCsvValue(value?: string | number | null) {
  const safeValue = String(value ?? "");
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function normalizeExternalUrl(url?: string) {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://${url}`;
}

function downloadStoredLeadsAsCsv(
  leads: StoredLeadItem[],
  status: "approved" | "rejected"
) {
  const headers = [
    "Durum",
    "Tip",
    "Deger",
    "Isletme Adi",
    "Adres",
    "Kaynak",
    "Google Maps",
    "Website",
    "Guncellenme Tarihi",
  ];

  const rows = leads.map((lead) => [
    status === "approved" ? "Onaylanan" : "Reddedilen",
    getTypeLabel(lead.type),
    lead.value || "Telefon bulunamadı",
    lead.businessName,
    lead.address || "",
    formatSource(lead.source),
    lead.url || "",
    lead.website || "",
    lead.updatedAt || "",
  ]);

  const csvContent =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(";"))
      .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    status === "approved"
      ? "onaylanan-firmalar.csv"
      : "reddedilen-firmalar.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function mapBusinessToStoredLead(
  business: BackendBusiness,
  currentStatus: "approved" | "rejected"
): StoredLeadItem {
  return {
    id: business.id,
    businessId: business.id,
    type: "phone",
    value: business.phone || "Telefon bulunamadı",
    businessName: business.name || "İsimsiz İşletme",
    address: business.address,
    source: business.source || "google_places",
    url: business.googleMapsUrl,
    website: business.website,
    status: business.status || currentStatus,
    updatedAt: business.updatedAt || new Date().toISOString(),
  };
}

async function updateBackendBusinessStatus(
  businessId: string | number,
  nextStatus: LeadStatus
) {
  const response = await fetch(`${API_BASE_URL}/api/businesses/${businessId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: nextStatus,
    }),
  });

  let data: StatusUpdateResponse = {};

  try {
    data = await response.json();
  } catch {
    throw new Error("Backend JSON cevabı döndürmedi.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || data.error || "Firma durumu güncellenirken hata oluştu."
    );
  }

  return data;
}

export function StoredLeadsPage({
  status,
  title,
  description,
}: StoredLeadsPageProps) {
  const [leads, setLeads] = useState<StoredLeadItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [usesBackend, setUsesBackend] = useState(true);

  const refreshLeads = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = await getBusinessesByStatus(status);

      const backendLeads: StoredLeadItem[] = (data.businesses || []).map(
        (business: BackendBusiness) => mapBusinessToStoredLead(business, status)
      );

      setUsesBackend(true);
      setLeads(backendLeads);
    } catch (error) {
      console.error("Backend kayıtları alınamadı, localStorage kullanılıyor:", error);

      setUsesBackend(false);
      setLeads(getStoredLeadsByStatus(status));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshLeads();
  }, [status]);

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    alert("Kopyalandı");
  };

  const handleStatusChange = async (
    lead: StoredLeadItem,
    nextStatus: LeadStatus
  ) => {
    try {
      setErrorMessage("");

      if (usesBackend && lead.businessId) {
        await updateBackendBusinessStatus(lead.businessId, nextStatus);
      } else {
        saveLeadStatus(lead, lead.type, nextStatus);
      }

      if (nextStatus === status) {
        setLeads((currentLeads) =>
          currentLeads.map((currentLead) =>
            currentLead.businessId === lead.businessId &&
            currentLead.value === lead.value
              ? { ...currentLead, status: nextStatus }
              : currentLead
          )
        );
        return;
      }

      setLeads((currentLeads) =>
        currentLeads.filter((currentLead) => {
          if (lead.businessId && currentLead.businessId) {
            return String(currentLead.businessId) !== String(lead.businessId);
          }

          return !(
            currentLead.businessName === lead.businessName &&
            currentLead.value === lead.value
          );
        })
      );
    } catch (error) {
      console.error("Status update error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Firma durumu güncellenirken hata oluştu."
      );

      await refreshLeads();
    }
  };

  const handleClearLeads = async () => {
    const message =
      status === "approved"
        ? "Onaylanan firmalar listesini temizlemek istediğine emin misin?"
        : "Reddedilen firmalar listesini temizlemek istediğine emin misin?";

    const isConfirmed = window.confirm(message);

    if (!isConfirmed) {
      return;
    }

    try {
      setIsClearing(true);
      setErrorMessage("");

      if (usesBackend) {
        const leadsWithIds = leads.filter((lead) => lead.businessId);

        await Promise.all(
          leadsWithIds.map((lead) =>
            updateBackendBusinessStatus(lead.businessId as string | number, "pending")
          )
        );
      } else {
        clearStoredLeadsByStatus(status);
      }

      setLeads([]);
    } catch (error) {
      console.error("Clear leads error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Liste temizlenirken hata oluştu."
      );

      await refreshLeads();
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-semibold tracking-tight text-slate-700">
              Jefedes<span className="text-emerald-500">.</span>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="rounded-full border border-emerald-100 bg-white px-4 py-1.5 text-slate-600 shadow-sm"
              >
                {leads.length} kayıt
              </Badge>

              <PageNavigation />
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-3xl text-center">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              {title}
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
              {description}
            </p>
          </div>
        </header>

        {errorMessage && (
          <Card className="mb-6 rounded-3xl border border-red-100 bg-red-50 shadow-sm">
            <CardContent className="p-5 text-sm text-red-700">
              {errorMessage}
            </CardContent>
          </Card>
        )}

        {leads.length > 0 && (
          <div className="mb-6 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClearLeads}
              disabled={isClearing}
              className="rounded-full border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {isClearing ? "Temizleniyor..." : "Temizle"}
            </Button>
          </div>
        )}

        {isLoading ? (
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-10 text-center">
              <p className="text-xl font-semibold text-slate-900">
                Kayıtlar yükleniyor...
              </p>
            </CardContent>
          </Card>
        ) : leads.length === 0 ? (
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-10 text-center">
              <p className="text-xl font-semibold text-slate-900">
                Henüz kayıt yok
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Ana sayfada bir firmayı onaylanan veya reddedilen durumuna
                aldığında burada görünecek.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {leads.map((lead) => {
                const isNoPhoneLead =
                  lead.type === "phone" &&
                  (!lead.value || lead.value === "Telefon bulunamadı");

                const websiteUrl = normalizeExternalUrl(lead.website);

                return (
                  <Card
                    key={`${lead.businessId || lead.businessName}-${lead.value}`}
                    className="rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-100 hover:shadow-md"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`break-all font-semibold ${
                              isNoPhoneLead
                                ? "text-slate-400"
                                : "text-slate-900"
                            }`}
                          >
                            {lead.value || "Telefon bulunamadı"}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {lead.businessName}
                          </p>

                          {lead.address && (
                            <p className="mt-2 text-xs leading-5 text-slate-400">
                              {lead.address}
                            </p>
                          )}
                        </div>

                        <select
                          value={lead.status}
                          onChange={(event) =>
                            void handleStatusChange(
                              lead,
                              event.target.value as LeadStatus
                            )
                          }
                          className={`h-8 min-w-[135px] rounded-xl border px-3 pr-7 text-xs font-medium shadow-sm outline-none transition focus:ring-2 focus:ring-emerald-100 ${getStatusClassName(
                            lead.status
                          )}`}
                        >
                          <option
                            className="bg-white text-slate-700"
                            value="approved"
                          >
                            Onaylanan
                          </option>

                          <option
                            className="bg-white text-slate-700"
                            value="pending"
                          >
                            Bekleyen
                          </option>

                          <option
                            className="bg-white text-slate-700"
                            value="rejected"
                          >
                            Reddedilen
                          </option>
                        </select>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full">
                          {getTypeLabel(lead.type)}
                        </Badge>

                        <Badge variant="outline" className="rounded-full">
                          Kaynak: {formatSource(lead.source)}
                        </Badge>

                        {isNoPhoneLead && (
                          <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                            Telefon kaydı yok
                          </Badge>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {!isNoPhoneLead && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(lead.value)}
                            >
                              Kopyala
                            </Button>

                            <Button
                              size="sm"
                              asChild
                              className="bg-emerald-500 text-white hover:bg-emerald-600"
                            >
                              <a
                                href={getActionHref(lead)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {getActionText(lead)}
                              </a>
                            </Button>
                          </>
                        )}

                        {lead.url && (
                          <Button variant="secondary" size="sm" asChild>
                            <a
                              href={lead.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Google Maps
                            </a>
                          </Button>
                        )}

                        {websiteUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={websiteUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Web Sitesi
                            </a>
                          </Button>
                        )}

                        {lead.address && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(lead.address || "")}
                          >
                            Adres Kopyala
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            <section className="mt-6 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadStoredLeadsAsCsv(leads, status)}
                className="rounded-xl border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              >
                {status === "approved"
                  ? "Onaylananları CSV İndir"
                  : "Reddedilenleri CSV İndir"}
              </Button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}