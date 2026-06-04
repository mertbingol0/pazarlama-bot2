"use client";

import { Fragment, useMemo, useState } from "react";
import type {
  Business,
  LeadItem,
  LeadStatus,
  WhatsAppStatus,
  WhatsAppStatusFilter,
} from "@/types/business";
import { getLeadKey, type StoredLeadType } from "@/lib/lead-status-storage";
import {
  OUTCOME_LABELS,
  type AssignableUser,
  type BusinessCrm,
} from "@/lib/api";

import { SocialChip } from "@/components/contact-icons";
import { BusinessInteractionPanel } from "@/components/BusinessInteractionPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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

  // CRM: işletme görüşmesi (kanal/sonuç/personel) + notlar.
  enableInteractions?: boolean;
  assignableUsers?: AssignableUser[];
  crmByBusinessId?: Record<string, BusinessCrm>;
  onCrmChange?: (businessId: number | string, data: BusinessCrm) => void;
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
  enableInteractions = false,
  assignableUsers = [],
  crmByBusinessId = {},
  onCrmChange,
}: ListColumnProps) {
  const isLandline = type === "phone" && variant === "landline";

  // Sabit hatlar ve sosyal mecralar için WhatsApp'a özgü alanlar (seçim,
  // template gönderimi, WhatsApp durumu) gizlenir.
  const showWhatsAppFeatures = type === "phone" && !isLandline;

  const [showWithoutPhones, setShowWithoutPhones] = useState(false);

  const [whatsappStatusFilter, setWhatsappStatusFilter] =
    useState<WhatsAppStatusFilter>("all");

  const [isWhatsappFilterOpen, setIsWhatsappFilterOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  // Hangi satırların görüşme paneli açık (itemKey bazında).
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const showInteractions = enableInteractions && type === "phone";

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

    return item.status || relatedBusiness?.status || "pending";
  };

  const getCurrentTemplateSentAt = (item: DisplayLeadItem) => {
    const relatedBusiness = getRelatedBusiness(item);

    return item.templateSentAt || relatedBusiness?.templateSentAt || null;
  };

  const getCurrentWhatsAppStatus = (item: DisplayLeadItem): WhatsAppStatus => {
    const relatedBusiness = getRelatedBusiness(item);

    return normalizeWhatsAppStatus(
      item.whatsappStatus || relatedBusiness?.whatsappStatus || "not_sent"
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

  // Tablo sütun şablonu. Kaynak / Onay Durumu / WhatsApp Durumu sütunları
  // kaldırıldı (yerlerine yeni bir yapı gelecek). Tüm satırlar aynı şablonu
  // kullanır → hizalı tablo.
  const showSelectCol = showWhatsAppFeatures;

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
            <div className="min-w-[34rem] border-t border-slate-200">
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

                // CRM: bu işletmenin görüşme/not verisi.
                const canInteract =
                  showInteractions && businessId !== undefined;
                const crm =
                  canInteract && businessId !== undefined
                    ? crmByBusinessId[String(businessId)]
                    : undefined;
                const currentOutcome =
                  crm?.interaction?.outcome &&
                  crm.interaction.outcome !== "pending"
                    ? crm.interaction.outcome
                    : null;
                const noteCount = crm?.notes?.length ?? 0;
                const isExpanded = expandedKeys.has(itemKey);

                return (
                  <Fragment key={itemKey}>
                  <div
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
                      <div className="flex items-start gap-2">
                        {canInteract && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(itemKey)}
                            aria-expanded={isExpanded}
                            aria-label={
                              isExpanded ? "Görüşmeyi kapat" : "Görüşmeyi aç"
                            }
                            className="mt-0.5 shrink-0 rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              className={`transition-transform ${
                                isExpanded ? "rotate-90" : ""
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
                          </button>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold text-slate-900">
                            {item.businessName}
                          </p>

                          {item.address && (
                            <p className="mt-1 text-xs leading-5 text-slate-400">
                              {item.address}
                            </p>
                          )}
                        </div>
                      </div>

                      {canInteract && (currentOutcome || noteCount > 0) && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {currentOutcome && (
                            <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                              {OUTCOME_LABELS[currentOutcome] || currentOutcome}
                            </Badge>
                          )}
                          {noteCount > 0 && (
                            <Badge className="rounded-full bg-slate-100 text-slate-500 hover:bg-slate-100">
                              {noteCount} not
                            </Badge>
                          )}
                        </div>
                      )}

                      {(isNoPhoneItem ||
                        (showWhatsAppFeatures && !canSelect)) && (
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

                  {canInteract && isExpanded && businessId !== undefined && (
                    <BusinessInteractionPanel
                      businessId={businessId}
                      initial={crm ?? { interaction: null, notes: [] }}
                      assignableUsers={assignableUsers}
                      onUpdated={onCrmChange}
                    />
                  )}
                  </Fragment>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}