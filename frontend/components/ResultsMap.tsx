"use client";

import { useCallback, useMemo, useState } from "react";
import {
  GoogleMap,
  InfoWindow,
  Marker,
  useLoadScript,
} from "@react-google-maps/api";

import type { Business } from "@/types/business";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ResultsMapProps = {
  businesses: Business[];
};

type MapBusiness = Business & {
  mapLocation: {
    lat: number;
    lng: number;
  };
};

type BusinessWithPossibleCoordinates = Business & {
  lat?: number;
  lng?: number;
};

function getBusinessLocation(business: Business) {
  const businessWithCoordinates = business as BusinessWithPossibleCoordinates;

  const location = business.location as
    | {
        lat?: number;
        lng?: number;
        latitude?: number;
        longitude?: number;
      }
    | undefined;

  const lat =
    businessWithCoordinates.lat ?? location?.lat ?? location?.latitude ?? null;

  const lng =
    businessWithCoordinates.lng ?? location?.lng ?? location?.longitude ?? null;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  return { lat, lng };
}

function getMapBusinesses(businesses: Business[]): MapBusiness[] {
  return businesses
    .map((business) => {
      const mapLocation = getBusinessLocation(business);

      if (!mapLocation) {
        return null;
      }

      return {
        ...business,
        mapLocation,
      };
    })
    .filter((business): business is MapBusiness => business !== null);
}

function getCenter(mapBusinesses: MapBusiness[]) {
  if (mapBusinesses.length === 0) {
    return {
      lat: 41.0082,
      lng: 28.9784,
    };
  }

  const total = mapBusinesses.reduce(
    (acc, business) => ({
      lat: acc.lat + business.mapLocation.lat,
      lng: acc.lng + business.mapLocation.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: total.lat / mapBusinesses.length,
    lng: total.lng / mapBusinesses.length,
  };
}

function normalizeExternalUrl(url?: string) {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://${url}`;
}

export function ResultsMap({ businesses }: ResultsMapProps) {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<MapBusiness | null>(
    null
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
  });

  const mapBusinesses = useMemo(
    () => getMapBusinesses(businesses),
    [businesses]
  );

  const center = useMemo(() => getCenter(mapBusinesses), [mapBusinesses]);

  const fitMapToMarkers = useCallback(
    (map: google.maps.Map) => {
      if (mapBusinesses.length === 0) return;

      const bounds = new window.google.maps.LatLngBounds();

      mapBusinesses.forEach((business) => {
        bounds.extend(business.mapLocation);
      });

      map.fitBounds(bounds);

      if (mapBusinesses.length === 1) {
        map.setZoom(15);
      }
    },
    [mapBusinesses]
  );

  const renderMap = (heightClassName: string) => {
    if (!apiKey) {
      return (
        <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl bg-amber-50 px-6 text-center">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Google Maps API key bulunamadı.
            </p>

            <p className="mt-1 text-xs text-amber-700">
              frontend/.env.local içine NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ekleyin.
            </p>
          </div>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl bg-red-50 px-6 text-center">
          <div>
            <p className="text-sm font-semibold text-red-700">
              Google Maps yüklenemedi.
            </p>

            <p className="mt-1 text-xs text-red-600">
              API key, Maps JavaScript API veya localhost restriction ayarlarını
              kontrol edin.
            </p>
          </div>
        </div>
      );
    }

    if (!isLoaded) {
      return (
        <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
          Harita yükleniyor...
        </div>
      );
    }

    if (mapBusinesses.length === 0) {
      return (
        <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl bg-slate-50 px-6 text-center">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Harita için konum verisi bulunamadı.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Backend sonuçlarında lat/lng bilgisi geldiğinde işletmeler burada
              görünecek.
            </p>
          </div>
        </div>
      );
    }

    return (
      <GoogleMap
        mapContainerClassName={`w-full rounded-2xl ${heightClassName}`}
        center={center}
        zoom={12}
        onLoad={fitMapToMarkers}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {mapBusinesses.map((business) => (
          <Marker
            key={`${business.id || business.name}-${business.mapLocation.lat}-${business.mapLocation.lng}`}
            position={business.mapLocation}
            title={business.name}
            onClick={() => setSelectedBusiness(business)}
          />
        ))}

        {selectedBusiness && (
          <InfoWindow
            position={selectedBusiness.mapLocation}
            onCloseClick={() => setSelectedBusiness(null)}
          >
            <div className="max-w-[240px] text-sm">
              <p className="font-semibold text-slate-900">
                {selectedBusiness.name}
              </p>

              {selectedBusiness.address && (
                <p className="mt-1 text-xs text-slate-500">
                  {selectedBusiness.address}
                </p>
              )}

              {selectedBusiness.phone && (
                <p className="mt-2 text-xs font-medium text-slate-700">
                  {selectedBusiness.phone}
                </p>
              )}

              {selectedBusiness.googleMapsUrl && (
                <a
                  href={normalizeExternalUrl(selectedBusiness.googleMapsUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Google Maps’te Aç
                </a>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    );
  };

  return (
    <>
      <Card className="rounded-3xl bg-white">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle className="text-base font-semibold text-slate-900">
            Haritada Sonuçlar
          </CardTitle>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreenOpen(true)}
            className="rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            Tam ekranda aç
          </Button>
        </CardHeader>

        <CardContent>{renderMap("h-[200px]")}</CardContent>
      </Card>

      {isFullscreenOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-6 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-7xl flex-col rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Haritada Sonuçlar
                </h2>

                <p className="text-sm text-slate-500">
                  {mapBusinesses.length} konum gösteriliyor.
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
              {renderMap("h-full min-h-[520px]")}
            </div>
          </div>
        </div>
      )}
    </>
  );
}