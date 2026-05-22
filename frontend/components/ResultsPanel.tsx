"use client";

import { useMemo, useState } from "react";
import type { Business, SearchResult } from "@/types/business";

import { ListColumn } from "@/components/ListColumn";
import { StatCard } from "@/components/StatCard";
import { ResultsMap } from "@/components/ResultsMap";
import { downloadSearchResultsAsCsv } from "@/lib/export";
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

  const businesses = useMemo(() => {
  return results.businesses || [];
}, [results.businesses]);

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

      {results.fromCache && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Bu sonuçlar 24 saatlik önbellekten getirildi.
        </div>
      )}

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)]">
        <div className="order-2 space-y-4 xl:order-1">
          <ResultsMap businesses={businesses} />

          <ListColumn
            title="WhatsApp / Telefon"
            items={results.results.phones}
            type="phone"
            businesses={businesses}
            onCsvDownload={() => downloadSearchResultsAsCsv(results)}
            selectedBusinessIds={selectedBusinessIds}
            onToggleBusinessSelection={handleToggleBusinessSelection}
            onSetSelectedBusinessIds={handleSetSelectedBusinessIds}
          />
        </div>

        <div className="order-1 xl:order-2">
          <WhatsAppBusinessPanel
            businesses={businesses}
            selectedBusinesses={selectedBusinesses}
            selectedPhoneCount={selectedPhoneCount}
            onClearSelections={handleClearSelections}
          />
        </div>
      </section>
    </>
  );
}
