import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
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
              Gizlilik <span className="text-emerald-500">Politikası</span>
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
              Jefedes Lead Flow platformunda işlenen veriler, WhatsApp Business
              iletişim süreçleri ve kullanıcı hakları hakkında bilgilendirme.
            </p>
          </div>
        </header>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-8 p-6 leading-7 text-slate-600 md:p-8">
            <section>
              <p className="text-sm text-slate-400">
                Son güncelleme tarihi: 2026
              </p>

              <p className="mt-4">
                Jefedes Lead Flow olarak kullanıcılarımızın ve iletişime
                geçtiğimiz işletmelerin gizliliğine önem veriyoruz. Bu Gizlilik
                Politikası, Jefedes Lead Flow platformu üzerinden hangi
                verilerin toplandığını, bu verilerin hangi amaçlarla
                kullanıldığını, nasıl saklandığını ve kullanıcıların verileri
                üzerindeki haklarını açıklamak amacıyla hazırlanmıştır.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                1. Toplanan Bilgiler
              </h2>

              <p className="mt-3">
                Jefedes Lead Flow, potansiyel müşteri yönetimi ve işletme
                iletişim süreçlerini kolaylaştırmak amacıyla bazı bilgileri
                işleyebilir. Bu bilgiler işletme adı, işletme adresi, telefon
                numarası, web sitesi bağlantısı, Google Maps bağlantısı,
                işletme kategorisi, il ve ilçe bilgisi, WhatsApp iletişim
                durumu, gönderilen template mesaj durumu, gelen WhatsApp
                yanıtları, kullanıcı notları ve canlı destek kayıtlarını
                içerebilir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                2. Bilgilerin Kullanım Amaçları
              </h2>

              <p className="mt-3">
                Toplanan bilgiler kategori ve konuma göre potansiyel
                işletmeleri listelemek, işletmelerin iletişim bilgilerini
                görüntülemek, pazarlama ve müşteri iletişim süreçlerini yönetmek,
                WhatsApp Business üzerinden template mesaj gönderimlerini takip
                etmek, işletmelerden gelen yanıtları sınıflandırmak, canlı
                destek veya bilgi talebi kayıtlarını yönetmek ve lead
                durumlarını takip etmek amacıyla kullanılabilir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                3. WhatsApp Business Kullanımı
              </h2>

              <p className="mt-3">
                Jefedes Lead Flow, işletmelerle iletişim kurmak için WhatsApp
                Business Platform özelliklerinden yararlanabilir. İlk iletişim
                mesajları, Meta tarafından onaylanmış WhatsApp template
                mesajları aracılığıyla gönderilebilir. Bir işletme bu mesaja
                yanıt verdiğinde, yanıt türü sistem tarafından işlenebilir.
              </p>

              <p className="mt-3">
                Örneğin, “Bilgi almak istiyorum” yanıtı ilgili telefon
                numarasının canlı destek veya bilgi talebi listesine eklenmesine
                neden olabilir. “İlgilenmiyorum” yanıtı ise ilgili işletmeye
                tekrar template veya manuel mesaj gönderilmemesi için
                kullanılabilir. Jefedes Lead Flow, WhatsApp üzerinden alınan
                yanıtları yalnızca iletişim takibi ve müşteri yönetimi amacıyla
                kullanır.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                4. Verilerin Saklanması
              </h2>

              <p className="mt-3">
                Toplanan veriler sistemin çalışması, iletişim geçmişinin takip
                edilmesi ve lead yönetiminin sürdürülebilmesi için saklanabilir.
                Saklanan veriler işletme iletişim bilgileri, WhatsApp mesaj
                durumu, yanıt türü, canlı destek kayıtları, kullanıcı notları ve
                lead durumlarını içerebilir.
              </p>

              <p className="mt-3">
                Kullanıcılar sistemde yer alan bazı kayıtları temizleyebilir
                veya silebilir. Bu işlemler ilgili kayıtların sistem
                görünümünden kaldırılmasını sağlar.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                5. Verilerin Paylaşımı
              </h2>

              <p className="mt-3">
                Jefedes Lead Flow, topladığı verileri üçüncü taraflarla satmaz.
                Veriler yalnızca WhatsApp Business / Meta hizmetleri üzerinden
                mesaj gönderimi ve yanıt takibi, Google Maps veya Google Places
                gibi işletme arama ve konum hizmetleri ve sistem altyapısının
                çalışması için kullanılan teknik servisler kapsamında
                işlenebilir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                6. Kullanıcı Notları ve Takip Bilgileri
              </h2>

              <p className="mt-3">
                Platform kullanıcıları, işletmelerle ilgili notlar ekleyebilir.
                Bu notlar yalnızca lead takibi ve pazarlama sürecinin yönetimi
                amacıyla kullanılır. Kullanıcılar sistemde yer alan canlı destek
                kayıtlarını veya lead listelerini temizleyebilir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                7. Veri Güvenliği
              </h2>

              <p className="mt-3">
                Jefedes Lead Flow, işlenen verilerin yetkisiz erişime, kayba,
                kötüye kullanıma veya izinsiz değişikliğe karşı korunması için
                makul teknik ve idari önlemler almayı amaçlar. API anahtarları,
                erişim tokenları ve gizli yapılandırma bilgileri herkese açık
                şekilde paylaşılmamalıdır.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                8. İletişim Tercihleri ve Opt-Out
              </h2>

              <p className="mt-3">
                Bir işletme iletişim almak istemediğini belirtirse, bu tercih
                sistemde “ilgilenmiyor” veya benzeri bir durumla
                işaretlenebilir. Bu durumda ilgili işletmeye tekrar template
                veya manuel mesaj gönderilmemesi hedeflenir. İşletmeler,
                kendileriyle iletişim kurulmasını istemediklerini belirterek
                iletişim listesinden çıkarılmayı talep edebilir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                9. Kullanıcı Hakları
              </h2>

              <p className="mt-3">
                İlgili kişiler, geçerli mevzuat kapsamında kişisel verilerinin
                işlenip işlenmediğini öğrenme, işlenen verilere erişim talep
                etme, yanlış veya eksik verilerin düzeltilmesini isteme,
                verilerin silinmesini veya işlenmesinin sınırlandırılmasını
                talep etme ve belirli iletişim faaliyetlerinden çıkma talebinde
                bulunma haklarına sahip olabilir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                10. İletişim
              </h2>

              <p className="mt-3">
                Gizlilik Politikası veya veri işleme süreçleri hakkında sorular
                için bizimle iletişime geçebilirsiniz.
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

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                11. Politika Değişiklikleri
              </h2>

              <p className="mt-3">
                Bu Gizlilik Politikası zaman zaman güncellenebilir.
                Güncellemeler bu sayfada yayınlandığı tarihten itibaren geçerli
                olur. Kullanıcıların politikayı düzenli olarak kontrol etmesi
                önerilir.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}