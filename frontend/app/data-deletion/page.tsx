"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DeletionRequest = {
  confirmationCode: string;
  status: string;
  notes: string;
  createdAt: string | null;
  completedAt: string | null;
};

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; request: DeletionRequest }
  | { kind: "error"; message: string };

const STATUS_LABELS: Record<string, string> = {
  received: "Alındı",
  processing: "İşleniyor",
  completed: "Tamamlandı",
  rejected: "Reddedildi",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("tr-TR");
  } catch {
    return value;
  }
}

export default function DataDeletionPage() {
  const searchParams = useSearchParams();
  const initialCode = searchParams?.get("code") || "";

  const [code, setCode] = useState(initialCode);
  const [state, setState] = useState<LookupState>({ kind: "idle" });

  const lookup = async (rawCode: string) => {
    const trimmed = rawCode.trim();

    if (!trimmed) {
      setState({
        kind: "error",
        message: "Lütfen geçerli bir onay kodu giriniz.",
      });
      return;
    }

    setState({ kind: "loading" });

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/data-deletion/${encodeURIComponent(trimmed)}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setState({
          kind: "error",
          message:
            data?.message ||
            "Bu onay kodu ile bir veri silme talebi bulunamadı.",
        });
        return;
      }

      setState({ kind: "found", request: data.request });
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Veri silme talebi sorgulanırken bir hata oluştu.",
      });
    }
  };

  useEffect(() => {
    if (initialCode) {
      void lookup(initialCode);
    }
  }, [initialCode]);

  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-emerald-200 hover:text-emerald-600"
            >
              ←
            </Link>

            <div className="flex flex-col items-end leading-none">
              <span className="text-2xl font-semibold tracking-tight text-slate-700 md:text-3xl">
                Jefedes<span className="text-emerald-500">.</span>
              </span>
              <span className="mt-1 text-xs font-medium tracking-wide text-slate-400 md:text-sm">
                Lead Flow
              </span>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-3xl text-center">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Veri Silme <span className="text-emerald-500">Talebi</span>
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
              Jefedes Lead Flow ve bağlı WhatsApp Business / Meta platformu
              üzerinden işlediğimiz verilerinizin silinmesini talep edebilir,
              talebinizin durumunu bu sayfada onay kodunuzla
              sorgulayabilirsiniz.
            </p>
          </div>
        </header>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-8 p-6 leading-7 text-slate-600 md:p-8">
            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                1. Veri Silme Talebi Nasıl Oluşturulur?
              </h2>

              <p className="mt-3">
                Meta / Facebook hesabınız üzerinden Jefedes uygulamasıyla
                ilişkili verilerinizin silinmesini talep edebilirsiniz:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  Facebook profilinizden{" "}
                  <span className="font-medium text-slate-800">
                    Settings &amp; Privacy → Settings → Apps and Websites
                  </span>{" "}
                  sayfasına gidin.
                </li>
                <li>
                  İlgili uygulamayı seçin ve “Send Request” düğmesiyle veri
                  silme talebi gönderin.
                </li>
                <li>
                  Meta, talebinizi sunucumuza iletir; sistemimiz size bir onay
                  kodu (confirmation code) üretir ve bu sayfada talebinizin
                  durumunu görüntüleyebilmeniz için bir bağlantı döndürür.
                </li>
              </ul>

              <p className="mt-3">
                Alternatif olarak{" "}
                <a
                  href="mailto:contact@jefedejefes.com.tr"
                  className="font-medium text-emerald-600 underline-offset-4 hover:underline"
                >
                  contact@jefedejefes.com.tr
                </a>{" "}
                adresine ad-soyad, ilgili telefon numarası (WhatsApp üzerinden
                iletişim kuruldu ise) ve “veri silme talebi” konu başlığıyla
                e-posta göndererek de talebinizi iletebilirsiniz. Manuel
                taleplere 30 gün içinde dönüş yapılır.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                2. Hangi Veriler Silinir?
              </h2>

              <p className="mt-3">
                Onaylanan bir talep doğrultusunda, ilgili Facebook / Meta
                kullanıcı kimliği veya bizimle paylaşılan telefon numarasıyla
                eşleşen şu kayıtlar silinir veya anonimleştirilir:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  WhatsApp Business iletişim geçmişi (template gönderim
                  kayıtları, gelen yanıtlar, mesaj kimlikleri).
                </li>
                <li>
                  Lead listesi içinde bulunan işletme iletişim bilgileri ve
                  ilgili kullanıcı notları.
                </li>
                <li>Canlı destek / bilgi talebi kayıtları.</li>
              </ul>

              <p className="mt-3">
                Yasal yükümlülükler (örneğin elektronik ticaret veya vergi
                mevzuatı gereği saklanması zorunlu kayıtlar) nedeniyle bazı
                veriler silinemeyebilir; bu durumda red gerekçesi onay kodu
                sorgu sonucunda belirtilir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                3. Talep Durumunu Sorgula
              </h2>

              <p className="mt-3">
                Meta üzerinden ya da bizim dönüşümüzle aldığınız onay kodunu
                aşağıya girerek talebinizin güncel durumunu görüntüleyebilirsiniz.
              </p>

              <form
                className="mt-4 flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void lookup(code);
                }}
              >
                <Input
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Onay kodu (örn. a1b2c3d4e5f6...)"
                  className="h-10 flex-1 rounded-xl"
                  disabled={state.kind === "loading"}
                />

                <Button
                  type="submit"
                  disabled={state.kind === "loading"}
                  className="h-10 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  {state.kind === "loading" ? "Sorgulanıyor..." : "Sorgula"}
                </Button>
              </form>

              {state.kind === "error" && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {state.message}
                </div>
              )}

              {state.kind === "found" && (
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-sm">
                  <p>
                    <span className="font-medium text-slate-800">
                      Onay kodu:
                    </span>{" "}
                    <span className="font-mono text-slate-700">
                      {state.request.confirmationCode}
                    </span>
                  </p>

                  <p className="mt-1">
                    <span className="font-medium text-slate-800">Durum:</span>{" "}
                    <span className="font-medium text-emerald-700">
                      {STATUS_LABELS[state.request.status] ||
                        state.request.status}
                    </span>
                  </p>

                  <p className="mt-1">
                    <span className="font-medium text-slate-800">
                      Talep tarihi:
                    </span>{" "}
                    {formatDate(state.request.createdAt)}
                  </p>

                  <p className="mt-1">
                    <span className="font-medium text-slate-800">
                      Tamamlanma tarihi:
                    </span>{" "}
                    {formatDate(state.request.completedAt)}
                  </p>

                  {state.request.notes && (
                    <p className="mt-3 text-slate-600">
                      <span className="font-medium text-slate-800">Not:</span>{" "}
                      {state.request.notes}
                    </p>
                  )}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                4. İletişim
              </h2>

              <p className="mt-3">
                Veri silme süreciyle ilgili soru veya itirazlarınızı aşağıdaki
                kanaldan iletebilirsiniz.
              </p>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                <p>
                  <span className="font-medium text-slate-800">
                    Proje adı:
                  </span>{" "}
                  Jefedes Lead Flow
                </p>

                <p className="mt-1">
                  <span className="font-medium text-slate-800">E-posta:</span>{" "}
                  contact@jefedejefes.com.tr
                </p>

                <p className="mt-1">
                  <span className="font-medium text-slate-800">Adres:</span>{" "}
                  GALA BİLİŞİM, Zafer, 185. Sk. BABACAN PREMİUM SİT C BLOK NO:4A
                  D:14, 34513 Esenyurt/İstanbul
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
