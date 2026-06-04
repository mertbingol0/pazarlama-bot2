"use client";

import { useEffect, useMemo, useState } from "react";
import type { Business, SearchResult } from "@/types/business";

import {
  getAssignableUsers,
  getBusinessCrmBatch,
  type AssignableUser,
  type BusinessCrm,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ListColumn } from "@/components/ListColumn";
import { StatCard } from "@/components/StatCard";
import { ResultsMap } from "@/components/ResultsMap";
import {
  downloadSearchResultsAsCsv,
  downloadLeadListAsCsv,
} from "@/lib/export";
import { classifyPhoneType } from "@/lib/phone";
import { WhatsAppBusinessPanel } from "@/components/WhatsAppBusinessPanel";

type ResultsPanelProps = {
  results: SearchResult;
};

function isTemplateEligibleBusiness(business: Business) {
  const whatsappStatus = business.whatsappStatus || "not_sent";
  const leadStatus = business.status || "pending";

  const hasFinalLeadOutcome =
    leadStatus === "approved" || leadStatus === "rejected";

  return (
    Boolean(business.phone?.trim()) &&
    !business.templateSentAt &&
    !hasFinalLeadOutcome &&
    whatsappStatus === "not_sent"
  );
}

function isSameId(firstId?: string | number, secondId?: string | number) {
  if (firstId === undefined || secondId === undefined) return false;

  return String(firstId) === String(secondId);
}

