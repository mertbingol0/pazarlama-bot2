import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsOfServicePage() {
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
              Hizmet <span className="text-emerald-500">Şartları</span>
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
              Jefedes Lead Flow platformunun kullanım koşulları, kullanıcı
              yükümlülükleri ve hizmet kapsamı hakkında bilgilendirme.
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
                Jefedes Lead Flow platformuna (“Platform”) hoş geldiniz. Bu
                Hizmet Şartları, Platform’u kullanan kişi ve kuruluşlar
                (“Kullanıcı”) ile Platform sağlayıcı arasındaki hak ve
                yükümlülükleri düzenler. Platform’u kullanmaya başlayarak bu
                şartları okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan
                etmiş sayılırsınız. Şartları kabul etmiyorsanız Platform’u
                kullanmamalısınız.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                1. Hizmetin Tanımı
              </h2>

              <p className="mt-3">
                Jefedes Lead Flow; kategori, il ve ilçe bilgisine göre Google
                Places üzerinden işletme arama, çıkan işletmelerin iletişim
                bilgilerini görüntüleme, WhatsApp Business Platform üzerinden
                onaylı template mesaj gönderimi, gelen yanıtların
                sınıflandırılması, canlı destek talepleri ve lead durumu
                (beklemede / onaylandı / reddedildi) takibi gibi pazarlama ve
                müşteri iletişim süreçlerini yönetmeye yönelik bir araçtır.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                2. Hesap ve Erişim
              </h2>

              <p className="mt-3">
                Platform’a erişim, yönetici tarafından oluşturulmuş kullanıcı
                hesapları aracılığıyla sağlanır. Kullanıcı, kendisine tahsis
                edilen kullanıcı adı ve şifreyi gizli tutmakla, üçüncü kişilerle
                paylaşmamakla ve bu bilgilerle yapılan tüm işlemlerden sorumlu
                olmakla yükümlüdür. Yetkisiz bir erişim veya hesap ihlali tespit
                edildiğinde Kullanıcı, durumu derhâl Platform sağlayıcıya
                bildirmekle yükümlüdür.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                3. Kabul Edilebilir Kullanım
              </h2>

              <p className="mt-3">
                Kullanıcı Platform’u yalnızca yürürlükteki yasalara,
                yönetmeliklere ve bu Hizmet Şartları’na uygun şekilde
                kullanmayı kabul eder. Özellikle aşağıdaki davranışlar yasaktır:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  Spam, taciz, dolandırıcılık veya yanıltıcı içerikler yaymak
                  amacıyla Platform’u kullanmak.
                </li>
                <li>
                  WhatsApp, Meta, Google ve diğer üçüncü taraf hizmet
                  sağlayıcıların kullanım koşullarını ihlal eden mesaj veya
                  içerik göndermek.
                </li>
                <li>
                  İletişim almak istemediğini açıkça belirten (örneğin
                  “ilgilenmiyorum” yanıtı veren) işletmelere tekrar mesaj
                  göndermek.
                </li>
                <li>
                  Platform’un teknik altyapısını manipüle etmek, tersine
                  mühendislik yapmak veya yetkisiz erişim sağlamaya çalışmak.
                </li>
                <li>
                  Toplanan verileri Platform’un amacı dışında üçüncü taraflara
                  satmak veya devretmek.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                4. WhatsApp Business ve Mesaj Gönderim Politikası
              </h2>

              <p className="mt-3">
                Platform üzerinden gönderilen ilk iletişim mesajları, Meta
                tarafından onaylanmış WhatsApp template mesajları aracılığıyla
                gönderilir. Manuel mesaj gönderimi, yalnızca işletmenin daha
                önce yanıt verdiği veya “daha sonra dönüş yapın” durumunda
                bulunan kayıtlarda mümkündür. Kullanıcı, WhatsApp Business
                Platform politikalarına, Meta Ticari Mesajlaşma Politikası’na
                ve ilgili yerel mevzuata uymakla yükümlüdür. Politika
                ihlallerinden doğan WhatsApp / Meta tarafındaki yaptırımların
                sorumluluğu Kullanıcı’ya aittir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                5. Üçüncü Taraf Hizmetler
              </h2>

              <p className="mt-3">
                Platform; Google Places / Google Maps API’leri, WhatsApp
                Business Platform (Meta) ve sistem altyapısının çalışması için
                gerekli teknik servisler gibi üçüncü taraf hizmetlerini
                kullanır. Bu hizmetlerin erişilebilirliği, hız sınırları,
                kotaları veya kullanım şartlarındaki değişiklikler Platform’un
                ilgili özelliklerini etkileyebilir. Bu üçüncü taraf hizmetlerin
                kullanım koşulları, kullanıldıkları ölçüde Kullanıcı’yı da
                bağlar.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                6. Veri ve Lead Yönetimi
              </h2>

              <p className="mt-3">
                Platform; işletme adı, adres, telefon numarası, web sitesi,
                Google Maps bağlantısı, kategori, il, ilçe, WhatsApp iletişim
                durumu, template gönderim durumu, gelen yanıtlar, canlı destek
                talepleri ve kullanıcı notları gibi verileri işleyebilir ve
                saklayabilir. Bu verilerin işlenmesi, saklanması, paylaşımı ve
                veri sahibi hakları için{" "}
                <Link
                  href="/privacy-policy"
                  className="font-medium text-emerald-600 underline-offset-4 hover:underline"
                >
                  Gizlilik Politikası
                </Link>{" "}
                geçerlidir.
              </p>

              <p className="mt-3">
                Kullanıcı, Platform üzerinde işlediği kişisel verilerin
                hukuka uygun şekilde elde edilmesinden, ilgili kişilerin
                aydınlatılmasından ve gerektiğinde açık rızanın
                sağlanmasından kendisi sorumludur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                7. Hizmet Sürekliliği ve Değişiklikler
              </h2>

              <p className="mt-3">
                Platform sağlayıcı; Platform’un özelliklerini, arayüzünü, veri
                modelini veya altyapısını önceden bildirimde bulunmaksızın
                değiştirme, sınırlama veya sonlandırma hakkını saklı tutar.
                Bakım, güncelleme veya üçüncü taraf hizmet kesintileri
                nedeniyle Platform’a erişim geçici olarak kısıtlanabilir.
                Platform sağlayıcı, kesintisiz ve hatasız bir hizmet sunma
                konusunda garanti vermez.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                8. Sorumluluğun Sınırlandırılması
              </h2>

              <p className="mt-3">
                Platform “olduğu gibi” ve “mevcut olduğu hâliyle” sunulur.
                Platform sağlayıcı; ticari elverişlilik, belirli bir amaca
                uygunluk veya kesintisizlik dâhil hiçbir açık veya zımni
                garanti vermez. Yürürlükteki mevzuatın izin verdiği azami
                ölçüde, Platform’un kullanımı veya kullanılamamasından doğan
                doğrudan, dolaylı, arızi, özel veya cezai zararlardan Platform
                sağlayıcı sorumlu tutulamaz.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                9. Fikrî Mülkiyet
              </h2>

              <p className="mt-3">
                Platform’un yazılımı, arayüzü, logosu, marka unsurları ve tüm
                içeriği Platform sağlayıcıya aittir ve fikrî mülkiyet
                mevzuatıyla korunur. Kullanıcı’ya yalnızca bu Hizmet Şartları
                kapsamında, Platform’u amaca uygun kullanmak için sınırlı,
                münhasır olmayan ve devredilemez bir kullanım hakkı tanınır.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                10. Hesabın Askıya Alınması ve Sonlandırılması
              </h2>

              <p className="mt-3">
                Platform sağlayıcı; bu Hizmet Şartları’na, uygulanabilir
                yasalara, WhatsApp / Meta politikalarına veya kabul edilebilir
                kullanım kurallarına aykırı davranıldığını tespit ettiği
                durumlarda Kullanıcı’nın hesabını geçici olarak askıya alma,
                kısıtlama veya kalıcı olarak kapatma hakkını saklı tutar.
                Hesabın sonlandırılması, sonlandırma anına kadar oluşmuş hak ve
                yükümlülükleri ortadan kaldırmaz.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                11. Uygulanacak Hukuk ve Yetkili Mahkeme
              </h2>

              <p className="mt-3">
                Bu Hizmet Şartları Türkiye Cumhuriyeti mevzuatına tabidir.
                Şartlardan doğabilecek uyuşmazlıklarda İstanbul Mahkemeleri ve
                İcra Daireleri yetkilidir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                12. Şartlarda Değişiklik
              </h2>

              <p className="mt-3">
                Bu Hizmet Şartları zaman zaman güncellenebilir. Güncellenen
                metin bu sayfada yayınlandığı tarihten itibaren geçerli olur.
                Önemli değişikliklerde Kullanıcı’ya makul yöntemlerle
                bildirimde bulunulabilir. Kullanıcı’nın güncel metni düzenli
                olarak gözden geçirmesi tavsiye edilir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">
                13. İletişim
              </h2>

              <p className="mt-3">
                Hizmet Şartları veya Platform’un kullanımı hakkında sorularınız
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
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
