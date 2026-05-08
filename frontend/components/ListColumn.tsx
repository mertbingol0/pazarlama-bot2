"use client";

import { useMemo, useState } from "react";
import type { Business, LeadItem, LeadStatus } from "@/types/business";
import {
  getLeadKey,
  saveLeadStatus,
  type StoredLeadType,
} from "@/lib/lead-status-storage";
import { updateBusinessStatus } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ListColumnProps = {
  title: string;
  items: LeadItem[];
  type: StoredLeadType;
  businesses?: Business[];
};

type DisplayLeadItem = LeadItem & {
  noPhone?: boolean;
  website?: string;
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

function formatSource(source: string) {
  if (source === "google_places") return "Google Places";
  if (source === "google_maps") return "Google Maps";
  if (source === "website_scrape") return "Website";
  if (source === "backend") return "Backend";

  return source;
}

function normalizeExternalUrl(url?: string) {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://${url}`;
}

function normalizeText(value?: string) {
  return (value || "").trim().toLocaleLowerCase("tr-TR");
}

export function ListColumn({
  title,
  items,
  type,
  businesses = [],
}: ListColumnProps) {
  const [localStatuses, setLocalStatuses] = useState<Record<string, LeadStatus>>(
    {}
  );
  const [showWithoutPhones, setShowWithoutPhones] = useState(false);
  const [updatingItemKey, setUpdatingItemKey] = useState<string | null>(null);

  const missingPhoneItems = useMemo<DisplayLeadItem[]>(() => {
    if (type !== "phone") return [];

    return businesses
      .filter((business) => !business.phone || !business.phone.trim())
      .map((business) => ({
        id: business.id,
        businessId: business.id,
        value: "Telefon bulunamadı",
        businessName: business.name,
        source: "google_places",
        url: business.googleMapsUrl,
        address: business.address,
        noPhone: true,
        website: business.website,
        status: business.status || "pending",
      }));
  }, [businesses, type]);

  const displayItems: DisplayLeadItem[] =
    type === "phone" && showWithoutPhones
      ? [...items, ...missingPhoneItems]
      : items;

  const getHref = (value: string, url?: string) => {
    if (type === "phone") {
      return `https://wa.me/${value.replace(/\D/g, "")}`;
    }

    if (type === "email") {
      return `mailto:${value}`;
    }

    return url || `https://instagram.com/${value.replace("@", "")}`;
  };

  const getActionText = () => {
    if (type === "phone") return "WhatsApp";
    if (type === "email") return "Mail Gönder";
    return "Profili Aç";
  };

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    alert("Kopyalandı");
  };

  const handleStatusChange = async (
    item: DisplayLeadItem,
    itemKey: string,
    currentStatus: LeadStatus,
    nextStatus: LeadStatus
  ) => {
    if (currentStatus === nextStatus) return;

    const businessId = item.businessId || item.id;

    setUpdatingItemKey(itemKey);

    setLocalStatuses((prev) => ({
      ...prev,
      [itemKey]: nextStatus,
    }));

    try {
      if (!businessId) {
        saveLeadStatus(item, type, nextStatus);
        console.warn("Business ID bulunamadı, sadece localStorage güncellendi.");
        return;
      }

      await updateBusinessStatus(businessId, nextStatus);

      saveLeadStatus(item, type, nextStatus);

      console.log("Backend status güncellendi:", businessId, nextStatus);
    } catch (error) {
      console.error("Backend status güncelleme hatası:", error);

      setLocalStatuses((prev) => ({
        ...prev,
        [itemKey]: currentStatus,
      }));

      alert("Durum güncellenemedi. Backend bağlantısını veya endpoint'i kontrol edin.");
    } finally {
      setUpdatingItemKey(null);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base font-semibold text-slate-800">
          {title}
        </CardTitle>

        <div className="flex items-center gap-2">
          {type === "phone" && missingPhoneItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowWithoutPhones((prev) => !prev)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              {showWithoutPhones
                ? "Telefonsuzları gizle"
                : `Telefonsuzları göster (${missingPhoneItems.length})`}
            </button>
          )}

          <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
            {displayItems.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {displayItems.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Sonuç bulunamadı.
          </p>
        ) : (
          <div className="space-y-4">
            {displayItems.map((item) => {
              const itemKey = getLeadKey(item);
              const currentStatus =
                localStatuses[itemKey] || item.status || "pending";

              const isNoPhoneItem = item.noPhone === true;

              const relatedBusiness = businesses.find((business) => {
                const itemId = item.businessId || item.id;
                const businessId = business.id;

                if (itemId && businessId && String(itemId) === String(businessId)) {
                  return true;
                }

                return (
                  normalizeText(business.name) ===
                  normalizeText(item.businessName)
                );
              });

              const websiteUrl = normalizeExternalUrl(
                item.website || relatedBusiness?.website
              );

              const isUpdating = updatingItemKey === itemKey;

              return (
                <div
                  key={itemKey}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-100 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`break-all font-semibold ${
                          isNoPhoneItem ? "text-slate-400" : "text-slate-900"
                        }`}
                      >
                        {item.value}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {item.businessName}
                      </p>

                      {item.address && (
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                          {item.address}
                        </p>
                      )}
                    </div>

                    <select
                      value={currentStatus}
                      disabled={isUpdating}
                      onChange={(event) =>
                        void handleStatusChange(
                          item,
                          itemKey,
                          currentStatus,
                          event.target.value as LeadStatus
                        )
                      }
                      className={`h-8 min-w-[135px] rounded-xl border px-3 pr-7 text-xs font-medium shadow-sm outline-none transition focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 ${getStatusClassName(
                        currentStatus
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

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      Kaynak: {formatSource(item.source)}
                    </Badge>

                    {isNoPhoneItem && (
                      <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                        Telefon kaydı yok
                      </Badge>
                    )}

                    {isUpdating && (
                      <Badge className="rounded-full bg-slate-50 text-slate-500 hover:bg-slate-50">
                        Güncelleniyor...
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isNoPhoneItem && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(item.value)}
                        >
                          Kopyala
                        </Button>

                        <Button
                          size="sm"
                          asChild
                          className="bg-emerald-500 text-white hover:bg-emerald-600"
                        >
                          <a
                            href={getHref(item.value, item.url)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {getActionText()}
                          </a>
                        </Button>
                      </>
                    )}

                    {item.url && (
                      <Button variant="secondary" size="sm" asChild>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          Google Maps
                        </a>
                      </Button>
                    )}

                    {websiteUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={websiteUrl} target="_blank" rel="noreferrer">
                          Web Sitesi
                        </a>
                      </Button>
                    )}

                    {item.address && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(item.address || "")}
                      >
                        Adres Kopyala
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}