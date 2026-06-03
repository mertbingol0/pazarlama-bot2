"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { API_BASE_URL, readJsonResponse } from "@/lib/api";
import { PageNavigation } from "@/components/PageNavigation";
import { SocialChip } from "@/components/contact-icons";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ReportRecord = {
  id: string | number;
  businessName?: string | null;
  phone?: string | null;
  email?: string | null;
  socials?: string | null;
  address?: string | null;
  website?: string | null;
  createdAt?: string | null;
  status?: string;
  buttonText?: string;
};

type ReportCategoryKey =
  | "interested"
  | "approved"
  | "followUp"
  | "notInterested";

type ReportResponse = {
  success: boolean;
  message?: string;
  error?: string;
  range: { from: string; to: string };
  stats: Record<ReportCategoryKey, number>;
  categories: Record<ReportCategoryKey, ReportRecord[]>;
};

const COLUMNS: {
  key: ReportCategoryKey;
  title: string;
  description: string;
  headerClass: string;
  countClass: string;
}[] = [
  {
    key: "interested",
    title: "İlgilenenler",
    description: "Bilgi almak isteyenler",
    headerClass: "text-emerald-700",
    countClass: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "approved",
    title: "Kayıt Oluşturanlar",
    description: "Onaylanan işletmeler",
    headerClass: "text-sky-700",
    countClass: "bg-sky-50 text-sky-700",
  },
  {
    key: "followUp",
    title: "Daha Sonra Dönecekler",
    description: "Sonra aranacaklar",
    headerClass: "text-amber-700",
    countClass: "bg-amber-50 text-amber-700",
  },
  {
    key: "notInterested",
    title: "İlgilenmeyenler",
    description: "Görüşmeyi sonlandıranlar",
    headerClass: "text-red-700",
    countClass: "bg-red-50 text-red-700",
  },
];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function splitSocialLinks(socials?: string | null) {
  return String(socials || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function csvEscape(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadReportCsv(report: ReportResponse) {
  const header = [
    "Kategori",
    "İşletme Adı",
    "Telefon",
    "E-posta",
    "Sosyal Medya",
    "Adres",
    "Website",
    "Tarih",
  ];

  const rows: string[][] = [header];

  const appendCategory = (label: string, records: ReportRecord[]) => {
    records.forEach((record) => {
      rows.push([
        label,
        record.businessName || "",
        record.phone ? `="${String(record.phone).replaceAll('"', '""')}"` : "",
        record.email || "",
        record.socials || "",
        record.address || "",
        record.website || "",
        record.createdAt || "",
      ]);
    });
  };

  appendCategory("İlgilenen", report.categories.interested);
  appendCategory("Kayıt Oluşturan (Onaylanan)", report.categories.approved);
  appendCategory("Daha Sonra Dönecek", report.categories.followUp);
  appendCategory("İlgilenmeyen", report.categories.notInterested);

  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => (String(cell).startsWith('="') ? cell : csvEscape(String(cell))))
        .join(";")
    )
    .join("\r\n");

  const blob = new Blob(["﻿" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `rapor-${report.range.from}_${report.range.to}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [from, setFrom] = useState(isoDate(monthAgo));
  const [to, setTo] = useState(isoDate(today));
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/reports?from=${from}&to=${to}`
      );

      const data = await readJsonResponse<ReportResponse>(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Rapor oluşturulamadı.");
      }

      setReport(data);
    } catch (error) {
      console.error("Rapor alınamadı:", error);
      setReport(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Rapor oluşturulamadı."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // İlk açılışta varsayılan aralık (son 30 gün) için raporu getir.
  useEffect(() => {
    void fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderRecordCard = (record: ReportRecord) => {
    const socialLinks = splitSocialLinks(record.socials);
    const normalizedPhone = String(record.phone || "").replace(/\D/g, "");

    return (
      <div
        key={String(record.id)}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-100 hover:shadow-md"
      >
        <p className="break-words text-base font-semibold text-slate-900">
          {record.businessName || "İşletme eşleştirilemedi"}
        </p>

        {record.phone && (
          <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
              Telefon
            </span>
            <span className="break-all text-sm font-semibold text-emerald-900">
              {record.phone}
            </span>
          </div>
        )}

        {record.email && (
          <p className="mt-2 break-all text-sm text-slate-600">
            <span className="font-medium text-slate-400">E-posta: </span>
            {record.email}
          </p>
        )}

        {socialLinks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {socialLinks.map((link) => (
              <SocialChip key={link} url={link} />
            ))}
          </div>
        )}

        {record.address && (
          <p className="mt-2 text-xs leading-5 text-slate-400">
            {record.address}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            {formatDate(record.createdAt)}
          </span>

          {normalizedPhone && (
            <a
              href={`https://wa.me/${normalizedPhone}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              WhatsApp’ta Aç
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
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
              Rapor<span className="text-emerald-500">lar</span>
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
              Belirli tarih aralığındaki ilgilenenler, kayıt oluşturanlar, daha
              sonra dönecekler ve ilgilenmeyenlerin raporunu görüntüleyin ve CSV
              olarak indirin.
            </p>
          </div>
        </header>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Başlangıç
                </label>
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(event) => setFrom(event.target.value)}
                  className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Bitiş
                </label>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(event) => setTo(event.target.value)}
                  className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <Button
                type="button"
                onClick={() => void fetchReport()}
                disabled={isLoading}
                className="h-10 rounded-xl bg-emerald-500 px-5 text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                {isLoading ? "Hazırlanıyor..." : "Rapor Oluştur"}
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => report && downloadReportCsv(report)}
              disabled={!report}
              className="h-10 rounded-xl"
            >
              Tüm Raporu CSV İndir
            </Button>
          </CardContent>
        </Card>

        {errorMessage && (
          <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {report && (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COLUMNS.map((column) => (
                <Card
                  key={column.key}
                  className="rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">{column.title}</p>
                    <p
                      className={`mt-2 text-3xl font-semibold ${column.headerClass}`}
                    >
                      {report.stats[column.key]}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="mt-6 grid items-start gap-4 lg:grid-cols-4">
              {COLUMNS.map((column) => {
                const records = report.categories[column.key] || [];

                return (
                  <Card
                    key={column.key}
                    className="rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle
                            className={`text-base font-semibold ${column.headerClass}`}
                          >
                            {column.title}
                          </CardTitle>
                          <p className="mt-1 text-xs text-slate-400">
                            {column.description}
                          </p>
                        </div>

                        <Badge className={`rounded-full ${column.countClass}`}>
                          {records.length}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {records.length === 0 ? (
                        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                          Bu aralıkta kayıt yok.
                        </p>
                      ) : (
                        records.map(renderRecordCard)
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
