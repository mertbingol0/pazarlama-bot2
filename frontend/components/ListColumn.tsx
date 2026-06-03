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

import { SocialChip } from "@/components/contact-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ListColumnProps = {
  title: string;
  items: LeadItem[];
  type: StoredLeadType;
  businesses?: Business[];
  onCsvDownload?: () => void;

  /**
   * type === "phone" için telefon türünü belirler. "whatsapp" WhatsApp'a uygun
   * cep hatları, "landline" ise WhatsApp ile ulaşılamayan sabit hatlar içindir.
   */
  variant?: "whatsapp" | "landline";

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
    label: "N/A",
    value: "not_sent",
  },
  {
    label: "Template gönderildi",
    value: "template_sent",
  },
  {
    label: "Bilgi isteniyor",
    value: "replied",
  },
  {
    label: "Daha sonra aranacak",
    value: "follow_up",
  },
  {
    label: "İlgilenmiyor",
    value: "not_interested",
  },
];

function normalizeWhatsAppStatus(status?: string | null): WhatsAppStatus {
  if (status === "waiting_reply") {
    return "template_sent";
  }

  if (
    status === "template_sent" ||
    status === "replied" ||
    status === "follow_up" ||
    status === "not_interested"
  ) {
    return status;
  }

  return "not_sent";
}

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

  if (status === "replied") {
    return "border-emerald-100 bg-emerald-50/80 text-emerald-700";
  }

  if (status === "follow_up") {
    return "border-amber-100 bg-amber-50/80 text-amber-700";
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

function uniqueBusinessIds(ids: Array<string | number>) {
  const uniqueIds = new Map<string, string | number>();

  ids.forEach((id) => {
    uniqueIds.set(String(id), id);
  });

  return Array.from(uniqueIds.values());
}

function canSelectForTemplate({
  status,
  noPhone,
  templateSentAt,
  leadStatus,
}: {
  status: WhatsAppStatus;
  noPhone?: boolean;
  templateSentAt?: string | null;
  leadStatus?: LeadStatus;
}) {
  const hasFinalLeadOutcome =
    leadStatus === "approved" || leadStatus === "rejected";

  return (
    !noPhone &&
    !templateSentAt &&
    !hasFinalLeadOutcome &&
    status === "not_sent"
  );
}

function canSelectForManualMessage(status: WhatsAppStatus, noPhone?: boolean) {
  return !noPhone && (status === "replied" || status === "follow_up");
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

export function ListColumn({
  title,
  items,
  type,
  businesses = [],
  onCsvDownload,
  variant = "whatsapp",
  selectedBusinessIds = [],
  onToggleBusinessSelection,
  onSetSelectedBusinessIds,
}: ListColumnProps) {
  const isLandline = type === "phone" && variant === "landline";

  // Sabit hatlar ve sosyal mecralar için WhatsApp'a özgü alanlar (seçim,
  // template gönderimi, WhatsApp durumu) gizlenir.
  const showWhatsAppFeatures = type === "phone" && !isLandline;
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
  const [isOpen, setIsOpen] = useState(true);

  const missingPhoneItems = useMemo<DisplayLeadItem[]>(() => {
    if (!showWhatsAppFeatures) return [];

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
        whatsappStatus: normalizeWhatsAppStatus(business.whatsappStatus),
        templateSentAt: business.templateSentAt || null,
        lastIncomingAt: business.lastIncomingAt || null,
        lastMessageText: business.lastMessageText || null,
        lastWhatsappMessageId: business.lastWhatsappMessageId || null,
      }));
  }, [businesses, showWhatsAppFeatures]);

  const allDisplayItems: DisplayLeadItem[] =
    showWhatsAppFeatures && showWithoutPhones
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

  const getCurrentLeadStatus = (item: DisplayLeadItem): LeadStatus => {
    const relatedBusiness = getRelatedBusiness(item);
    const itemKey = getLeadKey(item);

    return (
      localStatuses[itemKey] ||
      item.status ||
      relatedBusiness?.status ||
      "pending"
    );
  };

  const getCurrentTemplateSentAt = (item: DisplayLeadItem) => {
    const relatedBusiness = getRelatedBusiness(item);

    return item.templateSentAt || relatedBusiness?.templateSentAt || null;
  };

  const getCurrentWhatsAppStatus = (item: DisplayLeadItem): WhatsAppStatus => {
    const relatedBusiness = getRelatedBusiness(item);
    const itemKey = getLeadKey(item);

    return normalizeWhatsAppStatus(
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
        canSelectForTemplate({
          status: getCurrentWhatsAppStatus(item),
          noPhone: item.noPhone,
          templateSentAt: getCurrentTemplateSentAt(item),
          leadStatus: getCurrentLeadStatus(item),
        })
      )
      .map((item) => getItemBusinessId(item))
      .filter((id): id is string | number => id !== undefined && id !== null)
  );

  const isAllSelectableSelected =
    selectableBusinessIds.length > 0 &&
    selectableBusinessIds.every((businessId) =>
      isSelectedBusiness(selectedBusinessIds, businessId)
    );

  const handleToggleSelectAll = () => {
    if (!onSetSelectedBusinessIds || selectableBusinessIds.length === 0) {
      return;
    }

    if (isAllSelectableSelected) {
      const nextSelectedBusinessIds = selectedBusinessIds.filter(
        (selectedId) =>
          !selectableBusinessIds.some(
            (businessId) => String(businessId) === String(selectedId)
          )
      );

      onSetSelectedBusinessIds(nextSelectedBusinessIds);
      return;
    }

    const mergedSelectedBusinessIds = new Map<string, string | number>();

    selectedBusinessIds.forEach((businessId) => {
      mergedSelectedBusinessIds.set(String(businessId), businessId);
    });

    selectableBusinessIds.forEach((businessId) => {
      mergedSelectedBusinessIds.set(String(businessId), businessId);
    });

    onSetSelectedBusinessIds(Array.from(mergedSelectedBusinessIds.values()));
  };

  const getHref = (value: string, url?: string) => {
    if (type === "phone") {
      if (isLandline) {
        return `tel:${value.replace(/[^\d+]/g, "")}`;
      }

      return `https://wa.me/${value.replace(/\D/g, "")}`;
    }

    if (type === "email") {
      return `mailto:${value}`;
    }

    return url || `https://instagram.com/${value.replace("@", "")}`;
  };

  const getActionText = () => {
    if (type === "phone") return isLandline ? "Ara" : "WhatsApp";
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

    const businessId = getItemBusinessId(item);

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

    const businessId = getItemBusinessId(item);

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

  // Tablo sütun şablonu (varyanta göre seçim ve WhatsApp Durumu sütunları
  // gösterilir/gizlenir). Tüm satırlar aynı şablonu kullanır → hizalı tablo.
  const showSelectCol = showWhatsAppFeatures;
  const showWhatsAppCol = showWhatsAppFeatures;

  const valueHeader =
    type === "email"
      ? "E-posta"
      : type === "instagram"
      ? "Sosyal Medya"
      : "Numara";

  const valueColorClass =
    type === "email"
      ? "text-indigo-700"
      : isLandline
      ? "text-sky-700"
      : "text-emerald-700";

  const gridTemplateColumns = [
    showSelectCol ? "2.5rem" : null,
    "minmax(11rem,1.5fr)",
    "minmax(10rem,1.4fr)",
    "7rem",
    "8.5rem",
    showWhatsAppCol ? "9.5rem" : null,
    "minmax(11rem,1.2fr)",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className="overflow-visible rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-4 overflow-visible">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              className="flex items-center gap-2 text-base font-semibold text-slate-800"
            >
              <svg
                width="16"
                height="16"
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
              {title}
            </button>

            {showWhatsAppFeatures && (
              <p className="mt-1 text-xs text-slate-400">
                Template göndermek için firmaları seçebilirsiniz.
              </p>
            )}

            {isLandline && (
              <p className="mt-1 text-xs text-slate-400">
                Bu numaralara WhatsApp üzerinden ulaşılamaz; arama yapabilirsiniz.
              </p>
            )}

            {onCsvDownload && (
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
            {showWhatsAppFeatures && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleSelectAll}
                disabled={
                  selectableBusinessIds.length === 0 || !onSetSelectedBusinessIds
                }
                className="rounded-full"
              >
                {isAllSelectableSelected ? "Seçimi Kaldır" : "Tümünü Seç"}
              </Button>
            )}

            {showWhatsAppFeatures && missingPhoneItems.length > 0 && (
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

        {showWhatsAppFeatures && (
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

      {isOpen && (
        <CardContent className="overflow-x-auto px-0 pb-0">
          {displayItems.length === 0 ? (
            <p className="mx-6 mb-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              Sonuç bulunamadı.
            </p>
          ) : (
            <div className="min-w-[60rem] border-t border-slate-200">
              {/* Tablo başlığı */}
              <div
                className="grid border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                style={{ gridTemplateColumns }}
              >
                {showSelectCol && (
                  <div className="border-r border-slate-100 px-3 py-2" />
                )}
                <div className="border-r border-slate-100 px-3 py-2">Firma</div>
                <div className="border-r border-slate-100 px-3 py-2">
                  {valueHeader}
                </div>
                <div className="border-r border-slate-100 px-3 py-2">Kaynak</div>
                <div className="border-r border-slate-100 px-3 py-2">
                  Onay Durumu
                </div>
                {showWhatsAppCol && (
                  <div className="border-r border-slate-100 px-3 py-2">
                    WhatsApp Durumu
                  </div>
                )}
                <div className="px-3 py-2">Aksiyon</div>
              </div>

              {displayItems.map((item) => {
                const itemKey = getLeadKey(item);
                const currentStatus = getCurrentLeadStatus(item);
                const isNoPhoneItem = item.noPhone === true;
                const relatedBusiness = getRelatedBusiness(item);
                const businessId = getItemBusinessId(item);

                const websiteUrl = normalizeExternalUrl(
                  item.website || relatedBusiness?.website
                );

                const currentWhatsAppStatus = getCurrentWhatsAppStatus(item);
                const currentTemplateSentAt = getCurrentTemplateSentAt(item);

                const isUpdating = updatingItemKey === itemKey;
                const isWhatsAppUpdating = updatingWhatsAppItemKey === itemKey;

                const canSelect =
                  type === "phone" &&
                  businessId !== undefined &&
                  (canSelectForTemplate({
                    status: currentWhatsAppStatus,
                    noPhone: isNoPhoneItem,
                    templateSentAt: currentTemplateSentAt,
                    leadStatus: currentStatus,
                  }) ||
                    canSelectForManualMessage(
                      currentWhatsAppStatus,
                      isNoPhoneItem
                    ));

                const isSelected = isSelectedBusiness(
                  selectedBusinessIds,
                  businessId
                );

                return (
                  <div
                    key={itemKey}
                    className={`grid items-start border-b border-slate-200 transition ${
                      isSelected ? "bg-emerald-50/40" : "bg-white hover:bg-slate-50/60"
                    }`}
                    style={{ gridTemplateColumns }}
                  >
                    {showSelectCol && (
                      <div className="border-r border-slate-100 p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={() => {
                            if (businessId !== undefined) {
                              onToggleBusinessSelection?.(businessId);
                            }
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`${item.businessName} seç`}
                        />
                      </div>
                    )}

                    {/* Firma */}
                    <div className="min-w-0 border-r border-slate-100 p-3">
                      <p className="break-words text-sm font-semibold text-slate-900">
                        {item.businessName}
                      </p>

                      {item.address && (
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {item.address}
                        </p>
                      )}

                      {(isNoPhoneItem ||
                        (showWhatsAppFeatures && !canSelect) ||
                        isUpdating) && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {isNoPhoneItem && (
                            <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                              Telefon kaydı yok
                            </Badge>
                          )}

                          {showWhatsAppFeatures &&
                            !canSelect &&
                            !isNoPhoneItem && (
                              <Badge className="rounded-full bg-slate-50 text-slate-500 hover:bg-slate-50">
                                Tekrar gönderilemez
                              </Badge>
                            )}

                          {isUpdating && (
                            <Badge className="rounded-full bg-slate-50 text-slate-500 hover:bg-slate-50">
                              Güncelleniyor...
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Değer (numara / mail / sosyal) */}
                    <div className="min-w-0 border-r border-slate-100 p-3">
                      {type === "instagram" ? (
                        <div className="flex flex-wrap gap-2">
                          {(item.socialLinks && item.socialLinks.length > 0
                            ? item.socialLinks
                            : [item.value]
                          )
                            .filter(Boolean)
                            .map((link) => (
                              <SocialChip key={link} url={link} />
                            ))}
                        </div>
                      ) : (
                        <>
                          <span
                            className={`break-all text-sm font-semibold ${
                              isNoPhoneItem ? "text-slate-400" : valueColorClass
                            }`}
                          >
                            {item.value}
                          </span>

                          {/* Telefon altında ilgili işletmenin sosyal mecra ikonları */}
                          {type === "phone" &&
                            (() => {
                              const links = String(
                                relatedBusiness?.socials ||
                                  relatedBusiness?.instagram ||
                                  ""
                              )
                                .split(",")
                                .map((value) => value.trim())
                                .filter(Boolean);

                              if (links.length === 0) return null;

                              return (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {links.map((link) => (
                                    <SocialChip key={link} url={link} size="sm" />
                                  ))}
                                </div>
                              );
                            })()}
                        </>
                      )}
                    </div>

                    {/* Kaynak */}
                    <div className="border-r border-slate-100 p-3 text-xs text-slate-500">
                      {formatSource(item.source)}
                    </div>

                    {/* Onay Durumu */}
                    <div className="border-r border-slate-100 p-3">
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
                        className={`h-9 w-full rounded-xl border px-2 pr-6 text-xs font-medium shadow-sm outline-none transition focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 ${getStatusClassName(
                          currentStatus
                        )}`}
                      >
                        <option className="bg-white text-slate-700" value="approved">
                          Onaylanan
                        </option>
                        <option className="bg-white text-slate-700" value="pending">
                          Bekleyen
                        </option>
                        <option className="bg-white text-slate-700" value="rejected">
                          Reddedilen
                        </option>
                      </select>
                    </div>

                    {/* WhatsApp Durumu */}
                    {showWhatsAppCol && (
                      <div className="border-r border-slate-100 p-3">
                        <select
                          value={currentWhatsAppStatus}
                          disabled={
                            isWhatsAppUpdating ||
                            currentWhatsAppStatus === "not_interested"
                          }
                          onChange={(event) =>
                            void handleWhatsAppStatusChange(
                              item,
                              itemKey,
                              currentWhatsAppStatus,
                              event.target.value as WhatsAppStatus
                            )
                          }
                          className={`h-9 w-full rounded-xl border px-2 pr-6 text-xs font-medium shadow-sm outline-none transition focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 ${getWhatsAppStatusClassName(
                            currentWhatsAppStatus
                          )}`}
                        >
                          <option
                            className="bg-white text-slate-700"
                            value="not_sent"
                            disabled={
                              currentWhatsAppStatus !== "not_sent" ||
                              Boolean(currentTemplateSentAt)
                            }
                          >
                            N/A
                          </option>
                          <option
                            className="bg-white text-slate-700"
                            value="template_sent"
                          >
                            Template gönderildi
                          </option>
                          <option className="bg-white text-slate-700" value="replied">
                            Bilgi isteniyor
                          </option>
                          <option
                            className="bg-white text-slate-700"
                            value="follow_up"
                          >
                            Daha sonra aranacak
                          </option>
                          <option
                            className="bg-white text-slate-700"
                            value="not_interested"
                          >
                            İlgilenmiyor
                          </option>
                        </select>
                      </div>
                    )}

                    {/* Aksiyon */}
                    <div className="flex flex-wrap items-start gap-1.5 p-3">
                      {!isNoPhoneItem && type !== "instagram" && (
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
                            Maps
                          </a>
                        </Button>
                      )}

                      {websiteUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={websiteUrl} target="_blank" rel="noreferrer">
                            Web
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}