"use client";

import { useState } from "react";
import { categories } from "@/lib/categories";
import { locations } from "@/lib/tr-locations";
import { mockSearchResult } from "@/lib/mockData";
import type { SearchResult } from "@/types/business";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedCity = locations.find((item) => item.city === city);

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
            <div className="grid gap-4 md:grid-cols-4">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="">Kategori seç</option>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setDistrict("");
                }}
                className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="">İl seç</option>
                {locations.map((item) => (
                  <option key={item.city} value={item.city}>
                    {item.city}
                  </option>
                ))}
              </select>

              <select
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                disabled={!city}
                className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">İlçe seç</option>
                {selectedCity?.districts.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? "Aranıyor..." : "Ara"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <p className="font-medium text-slate-900">
                İşletmeler aranıyor...
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Gerçek sistemde scraping işlemi 30 saniye ile 2 dakika arasında
                sürebilir.
              </p>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-slate-900" />
              </div>
            </CardContent>
          </Card>
        )}

        {results && !isLoading && (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-4">
              <StatCard
                title="Toplam İşletme"
                value={results.stats.totalBusinesses}
              />
              <StatCard title="Telefon" value={results.stats.phonesFound} />
              <StatCard title="E-posta" value={results.stats.emailsFound} />
              <StatCard
                title="Instagram"
                value={results.stats.instagramsFound}
              />
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
              />

              <ListColumn
                title="E-Posta"
                items={results.results.emails}
                type="email"
              />

              <ListColumn
                title="Instagram"
                items={results.results.instagrams}
                type="instagram"
              />
            </section>

            <section className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline">CSV İndir</Button>
              <Button variant="outline">Excel İndir</Button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}

type ListColumnProps = {
  title: string;
  items: {
    value: string;
    businessName: string;
    source: string;
    url?: string;
  }[];
  type: "phone" | "email" | "instagram";
};

function ListColumn({ title, items, type }: ListColumnProps) {
  const getHref = (value: string, url?: string) => {
    if (type === "phone") {
      return `https://wa.me/${value.replace(/\D/g, "")}`;
    }

    if (type === "email") {
      return `mailto:${value}`;
    }

    return url || `https://instagram.com/${value.replace("@", "")}`;
  };

  const getActionText = () => {
    if (type === "phone") return "WhatsApp";
    if (type === "email") return "Mail Gönder";
    return "Profili Aç";
  };

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    alert("Kopyalandı");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant="secondary">{items.length}</Badge>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Sonuç bulunamadı.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.businessName}-${item.value}`}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="break-all font-medium text-slate-900">
                  {item.value}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {item.businessName}
                </p>

                <Badge variant="outline" className="mt-2">
                  {item.source}
                </Badge>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(item.value)}
                  >
                    Kopyala
                  </Button>

                  <Button size="sm" asChild>
                    <a
                      href={getHref(item.value, item.url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {getActionText()}
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}