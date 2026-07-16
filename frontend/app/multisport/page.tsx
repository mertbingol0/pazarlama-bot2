"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Phone } from "lucide-react";

import {
  getMultisportBusinesses,
  type MultisportBusiness,
} from "@/lib/api";
import type { Business, WhatsAppStatus } from "@/types/business";
import { WhatsAppBusinessPanel } from "@/components/WhatsAppBusinessPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 100;

function isTemplateSent(b: MultisportBusiness) {
  return Boolean(b.templateSentAt) || b.whatsappStatus !== "not_sent";
}

// WhatsAppBusinessPanel'in beklediği Business şekline dönüştür.
function toBusiness(b: MultisportBusiness): Business {
  return {
    id: b.id,
    name: b.name || "",
    phone: b.phone || undefined,
    address: b.address || undefined,
    website: b.website || undefined,
    whatsappStatus: b.whatsappStatus as WhatsAppStatus,
    templateSentAt: b.templateSentAt,
    source: "multisport",
  };
}

export default function MultisportPage() {
  const [businesses, setBusinesses] = useState<MultisportBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>("all");
  const [onlyWithPhone, setOnlyWithPhone] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const refresh = () =>
    getMultisportBusinesses()
      .then((list) => {
        setBusinesses(list);
        setLoadError(null);
      })
      .catch((error) =>
        setLoadError(
          error instanceof Error
            ? error.message
            : "Multisport işletmeleri getirilemedi."
        )
      );

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, []);

  const cities = useMemo(
    () =>
      [...new Set(businesses.map((b) => b.city).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b), "tr")
      ) as string[],
    [businesses]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    return businesses.filter((b) => {
      if (city !== "all" && b.city !== city) return false;
      if (onlyWithPhone && !b.phone) return false;
      if (!term) return true;
      return [b.name, b.address, b.district, b.phone]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("tr-TR").includes(term));
    });
  }, [businesses, search, city, onlyWithPhone]);

  const visible = filtered.slice(0, visibleCount);
  const selectableIds = useMemo(
    () => filtered.filter((b) => b.phone && !isTemplateSent(b)).map((b) => b.id),
    [filtered]
  );
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));

  const selectedBusinesses = useMemo(
    () => filtered.filter((b) => selectedIds.has(b.id)),
    [filtered, selectedIds]
  );

  // Panel'e verilen listeler (Business şekline map'lenmiş).
  const panelBusinesses = useMemo(() => filtered.map(toBusiness), [filtered]);
  const panelSelected = useMemo(
    () => selectedBusinesses.map(toBusiness),
    [selectedBusinesses]
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
  };

  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Multisport İşletmeleri
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Benefit Systems (Multisport) üyesi tesisler. Listeden firma seçip
            sağdaki panelden Multisport'a özel template gönderebilirsiniz.
          </p>
        </header>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            {/* Filtreler */}
            <Card className="mb-4 rounded-3xl bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.25)]">
              <CardContent className="flex flex-wrap items-end gap-3 pt-6">
                <div className="flex min-w-56 flex-1 flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    Ara
                  </label>
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    placeholder="İsim, ilçe, adres veya telefon..."
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="flex w-48 flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    İl
                  </label>
                  <Select
                    value={city}
                    onValueChange={(v) => {
                      setCity(v);
                      setVisibleCount(PAGE_SIZE);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm iller</SelectItem>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex h-10 items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={onlyWithPhone}
                    onChange={(e) => setOnlyWithPhone(e.target.checked)}
                  />
                  Sadece telefonu olanlar
                </label>
              </CardContent>
            </Card>

            <Card className="rounded-3xl bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.25)]">
              <CardContent className="pt-6">
                {isLoading ? (
                  <p className="py-10 text-center text-sm text-slate-500">
                    Yükleniyor...
                  </p>
                ) : loadError ? (
                  <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                    {loadError}
                  </div>
                ) : (
                  <>
                    <p className="mb-3 text-xs text-slate-500">
                      {filtered.length} işletme
                      {filtered.length !== businesses.length
                        ? ` (toplam ${businesses.length})`
                        : ""}{" "}
                      — {selectableIds.length} tanesine template gönderilebilir
                      {selectedIds.size > 0 ? ` — ${selectedIds.size} seçili` : ""}
                    </p>

                    <div className="overflow-x-auto rounded-xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2.5">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300"
                                checked={allSelected}
                                onChange={toggleSelectAll}
                                title="Filtredeki gönderilebilir firmaların tümünü seç"
                              />
                            </th>
                            <th className="px-3 py-2.5 font-medium">İşletme</th>
                            <th className="px-3 py-2.5 font-medium">Konum</th>
                            <th className="px-3 py-2.5 font-medium">Telefon</th>
                            <th className="px-3 py-2.5 font-medium">Durum</th>
                            <th className="px-3 py-2.5 font-medium">Sayfa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visible.map((b) => {
                            const sent = isTemplateSent(b);
                            const selectable = Boolean(b.phone) && !sent;
                            return (
                              <tr key={b.id} className="hover:bg-slate-50/60">
                                <td className="px-3 py-2.5">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 disabled:opacity-30"
                                    disabled={!selectable}
                                    checked={selectedIds.has(b.id)}
                                    onChange={() => toggleSelect(b.id)}
                                  />
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="font-medium text-slate-900">
                                    {b.name || "—"}
                                  </div>
                                  {b.address && (
                                    <div className="max-w-xs truncate text-xs text-slate-400">
                                      {b.address}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">
                                  {[b.city, b.district]
                                    .filter(Boolean)
                                    .join(" / ") || "—"}
                                </td>
                                <td className="px-3 py-2.5">
                                  {b.phone ? (
                                    <a
                                      href={`tel:${b.phone}`}
                                      className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                                    >
                                      <Phone className="h-3.5 w-3.5" />
                                      {b.phone}
                                    </a>
                                  ) : (
                                    <span className="text-slate-400">Yok</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  {sent ? (
                                    <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                                      Gönderildi
                                    </span>
                                  ) : b.phone ? (
                                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                      Gönderilebilir
                                    </span>
                                  ) : (
                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                                      Telefon yok
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  {b.website && (
                                    <a
                                      href={b.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-slate-400 hover:text-emerald-600"
                                      title="Benefit sayfası"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {filtered.length > visibleCount && (
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                        >
                          Daha fazla göster ({filtered.length - visibleCount}{" "}
                          kaldı)
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mesaj gönderim paneli */}
          <div className="xl:sticky xl:top-6">
            <WhatsAppBusinessPanel
              businesses={panelBusinesses}
              selectedBusinesses={panelSelected}
              selectedPhoneCount={selectedBusinesses.filter((b) => b.phone).length}
              onClearSelections={() => setSelectedIds(new Set())}
              onTemplateSent={() => {
                setSelectedIds(new Set());
                void refresh();
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
