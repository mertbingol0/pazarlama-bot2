"use client";

import { useEffect, useState } from "react";
import type { LeadStatus } from "@/types/business";
import {
  getStoredLeadsByStatus,
  saveLeadStatus,
  type StoredLeadItem,
} from "@/lib/lead-status-storage";

import { PageNavigation } from "@/components/PageNavigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type StoredLeadsPageProps = {
  status: "approved" | "rejected";
  title: string;
  description: string;
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

export function StoredLeadsPage({
  status,
  title,
  description,
}: StoredLeadsPageProps) {
  const [leads, setLeads] = useState<StoredLeadItem[]>([]);

  const refreshLeads = () => {
    setLeads(getStoredLeadsByStatus(status));
  };

  useEffect(() => {
    refreshLeads();
  }, [status]);

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    alert("Kopyalandı");
  };

  const handleStatusChange = (lead: StoredLeadItem, nextStatus: LeadStatus) => {
    saveLeadStatus(lead, lead.type, nextStatus);
    refreshLeads();
  };

  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
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

          <div className="mx-auto mt-14 max-w-4xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              {title}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500 md:text-lg">
              {description}
            </p>
          </div>
        </header>

        {leads.length === 0 ? (
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
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {leads.map((lead) => {
              const isNoPhoneLead =
                lead.type === "phone" &&
                (!lead.value || lead.value === "Telefon bulunamadı");

              return (
                <Card
                  key={`${lead.businessName}-${lead.value}-${lead.updatedAt}`}
                  className="rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-100 hover:shadow-md"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`break-all font-semibold ${
                            isNoPhoneLead ? "text-slate-400" : "text-slate-900"
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
                          handleStatusChange(
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
                          <a href={lead.url} target="_blank" rel="noreferrer">
                            Google Maps
                          </a>
                        </Button>
                      )}

                      {lead.website && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Website
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
        )}
      </div>
    </main>
  );
}