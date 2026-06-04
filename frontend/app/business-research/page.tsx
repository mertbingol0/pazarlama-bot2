"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { searchBusinesses } from "@/lib/api";
import type { SearchLimit, SearchMode, SearchResult } from "@/types/business";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { SearchForm } from "@/components/SearchForm";
import { LoadingState } from "@/components/LoadingState";
import { ResultsPanel } from "@/components/ResultsPanel";
import { PageNavigation } from "@/components/PageNavigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LAST_SEARCH_STORAGE_KEY = "jefedes-last-search";

type SavedSearchState = {
  category: string;
  city: string;
  district: string;
  limit: SearchLimit;
  results?: SearchResult | null;
};

export default function BusinessResearchPage() {
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [limit, setLimit] = useState<SearchLimit>("50");

  // Arama modu: "local" (varsayılan, cache-first) / "fresh" (Yeni sorgu: API + merge)
  const [mode, setMode] = useState<SearchMode>("local");

  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSearchResults = async ({
    category,
    city,
    district,
    limit,
    mode,
  }: {
    category: string;
    city: string;
    district: string;
    limit: SearchLimit;
    mode: SearchMode;
  }) => {
    const backendResponse = await searchBusinesses({
      category,
      city,
      district,
      limit,
      mode,
    });

    return {
      query: {
        category: backendResponse.query.category,
        city: backendResponse.query.city,
        district: backendResponse.query.district,
        limit,
      },
      stats: backendResponse.stats,
      results: backendResponse.results,
      businesses: backendResponse.businesses || [],
      fromCache: backendResponse.fromCache,
      mode: backendResponse.mode,
      addedCount: backendResponse.addedCount,
    } satisfies SearchResult;
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedSearch = localStorage.getItem(LAST_SEARCH_STORAGE_KEY);

      if (!savedSearch) {
        return;
      }

      try {
        const parsedSearch = JSON.parse(savedSearch) as SavedSearchState;

        setCategory(parsedSearch.category || "");
        setCity(parsedSearch.city || "");
        setDistrict(parsedSearch.district || "");
        setLimit(parsedSearch.limit || "50");
        setResults(parsedSearch.results || null);

        if (!parsedSearch.category) {
          return;
        }

        void fetchSearchResults({
          category: parsedSearch.category,
          city: parsedSearch.city || "",
          district: parsedSearch.district || "",
          limit: parsedSearch.limit || "50",
          // Sayfa yeniden yüklenince yerelden getir (gereksiz API kullanımı olmasın).
          mode: "local",
        })
          .then((nextResults) => {
            setResults(nextResults);
            saveLastSearch({
              category: parsedSearch.category,
              city: parsedSearch.city || "",
              district: parsedSearch.district || "",
              limit: parsedSearch.limit || "50",
              results: nextResults,
            });
          })
          .catch((error) => {
            console.warn(
              "Son arama güncellenemedi, kayıtlı sonuç korunuyor:",
              error
            );
          });
      } catch (error) {
        console.error("Son arama okunamadı:", error);
        localStorage.removeItem(LAST_SEARCH_STORAGE_KEY);
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const clearLastSearchOnPageClose = () => {
      localStorage.removeItem(LAST_SEARCH_STORAGE_KEY);
    };

    window.addEventListener("beforeunload", clearLastSearchOnPageClose);

    return () => {
      window.removeEventListener("beforeunload", clearLastSearchOnPageClose);
    };
  }, []);

  const saveLastSearch = (searchState: SavedSearchState) => {
    localStorage.setItem(LAST_SEARCH_STORAGE_KEY, JSON.stringify(searchState));
  };

  const handleClearSearch = () => {
    setCategory("");
    setCity("");
    setDistrict("");
    setLimit("50");
    setResults(null);
    setErrorMessage(null);

    localStorage.removeItem(LAST_SEARCH_STORAGE_KEY);
  };

  const handleSearch = async () => {
    if (!category) {
      setErrorMessage("Lütfen en az bir kategori seçin.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextResults = await fetchSearchResults({
        category,
        city,
        district,
        limit,
        mode,
      });

      setResults(nextResults);

      saveLastSearch({
        category,
        city,
        district,
        limit,
        results: nextResults,
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
            <Link
              href="/"
              aria-label="Ana sayfaya git"
              className="flex flex-col items-end leading-none"
            >
              <span className="text-3xl font-semibold tracking-tight text-slate-700">
                Jefedes<span className="text-emerald-500">.</span>
              </span>

              <span className="-mt-0.5 -translate-x-1 text-xs font-medium tracking-wide text-slate-400">
                Lead Flow
              </span>
            </Link>

            <PageNavigation />
          </div>

          <div className="mx-auto mt-8 max-w-3xl text-center">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              İşletme <span className="text-emerald-500">Araştırması</span>
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
              Kategori ve arama limiti seçerek işletmeleri arayın. İsterseniz il ve
              ilçe bilgisiyle aramayı daraltın; telefon, web sitesi ve Google Maps
              bilgilerini görüntüleyip CSV olarak dışa aktarın.
            </p>
          </div>
        </header>

        <Card className="rounded-3xl border border-emerald-100/80 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">
                  Arama Bilgileri
                </CardTitle>

                <p className="mt-1 text-sm text-slate-500">
                  Arama yapmak için kategori ve limit seçin. İsterseniz il ve
                  ilçe bilgisiyle aramayı daraltabilirsiniz.
                </p>

                {/* Sorgu modu: Yerel (cache-first) / Yeni sorgu (API + merge) */}
                <div className="mt-3">
                  <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setMode("local")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        mode === "local"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Yerel Sorgu
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("fresh")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        mode === "fresh"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Yeni Sorgu
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {mode === "local"
                      ? "Yerel veritabanından getirir; bu parametreler daha önce arandıysa API kullanılmaz."
                      : "Google'dan güncel veri çeker ve yalnızca yeni işletmeleri veritabanına ekler."}
                  </p>
                </div>
              </div>

              {results && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearSearch}
                  className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Aramayı Temizle
                </Button>
              )}
            </div>
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
