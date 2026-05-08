import type { SearchResult } from "@/types/business";

import { Button } from "@/components/ui/button";
import { ListColumn } from "@/components/ListColumn";
import { StatCard } from "@/components/StatCard";
import { downloadSearchResultsAsCsv } from "@/lib/export";
import { WhatsAppBusinessPanel } from "@/components/WhatsAppBusinessPanel";

type ResultsPanelProps = {
  results: SearchResult;
};

export function ResultsPanel({ results }: ResultsPanelProps) {
  return (
    <>
      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard
          title="Toplam İşletme"
          value={results.stats.totalBusinesses}
        />

        <StatCard title="Telefon" value={results.stats.phonesFound} />

        <StatCard title="E-posta" value={results.stats.emailsFound} />

        <StatCard title="Instagram" value={results.stats.instagramsFound} />
      </section>

      {results.fromCache && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Bu sonuçlar 24 saatlik önbellekten getirildi.
        </div>
      )}

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <ListColumn
          title="WhatsApp / Telefon"
          items={results.results.phones}
          type="phone"
          businesses={results.businesses || []}
        />

        <ListColumn
          title="E-Posta"
          items={results.results.emails}
          type="email"
          businesses={results.businesses || []}
        />

        <WhatsAppBusinessPanel />
      </section>

      <section className="mt-6 flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => downloadSearchResultsAsCsv(results)}
        >
          CSV İndir
        </Button>
      </section>
    </>
  );
}