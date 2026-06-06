import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:text-emerald-600"
            >
              ←
            </Link>

            <Link
              href="/"
              aria-label="Ana sayfaya git"
              className="flex flex-col items-end leading-none"
            >
              <span className="text-2xl font-semibold tracking-tight text-slate-700 md:text-3xl">
                Jefedes<span className="text-emerald-500">.</span>
              </span>
              <span className="mt-1 text-xs font-medium tracking-wide text-slate-400 md:text-sm">
                Lead Flow
              </span>
            </Link>
          </div>

          <div className="mx-auto mt-8 max-w-3xl text-center">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Veri Silme <span className="text-emerald-500">Talebi</span>
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
              Jefedes Lead Flow üzerinde işlediğimiz verilerinizin silinmesini
              talep etme yöntemleri ve süreciyle ilgili bilgilendirme.
            </p>
          </div>
        </header>

        <Card className="rounded-3xl bg-white shadow-sm">
          <CardContent className="space-y-8 p-6 leading-7 text-slate-600 md:p-8">
            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                1. Veri Silme Talebini Nasıl İletirsiniz?
              </h2>

              <p className="mt-3">
                Verilerinizin silinmesini istemek için aşağıdaki yöntemlerden
                birini kullanabilirsiniz:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  <span className="font-medium text-slate-800">E-posta:</span>{" "}
                  <a
                    href="mailto:contact@jefedejefes.com.tr?subject=Veri%20Silme%20Talebi"
                    className="font-medium text-emerald-600 underline-offset-4 hover:underline"
                  >
                    contact@jefedejefes.com.tr
                  </a>{" "}
                  adresine “Veri Silme Talebi” konusuyla, ad-soyad ve bizimle
                  iletişim kurulan telefon numaranızı belirterek e-posta
                  gönderin.
                </li>
                <li>
                  <span className="font-medium text-slate-800">WhatsApp:</span>{" "}
                  Tarafınıza ulaşan WhatsApp mesajına “İlgilenmiyorum” yanıtı
                  vererek iletişim listemizden çıkarılmayı talep edebilirsiniz.
                </li>
                <li>
                  <span className="font-medium text-slate-800">
                    Meta / Facebook üzerinden:
                  </span>{" "}
                  Facebook profilinizden Settings &amp; Privacy → Settings →
                  Apps and Websites bölümüne girip ilgili uygulamayı kaldırıp
                  “Send Request” seçeneğiyle veri silme talebi gönderebilirsiniz.
                  Talebiniz tarafımıza ulaştığında manuel olarak değerlendirilir
                  ve aynı e-posta üzerinden dönüş yapılır.
                </li>
              </ul>

              <p className="mt-3">
                Talepleriniz, ulaştığı tarihten itibaren en geç 30 gün içinde
                sonuçlandırılır.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                2. Hangi Veriler Silinir?
              </h2>

              <p className="mt-3">
                Onaylanan bir talep doğrultusunda, sizinle eşleşen şu kayıtlar
                silinir veya anonimleştirilir:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  WhatsApp Business iletişim geçmişi (template gönderim
                  kayıtları, gelen yanıtlar, mesaj kimlikleri).
                </li>
                <li>
                  Lead listesinde bulunan işletme iletişim bilgileri ve ilgili
                  kullanıcı notları.
                </li>
                <li>Canlı destek veya bilgi talebi kayıtları.</li>
              </ul>

              <p className="mt-3">
                Yasal yükümlülükler (örneğin elektronik ticaret veya vergi
                mevzuatı gereği saklanması zorunlu kayıtlar) nedeniyle bazı
                veriler silinemeyebilir; bu durumda red gerekçesi e-posta ile
                tarafınıza iletilir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                3. İletişim
              </h2>

              <p className="mt-3">
                Veri silme süreciyle ilgili soru veya itirazlarınızı aşağıdaki
                kanaldan iletebilirsiniz.
              </p>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
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