function uniqueBusinessIds(ids: Array<string | number>) {
  const uniqueIds = new Map<string, string | number>();

  ids.forEach((id) => {
    uniqueIds.set(String(id), id);
  });

  return Array.from(uniqueIds.values());
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<
    Array<string | number>
  >([]);

  const [isMessagePanelOpen, setIsMessagePanelOpen] = useState(false);

  const businesses = useMemo(() => {
  return results.businesses || [];
}, [results.businesses]);

  // CRM: atanabilir kullanıcılar + işletme görüşme/not verisi.
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [crmByBusinessId, setCrmByBusinessId] = useState<
    Record<string, BusinessCrm>
  >({});

  useEffect(() => {
    let active = true;
    getAssignableUsers()
      .then((users) => {
        if (active) setAssignableUsers(users);
      })
      .catch((error) => {
        console.warn("Atanabilir kullanıcılar getirilemedi:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  // İşletme kimlikleri değiştikçe görüşme/not verisini toplu getir.
  const businessIdsKey = useMemo(
    () =>
      businesses
        .map((business) => business.id)
        .filter((id) => id !== undefined && id !== null)
        .join(","),
    [businesses]
  );

  useEffect(() => {
    const ids = businessIdsKey ? businessIdsKey.split(",") : [];

    let active = true;
    // getBusinessCrmBatch boş id listesinde {} döndürür (senkron setState yok).
    getBusinessCrmBatch(ids)
      .then((map) => {
        if (active) setCrmByBusinessId(map);
      })
      .catch((error) => {
        console.warn("Görüşme verileri getirilemedi:", error);
      });
    return () => {
      active = false;
    };
  }, [businessIdsKey]);

  const handleCrmChange = (
    businessId: number | string,
    data: BusinessCrm
  ) => {
    setCrmByBusinessId((prev) => ({ ...prev, [String(businessId)]: data }));
  };

  const whatsappPhones = useMemo(() => {
    return results.results.phones.filter(
      (phone) => classifyPhoneType(phone.value) === "whatsapp"
    );
  }, [results.results.phones]);

  const landlinePhones = useMemo(() => {
    return results.results.phones.filter(
      (phone) => classifyPhoneType(phone.value) === "landline"
    );
  }, [results.results.phones]);

  // Bir işletmenin tüm sosyal linklerini tek kartta toplayıp ikon dizisi
  // olarak göstermek için işletme bazında grupla.
  const socialItems = useMemo(() => {
    const items = results.results.instagrams || [];
    const grouped = new Map<string, (typeof items)[number] & { socialLinks: string[] }>();

    items.forEach((item) => {
      const key = String(item.businessId || item.id || item.businessName);
      const existing = grouped.get(key);

      if (existing) {
        if (item.value && !existing.socialLinks.includes(item.value)) {
          existing.socialLinks.push(item.value);
        }
        return;
      }

      grouped.set(key, {
        ...item,
        id: key,
        socialLinks: item.value ? [item.value] : [],
      });
    });

    return Array.from(grouped.values()).map((item) => ({
      ...item,
      // url backend'de sosyal linke set ediliyor; "Google Maps" butonunun
      // yanlış yönlenmemesi için temizle (linkler ikonlarda zaten var).
      url: undefined,
      value: item.socialLinks.join(", "),
    }));
  }, [results.results.instagrams]);

  const emailItems = useMemo(() => {
    return results.results.emails || [];
  }, [results.results.emails]);

  const eligibleBusinesses = useMemo(() => {
    return businesses.filter(isTemplateEligibleBusiness);
  }, [businesses]);

  const selectedBusinesses = useMemo(() => {
    return businesses.filter((business) =>
      selectedBusinessIds.some((selectedId) =>
        isSameId(selectedId, business.id)
      )
    );
  }, [businesses, selectedBusinessIds]);

  const selectedPhoneCount = selectedBusinesses.filter((business) =>
    Boolean(business.phone?.trim())
  ).length;

  const handleToggleBusinessSelection = (businessId: string | number) => {
    setSelectedBusinessIds((currentIds) => {
      const isSelected = currentIds.some((id) => isSameId(id, businessId));

      if (isSelected) {
        return currentIds.filter((id) => !isSameId(id, businessId));
      }

      return uniqueBusinessIds([...currentIds, businessId]);
    });
  };

  const handleSetSelectedBusinessIds = (businessIds: Array<string | number>) => {
    setSelectedBusinessIds(uniqueBusinessIds(businessIds));
  };

  const handleClearSelections = () => {
    setSelectedBusinessIds([]);
  };

  return (
    <>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard
          title="Toplam İşletme"
          value={results.stats.totalBusinesses}
        />

        <StatCard title="Telefon" value={results.stats.phonesFound} />

        <StatCard title="Gönderime Uygun" value={eligibleBusinesses.length} />
      </section>

      {results.fromCache ? (
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Bu sonuçlar yerel veritabanından getirildi (API kullanılmadı). Güncel
          veri için &quot;Yeni Sorgu&quot; seçeneğini kullanın.
        </div>
      ) : results.mode === "fresh" ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Güncel veriler Google&apos;dan çekildi.{" "}
          {typeof results.addedCount === "number" && results.addedCount > 0
            ? `${results.addedCount} yeni işletme veritabanına eklendi.`
            : "Yeni işletme bulunamadı; mevcut kayıtlar korundu."}
        </div>
      ) : null}

      <div className="mt-6">
        <ResultsMap businesses={businesses} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadSearchResultsAsCsv(results)}
          className="rounded-full"
        >
          Tüm Sonuçları CSV İndir
        </Button>

        <Button
          type="button"
          onClick={() => setIsMessagePanelOpen(true)}
          className="rounded-full bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
        >
          Mesaj Gönderim Paneli
          {selectedPhoneCount > 0 && (
            <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold">
              {selectedPhoneCount}
            </span>
          )}
        </Button>
      </div>

      {/* 4 kategori alt alta, her biri tam genişlik hizalı tablo */}
      <section className="mt-4 space-y-4">
        <ListColumn
          title="WhatsApp Numaraları"
          items={whatsappPhones}
          type="phone"
          variant="whatsapp"
          businesses={businesses}
          onCsvDownload={() =>
            downloadLeadListAsCsv(whatsappPhones, "phone", results, "whatsapp")
          }
          selectedBusinessIds={selectedBusinessIds}
          onToggleBusinessSelection={handleToggleBusinessSelection}
          onSetSelectedBusinessIds={handleSetSelectedBusinessIds}
          enableInteractions
          assignableUsers={assignableUsers}
          crmByBusinessId={crmByBusinessId}
          onCrmChange={handleCrmChange}
        />

        <ListColumn
          title="Sabit Hatlar"
          items={landlinePhones}
          type="phone"
          variant="landline"
          businesses={businesses}
          onCsvDownload={() =>
            downloadLeadListAsCsv(landlinePhones, "phone", results, "sabit-hatlar")
          }
          enableInteractions
          assignableUsers={assignableUsers}
          crmByBusinessId={crmByBusinessId}
          onCrmChange={handleCrmChange}
        />

        <ListColumn
          title="Sosyal Mecralar"
          items={socialItems}
          type="instagram"
          businesses={businesses}
          onCsvDownload={() =>
            downloadLeadListAsCsv(socialItems, "instagram", results)
          }
        />

        <ListColumn
          title="Mail Adresleri"
          items={emailItems}
          type="email"
          businesses={businesses}
          onCsvDownload={() =>
            downloadLeadListAsCsv(emailItems, "email", results)
          }
        />
      </section>

      {/* Sağdan açılır mesaj gönderim drawer'ı */}
      <div
        className={`fixed inset-0 z-40 overflow-hidden ${
          isMessagePanelOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!isMessagePanelOpen}
      >
        <div
          onClick={() => setIsMessagePanelOpen(false)}
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${
            isMessagePanelOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-md transform flex-col bg-slate-50 shadow-2xl transition-transform duration-300 ${
            isMessagePanelOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-label="Mesaj gönderim paneli"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">
              Manuel Mesaj Gönderimi
            </h3>

            <button
              type="button"
              onClick={() => setIsMessagePanelOpen(false)}
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Paneli kapat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <WhatsAppBusinessPanel
              businesses={businesses}
              selectedBusinesses={selectedBusinesses}
              selectedPhoneCount={selectedPhoneCount}
              onClearSelections={handleClearSelections}
            />
          </div>
        </aside>
      </div>
    </>
  );
}
