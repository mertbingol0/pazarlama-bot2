import type { SearchResult } from "@/types/business";

import { Button } from "@/components/ui/button";
import { ListColumn } from "@/components/ListColumn";
import { StatCard } from "@/components/StatCard";
import { ResultsMap } from "@/components/ResultsMap";
import { downloadSearchResultsAsCsv } from "@/lib/export";
import { WhatsAppBusinessPanel } from "@/components/WhatsAppBusinessPanel";

type ResultsPanelProps = {
  results: SearchResult;
};

export function ResultsPanel({ results }: ResultsPanelProps) {
  return (
    <>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <StatCard
          title="Toplam İşletme"
          value={results.stats.totalBusinesses}
        />

        <StatCard title="Telefon" value={results.stats.phonesFound} />
      </section>

      {results.fromCache && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Bu sonuçlar 24 saatlik önbellekten getirildi.
        </div>
      )}

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)]">
        <div className="order-2 space-y-4 xl:order-1">
          <ResultsMap businesses={results.businesses || []} />

          <ListColumn
            title="WhatsApp / Telefon"
            items={results.results.phones}
            type="phone"
            businesses={results.businesses || []}
          />

          <section className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => downloadSearchResultsAsCsv(results)}
            >
              CSV İndir
            </Button>
          </section>
        </div>

        <div className="order-1 xl:order-2">
          <WhatsAppBusinessPanel />
        </div>
      </section>
    </>
  );
}