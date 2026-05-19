"use client";

import { useMemo, useState } from "react";
import type {
  Business,
  LeadItem,
  LeadStatus,
  WhatsAppStatus,
  WhatsAppStatusFilter,
} from "@/types/business";
import {
  getLeadKey,
  saveLeadStatus,
  type StoredLeadType,
} from "@/lib/lead-status-storage";
import {
  updateBusinessStatus,
  updateBusinessWhatsAppStatus,
} from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ListColumnProps = {
  title: string;
  items: LeadItem[];
  type: StoredLeadType;
  businesses?: Business[];
  onCsvDownload?: () => void;

  selectedBusinessIds?: Array<string | number>;
  onToggleBusinessSelection?: (businessId: string | number) => void;
  onSetSelectedBusinessIds?: (businessIds: Array<string | number>) => void;
};

type DisplayLeadItem = LeadItem & {
  noPhone?: boolean;
  website?: string;
  whatsappStatus?: WhatsAppStatus;
};

const whatsappStatusFilters: {
  label: string;
  value: WhatsAppStatusFilter;
}[] = [
  {
    label: "Tümü",
    value: "all",
  },
  {
    label: "Gönderilmedi",
    value: "not_sent",
  },
  {
    label: "Template gönderilenler",
    value: "template_sent",
  },
  {
    label: "Cevap bekleyenler",
    value: "waiting_reply",
  },
  {
    label: "Cevap verenler",
    value: "replied",
  },
  {
    label: "İlgilenmiyor",
    value: "not_interested",
  },
];

function getStatusClassName(status: LeadStatus) {
  if (status === "approved") {
    return "border-emerald-100 bg-emerald-50/80 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-red-100 bg-red-50/80 text-red-700";
  }

  return "border-orange-100 bg-orange-50/80 text-orange-700";
}

