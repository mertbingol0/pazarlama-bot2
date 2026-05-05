"use client";

import { useState } from "react";

import { searchBusinesses } from "@/lib/api";
import type { SearchLimit, SearchResult } from "@/types/business";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { SearchForm } from "@/components/SearchForm";
import { LoadingState } from "@/components/LoadingState";
import { ResultsPanel } from "@/components/ResultsPanel";
import { PageNavigation } from "@/components/PageNavigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [limit, setLimit] = useState<SearchLimit>("50");

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
        limit,
      });

      setResults({
        query: {
          category: backendResponse.query.category,
          city: backendResponse.query.city,
          district: backendResponse.query.district,
          limit,
        },
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
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-semibold tracking-tight text-slate-700">
              Jefedes<span className="text-emerald-500">.</span>
            </div>

            <PageNavigation />
          </div>

          <div className="mx-auto mt-14 max-w-4xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">
              Potansiyel müşterilerinizi{" "}
              <span className="text-emerald-500">daha hızlı</span> bulun
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500 md:text-lg">
              Kategori, il, ilçe ve arama limiti seçerek işletmeleri arayın.
              Telefon, e-posta ve Instagram sonuçlarını ayrı listelerde
              görüntüleyin, kopyalayın ve CSV olarak dışa aktarın.
            </p>
          </div>
        </header>

        <Card className="rounded-3xl border border-emerald-100/80 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-slate-900">
              Arama Bilgileri
            </CardTitle>

            <p className="text-sm text-slate-500">
              Arama yapmak için kategori, il, ilçe ve limit bilgilerini seçin.
            </p>
          </CardHeader>

          <CardContent>
            <SearchForm
              category={category}
              city={city}
              district={district}
              limit={limit}
              isLoading={isLoading}
              onCategoryChange={setCategory}
              onCityChange={setCity}
              onDistrictChange={setDistrict}
              onLimitChange={setLimit}
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