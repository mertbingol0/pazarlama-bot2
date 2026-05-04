"use client";

import { useState } from "react";
import { searchBusinesses } from "@/lib/api";
import type { SearchResult } from "@/types/business";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchForm } from "@/components/SearchForm";
import { LoadingState } from "@/components/LoadingState";
import { ResultsPanel } from "@/components/ResultsPanel";

export default function Home() {
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!category || !city || !district) {
      setErrorMessage("Lütfen kategori, il ve ilçe seçin.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const backendResponse = await searchBusinesses({
        category,
        city,
        district,
      });

      setResults({
        query: backendResponse.query,
        stats: backendResponse.stats,
        results: backendResponse.results,
        fromCache: backendResponse.fromCache,
      });
    } catch (error) {
      console.error("Backend bağlantı hatası:", error);
      setErrorMessage(
        "Backend bağlantısı kurulamadı veya arama sonuçları alınamadı."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Jefedes Lead Generation Tool
            </Badge>
          </div>

          <div className="mt-6">
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
              Potansiyel Müşteri Arama Paneli
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Kategori, il ve ilçe seçerek işletmeleri arayın. Telefon,
              e-posta ve Instagram sonuçlarını ayrı listelerde görüntüleyin,
              kopyalayın ve CSV olarak dışa aktarın.
            </p>
          </div>
        </header>

        <Card className="border-white/80 bg-white/90 shadow-md backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl text-slate-950">
              Arama Bilgileri
            </CardTitle>
            <p className="text-sm text-slate-500">
              Arama yapmak için kategori, il ve ilçe bilgilerini seçin.
            </p>
          </CardHeader>

          <CardContent>
            <SearchForm
              category={category}
              city={city}
              district={district}
              isLoading={isLoading}
              onCategoryChange={setCategory}
              onCityChange={setCity}
              onDistrictChange={setDistrict}
              onSearch={handleSearch}
            />
          </CardContent>
        </Card>

        {isLoading && <LoadingState />}

        {errorMessage && !isLoading && <ErrorState message={errorMessage} />}

        {!results && !isLoading && !errorMessage && <EmptyState />}

        {results && !isLoading && !errorMessage && (
          <ResultsPanel results={results} />
        )}
      </div>
    </main>
  );
}