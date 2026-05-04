"use client";

import { useState } from "react";
import { mockSearchResult } from "@/lib/mockData";
import type { SearchResult } from "@/types/business";

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

  const handleSearch = () => {
    if (!category || !city || !district) {
      alert("Lütfen kategori, il ve ilçe seçin.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setResults(mockSearchResult);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <Badge variant="secondary">Jefedes Lead Generation Tool</Badge>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            Potansiyel Müşteri Arama Paneli
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            Kategori, il ve ilçe seçerek işletmeleri arayın. Telefon, e-posta
            ve Instagram sonuçlarını ayrı listelerde görüntüleyin.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Arama Bilgileri</CardTitle>
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

        {results && !isLoading && <ResultsPanel results={results} />}
      </div>
    </main>
  );
}