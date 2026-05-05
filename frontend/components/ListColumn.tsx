"use client";

import { useState } from "react";
import type { LeadItem, LeadStatus } from "@/types/business";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_BASE_URL = "http://localhost:5000";

type LeadType = "phone" | "email" | "instagram";

type ListColumnProps = {
  title: string;
  items: LeadItem[];
  type: LeadType;
};

type LeadItemWithId = LeadItem & {
  id?: number;
};

function getStatusClassName(status: LeadStatus) {
  if (status === "approved") {
    return "border-emerald-100 bg-emerald-50/80 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-red-100 bg-red-50/80 text-red-700";
  }

  return "border-orange-100 bg-orange-50/80 text-orange-700";
}

function getItemKey(item: LeadItem, type: LeadType) {
  const itemWithId = item as LeadItemWithId;

  if (itemWithId.id) {
    return `${type}-${itemWithId.id}`;
  }

  return `${type}-${item.businessName}-${item.value}`;
}

export function ListColumn({ title, items, type }: ListColumnProps) {
  const [localStatuses, setLocalStatuses] = useState<Record<string, LeadStatus>>(
    {}
  );

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

  const handleStatusChange = async (
    item: LeadItem,
    itemKey: string,
    currentStatus: LeadStatus,
    nextStatus: LeadStatus
  ) => {
    const itemWithId = item as LeadItemWithId;

    if (!itemWithId.id) {
      alert(
        "Bu kayıtta backend id bulunamadı. Önce arama sonucunun id gönderdiğini kontrol etmeliyiz."
      );
      return;
    }

    setLocalStatuses((prev) => ({
      ...prev,
      [itemKey]: nextStatus,
    }));

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/businesses/${itemWithId.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Firma durumu güncellenemedi.");
      }
    } catch (error) {
      console.error("Status update error:", error);

      setLocalStatuses((prev) => ({
        ...prev,
        [itemKey]: currentStatus,
      }));

      alert("Firma durumu güncellenirken hata oluştu.");
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-slate-800">
          {title}
        </CardTitle>

        <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
          {items.length}
        </Badge>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Sonuç bulunamadı.
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const itemKey = getItemKey(item, type);
              const currentStatus =
                localStatuses[itemKey] || item.status || "pending";

              return (
                <div
                  key={itemKey}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-100 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="break-all font-semibold text-slate-900">
                        {item.value}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {item.businessName}
                      </p>

                      {item.address && (
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                          {item.address}
                        </p>
                      )}
                    </div>

                    <select
                      value={currentStatus}
                      onChange={(event) => {
                        const nextStatus = event.target.value as LeadStatus;

                        handleStatusChange(
                          item,
                          itemKey,
                          currentStatus,
                          nextStatus
                        );
                      }}
                      className={`h-8 min-w-[135px] rounded-xl border px-3 pr-7 text-xs font-medium shadow-sm outline-none transition focus:ring-2 focus:ring-emerald-100 ${getStatusClassName(
                        currentStatus
                      )}`}
                    >
                      <option
                        className="bg-white text-slate-700"
                        value="approved"
                      >
                        Onaylanan
                      </option>

                      <option
                        className="bg-white text-slate-700"
                        value="pending"
                      >
                        Bekleyen
                      </option>

                      <option
                        className="bg-white text-slate-700"
                        value="rejected"
                      >
                        Reddedilen
                      </option>
                    </select>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {item.source}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(item.value)}
                    >
                      Kopyala
                    </Button>

                    <Button
                      size="sm"
                      asChild
                      className="bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      <a
                        href={getHref(item.value, item.url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {getActionText()}
                      </a>
                    </Button>

                    {item.url && (
                      <Button variant="secondary" size="sm" asChild>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          Google Maps
                        </a>
                      </Button>
                    )}

                    {item.address && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(item.address || "")}
                      >
                        Adres Kopyala
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}