function getWhatsAppStatusClassName(status: WhatsAppStatus) {
  if (status === "template_sent") {
    return "border-blue-100 bg-blue-50/80 text-blue-700";
  }

  if (status === "waiting_reply") {
    return "border-amber-100 bg-amber-50/80 text-amber-700";
  }

  if (status === "replied") {
    return "border-emerald-100 bg-emerald-50/80 text-emerald-700";
  }

  if (status === "not_interested") {
    return "border-red-100 bg-red-50/80 text-red-700";
  }

  return "border-slate-100 bg-slate-50 text-slate-500";
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

function canSelectForTemplate(status: WhatsAppStatus, noPhone?: boolean) {
  return !noPhone && status === "not_sent";
}

function isSelectedBusiness(
  selectedBusinessIds: Array<string | number>,
  businessId?: string | number
) {
  if (businessId === undefined) return false;

  return selectedBusinessIds.some(
    (selectedId) => String(selectedId) === String(businessId)
  );
}

function uniqueBusinessIds(ids: Array<string | number>) {
  const uniqueIds = new Map<string, string | number>();

  ids.forEach((id) => {
    uniqueIds.set(String(id), id);
  });

  return Array.from(uniqueIds.values());
}

export function ListColumn({
  title,
  items,
  type,
  businesses = [],
  onCsvDownload,
  selectedBusinessIds = [],
  onToggleBusinessSelection,
  onSetSelectedBusinessIds,
}: ListColumnProps) {
  const [localStatuses, setLocalStatuses] = useState<Record<string, LeadStatus>>(
    {}
  );

  const [localWhatsAppStatuses, setLocalWhatsAppStatuses] = useState<
    Record<string, WhatsAppStatus>
  >({});

  const [showWithoutPhones, setShowWithoutPhones] = useState(false);
  const [updatingItemKey, setUpdatingItemKey] = useState<string | null>(null);

  const [updatingWhatsAppItemKey, setUpdatingWhatsAppItemKey] = useState<
    string | null
  >(null);

  const [whatsappStatusFilter, setWhatsappStatusFilter] =
    useState<WhatsAppStatusFilter>("all");

  const [isWhatsappFilterOpen, setIsWhatsappFilterOpen] = useState(false);

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
        whatsappStatus: business.whatsappStatus || "not_sent",
      }));
  }, [businesses, type]);

  const allDisplayItems: DisplayLeadItem[] =
    type === "phone" && showWithoutPhones
      ? [...items, ...missingPhoneItems]
      : items;

  const getRelatedBusiness = (item: DisplayLeadItem) => {
    return businesses.find((business) => {
      const itemId = item.businessId || item.id;
      const businessId = business.id;

      if (itemId && businessId && String(itemId) === String(businessId)) {
        return true;
      }

      return normalizeText(business.name) === normalizeText(item.businessName);
    });
  };

  const getItemBusinessId = (item: DisplayLeadItem) => {
    const relatedBusiness = getRelatedBusiness(item);

    return item.businessId || item.id || relatedBusiness?.id;
  };

  const getCurrentWhatsAppStatus = (item: DisplayLeadItem) => {
    const relatedBusiness = getRelatedBusiness(item);
    const itemKey = getLeadKey(item);

    return (
      localWhatsAppStatuses[itemKey] ||
      item.whatsappStatus ||
      relatedBusiness?.whatsappStatus ||
      "not_sent"
    );
  };

  const displayItems = allDisplayItems.filter((item) => {
    if (whatsappStatusFilter === "all") {
      return true;
    }

    return getCurrentWhatsAppStatus(item) === whatsappStatusFilter;
  });

  const selectableBusinessIds = uniqueBusinessIds(
    displayItems
      .filter((item) =>
        canSelectForTemplate(getCurrentWhatsAppStatus(item), item.noPhone)
      )
      .map((item) => getItemBusinessId(item))
      .filter((id): id is string | number => id !== undefined && id !== null)
  );

  const allSelectableItemsSelected =
    selectableBusinessIds.length > 0 &&
    selectableBusinessIds.every((businessId) =>
      isSelectedBusiness(selectedBusinessIds, businessId)
    );

  const handleSelectAllEligible = () => {
    if (!onSetSelectedBusinessIds) return;

    if (allSelectableItemsSelected) {
      onSetSelectedBusinessIds(
        selectedBusinessIds.filter(
          (selectedId) =>
            !selectableBusinessIds.some(
              (businessId) => String(businessId) === String(selectedId)
            )
        )
      );
      return;
    }

    onSetSelectedBusinessIds(
      uniqueBusinessIds([...selectedBusinessIds, ...selectableBusinessIds])
    );
  };

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

      alert(
        "Durum güncellenemedi. Backend bağlantısını veya endpoint'i kontrol edin."
      );
    } finally {
      setUpdatingItemKey(null);
    }
  };

  const handleWhatsAppStatusChange = async (
    item: DisplayLeadItem,
    itemKey: string,
    currentWhatsAppStatus: WhatsAppStatus,
    nextWhatsAppStatus: WhatsAppStatus
  ) => {
    if (currentWhatsAppStatus === nextWhatsAppStatus) return;

    const businessId = item.businessId || item.id;

    if (!businessId) {
      alert("Business ID bulunamadı. WhatsApp durumu güncellenemedi.");
      return;
    }

    setUpdatingWhatsAppItemKey(itemKey);

    setLocalWhatsAppStatuses((prev) => ({
      ...prev,
      [itemKey]: nextWhatsAppStatus,
    }));

    try {
      await updateBusinessWhatsAppStatus(businessId, nextWhatsAppStatus);

      console.log(
        "Backend WhatsApp status güncellendi:",
        businessId,
        nextWhatsAppStatus
      );
    } catch (error) {
      console.error("WhatsApp status güncelleme hatası:", error);

      setLocalWhatsAppStatuses((prev) => ({
        ...prev,
        [itemKey]: currentWhatsAppStatus,
      }));

      alert(
        "WhatsApp durumu güncellenemedi. Backend bağlantısını veya endpoint'i kontrol edin."
      );
    } finally {
      setUpdatingWhatsAppItemKey(null);
    }
  };

  return (
    <Card className="overflow-visible rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-4 overflow-visible">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-800">
              {title}
            </CardTitle>

            {type === "phone" && (
              <p className="mt-1 text-xs text-slate-400">
                Template göndermek için uygun firmaları seçebilirsiniz.
              </p>
            )}

            {type === "phone" && onCsvDownload && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCsvDownload}
                className="mt-4"
              >
                CSV İndir
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {type === "phone" && onSetSelectedBusinessIds && (
              <button
                type="button"
                onClick={handleSelectAllEligible}
                disabled={selectableBusinessIds.length === 0}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allSelectableItemsSelected ? "Seçimleri kaldır" : "Tümünü seç"}
              </button>
            )}

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
        </div>

        {type === "phone" && (
          <div className="relative flex justify-end">
            <button
              type="button"
              onClick={() => setIsWhatsappFilterOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <span>WhatsApp durumuna göre filtrele</span>

              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="text-slate-500"
              >
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {isWhatsappFilterOpen && (
              <div className="absolute right-0 top-8 z-50 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70">
                {whatsappStatusFilters.map((filter) => {
                  const isActive = whatsappStatusFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => {
                        setWhatsappStatusFilter(filter.value);
                        setIsWhatsappFilterOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span>{filter.label}</span>

                      {isActive && <span className="text-emerald-600">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="overflow-visible">
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
              const relatedBusiness = getRelatedBusiness(item);

              const businessId =
                item.businessId || item.id || relatedBusiness?.id;

              const websiteUrl = normalizeExternalUrl(
                item.website || relatedBusiness?.website
              );

              const currentWhatsAppStatus =
                localWhatsAppStatuses[itemKey] ||
                item.whatsappStatus ||
                relatedBusiness?.whatsappStatus ||
                "not_sent";

              const isUpdating = updatingItemKey === itemKey;
              const isWhatsAppUpdating = updatingWhatsAppItemKey === itemKey;

              const canSelect =
                type === "phone" &&
                businessId !== undefined &&
                canSelectForTemplate(currentWhatsAppStatus, isNoPhoneItem);

              const isSelected = isSelectedBusiness(
                selectedBusinessIds,
                businessId
              );

              return (
                <div
                  key={itemKey}
                  className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${
                    isSelected
                      ? "border-emerald-300 bg-emerald-50/40"
                      : "border-slate-200 bg-white hover:border-emerald-100"
                  }`}
                >
                  <div className="grid gap-4 xl:grid-cols-[32px_minmax(0,1fr)_160px_180px]">
                    {type === "phone" && (
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={() => {
                            if (businessId !== undefined) {
                              onToggleBusinessSelection?.(businessId);
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`${item.businessName} seç`}
                        />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="break-words text-base font-semibold text-slate-900">
                        {item.businessName}
                      </p>

                      <p
                        className={`mt-1 break-all text-sm font-semibold ${
                          isNoPhoneItem ? "text-slate-400" : "text-slate-800"
                        }`}
                      >
                        {item.value}
                      </p>

                      {item.address && (
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                          {item.address}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full">
                          Kaynak: {formatSource(item.source)}
                        </Badge>

                        {isNoPhoneItem && (
                          <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                            Telefon kaydı yok
                          </Badge>
                        )}

                        {type === "phone" && !canSelect && !isNoPhoneItem && (
                          <Badge className="rounded-full bg-slate-50 text-slate-500 hover:bg-slate-50">
                            Template tekrar gönderilemez.
                          </Badge>
                        )}

                        {isUpdating && (
                          <Badge className="rounded-full bg-slate-50 text-slate-500 hover:bg-slate-50">
                            Güncelleniyor...
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-slate-400">
                        Onay Durumu
                      </p>

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
                        className={`h-9 w-full rounded-xl border px-3 pr-7 text-xs font-medium shadow-sm outline-none transition focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 ${getStatusClassName(
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

                    <div>
                      <p className="mb-2 text-xs font-medium text-slate-400">
                        WhatsApp Durumu
                      </p>

                      <select
                        value={currentWhatsAppStatus}
                        disabled={isWhatsAppUpdating}
                        onChange={(event) =>
                          void handleWhatsAppStatusChange(
                            item,
                            itemKey,
                            currentWhatsAppStatus,
                            event.target.value as WhatsAppStatus
                          )
                        }
                        className={`h-9 w-full rounded-xl border px-3 pr-7 text-xs font-medium shadow-sm outline-none transition focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 ${getWhatsAppStatusClassName(
                          currentWhatsAppStatus
                        )}`}
                      >
                        <option
                          className="bg-white text-slate-700"
                          value="not_sent"
                        >
                          N/A
                        </option>

                        <option
                          className="bg-white text-slate-700"
                          value="template_sent"
                        >
                          Template gönderildi
                        </option>

                        <option
                          className="bg-white text-slate-700"
                          value="waiting_reply"
                        >
                          Cevap bekleniyor
                        </option>

                        <option
                          className="bg-white text-slate-700"
                          value="replied"
                        >
                          Cevap verdi
                        </option>

                        <option
                          className="bg-white text-slate-700"
                          value="not_interested"
                        >
                          İlgilenmiyor
                        </option>
                      </select>
                    </div>
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
