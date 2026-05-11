"use client";

import { useMemo, useState } from "react";
import type { Business } from "@/types/business";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ResultsMapProps = {
  businesses: Business[];
};

type MapBusiness = Business & {
  location: {
    lat: number;
    lng: number;
  };
};

function hasValidLocation(business: Business): business is MapBusiness {
  return (
    typeof business.location?.lat === "number" &&
    typeof business.location?.lng === "number"
  );
}

function getPinPosition(
  business: MapBusiness,
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }
) {
  const latRange = bounds.maxLat - bounds.minLat || 1;
  const lngRange = bounds.maxLng - bounds.minLng || 1;

  const x = ((business.location.lng - bounds.minLng) / lngRange) * 82 + 9;
  const y = (1 - (business.location.lat - bounds.minLat) / latRange) * 68 + 16;

  return {
    left: `${Math.min(Math.max(x, 6), 94)}%`,
    top: `${Math.min(Math.max(y, 10), 90)}%`,
  };
}

export function ResultsMap({ businesses }: ResultsMapProps) {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  const mapBusinesses = useMemo(
    () => businesses.filter(hasValidLocation),
    [businesses]
  );

  const bounds = useMemo(() => {
    if (mapBusinesses.length === 0) {
      return {
        minLat: 39,
        maxLat: 42,
        minLng: 28,
        maxLng: 32,
      };
    }

    const lats = mapBusinesses.map((business) => business.location.lat);
    const lngs = mapBusinesses.map((business) => business.location.lng);

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [mapBusinesses]);

  const previewBusinesses = mapBusinesses.slice(0, 30);

  const mapContent = (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setIsFullscreenOpen(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          setIsFullscreenOpen(true);
        }
      }}
      className="relative h-full min-h-[220px] cursor-pointer overflow-hidden rounded-2xl border border-emerald-100 bg-[linear-gradient(135deg,#eefaf4_0%,#f8fbff_35%,#e8f4ff_70%,#f2fbf6_100%)]"
    >
      <div className="absolute inset-0 opacity-60">
        <div className="absolute left-[-10%] top-[35%] h-16 w-[120%] rotate-[-8deg] rounded-full bg-sky-100" />
        <div className="absolute left-[8%] top-[20%] h-1 w-[90%] rotate-[6deg] rounded-full bg-slate-200" />
        <div className="absolute left-[0%] top-[62%] h-1 w-[100%] rotate-[-4deg] rounded-full bg-slate-200" />
        <div className="absolute left-[28%] top-[-10%] h-[120%] w-1 rotate-[18deg] rounded-full bg-slate-200" />
        <div className="absolute left-[62%] top-[-10%] h-[120%] w-1 rotate-[-14deg] rounded-full bg-slate-200" />
      </div>

      <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
        Haritada sonuçlar
      </div>

      {previewBusinesses.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm">
            <p className="text-sm font-medium text-slate-700">
              Harita için konum verisi bulunamadı.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Backend sonuçlarında lat/lng bilgisi geldiğinde işletmeler burada
              pin olarak görünecek.
            </p>
          </div>
        </div>
      ) : (
        previewBusinesses.map((business) => {
          const position = getPinPosition(business, bounds);

          return (
            <div
              key={`${business.id || business.name}-${business.location.lat}-${business.location.lng}`}
              className="group absolute z-10 -translate-x-1/2 -translate-y-full"
              style={position}
            >
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200 ring-4 ring-white transition group-hover:scale-110" />

                <div className="absolute left-1/2 top-[27px] h-3 w-3 -translate-x-1/2 rotate-45 bg-emerald-500" />

                <div className="pointer-events-none absolute bottom-10 left-1/2 hidden w-48 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg group-hover:block">
                  <p className="font-semibold text-slate-900">
                    {business.name}
                  </p>

                  {business.address && (
                    <p className="mt-1 line-clamp-2 text-slate-400">
                      {business.address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      <div className="absolute bottom-4 right-4 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
        Tıklayınca tam ekran açılır
      </div>
    </div>
  );

  return (
    <>
      <Card className="rounded-3xl border border-emerald-100/80 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Haritada Sonuçlar
            </CardTitle>

            <p className="mt-1 text-sm text-slate-500">
              Bulunan işletmelerin konumlarını harita üzerinde görüntüleyin.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsFullscreenOpen(true)}
            className="rounded-xl border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Tam ekranda aç
          </Button>
        </CardHeader>

        <CardContent>{mapContent}</CardContent>
      </Card>

      {isFullscreenOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-6 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-7xl flex-col rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Haritada Sonuçlar
                </h2>

                <p className="text-sm text-slate-500">
                  {previewBusinesses.length} konum gösteriliyor.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFullscreenOpen(false)}
                className="rounded-xl"
              >
                Kapat
              </Button>
            </div>

            <div className="min-h-0 flex-1 p-6">
              <div className="h-full">{mapContent}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}