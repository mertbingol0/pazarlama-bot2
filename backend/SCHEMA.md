# CRM Veritabanı Şeması

PostgreSQL + Drizzle ORM. Şema kaynağı: `schema.js` (tablolar + ilişkiler),
geçerli değer kümeleri: `dbConstants.js` (text alanlar zod ile doğrulanacak).
Migration'lar `migrations/` altında, backend açılışında otomatik uygulanır.

## Roller ve Birimler

- `users.role`: **admin** | **personnel**
  - **admin**: tüm kullanıcıların anlık aktivitelerini izler, genel rapor/analitik
    alır, yeni kullanıcı oluşturur. (Veri girişi yapmaz.)
  - **personnel**: işletme sorgular, görüşme yapar/kaydeder, durum/not ekler.
    Yetkiler aynı; yalnızca **birim** (`team`) farklıdır.
- `users.team`: **saha_pazarlama** | **reklam_pazarlama** | **cagri_merkezi**
  - Birim; atama, filtreleme, raporlama ve "hangi birim iletişime geçti" için
    birinci sınıf alandır. Farklı birimlerdeki personel ayırt edilebilir.

## Tablolar

| Tablo | Amaç |
|------|------|
| `users` | Admin + birim personelleri. role, team, isActive, createdBy (admin), lastLoginAt. |
| `searches` | Sorgu önbelleği (lokalizasyon). Aynı kategori+il+ilçe ikinci kez API'ye gitmez; DB'den okunur. createdBy, resultCount, lastFetchedAt. Tüm kullanıcılarca ortak. |
| `businesses` | Ortak işletme havuzu (sorgudan veya manuel). status (CRM süreci), assignedTo (takip eden personel), createdBy, addedManually, denormalize WhatsApp özeti. |
| `whatsapp_contacts` | WhatsApp'ta sohbet edilen kişiler (kişi bilgisi). phone (tekil), name, businessId, son mesaj özetleri, **lastContactedBy + lastContactedTeam** (sohbet listesinde son dokunan birim/personel). "+" ile aranır. |
| `whatsapp_messages` | Tüm mesaj geçmişi (giden+gelen). contactId, businessId, **senderUserId** (gönderen personel), status, readAt. |
| `interactions` | **Görüşme kayıtları** (CRM çekirdeği): channel (whatsapp/call/face_to_face/manual), outcome, note, **meetingAt** (outcome=to_meet ise), userId+team (yapan personel). İşletmesiz görüşmeler için contactName/contactPhone. |
| `business_notes` | İşletmeye eklenen serbest notlar (yazar userId+team, zaman). Tüm kullanıcılarca görülür. |
| `activity_log` | Tüm eylemlerin akışı. **Durum Takip** sayfası (aramalar, mesajlar, yüz yüze görüşmeler) + admin anlık izleme + analitik bu tablodan beslenir. action, entityType/entityId, metadata (jsonb). |
| `live_support_leads` | **LEGACY** — eski Express app içindir. Fastify geçişinde whatsapp_contacts + interactions'a taşınacak, sonra kaldırılacak. |

## Gereksinim → Tablo eşlemesi

- **Rol/birim tanımı, yeni personel** → `users` (role, team, createdBy)
- **Admin anlık izleme + log/analitik** → `activity_log`
- **Canlı destek: not + atanan personel + sonuç (+ to_meet ise tarih)** → `interactions` (note, userId, outcome, meetingAt)
- **WhatsApp "+" ile yerel numara/işletme arama** → `whatsapp_contacts` + `businesses`
- **WhatsApp mesaj + kişi bilgisi depolama** → `whatsapp_messages` + `whatsapp_contacts`
- **Sorgu önbelleği (ortak)** → `searches` + `businesses`
- **İşletme durumu (onay/ret) belirleme** → `businesses.status` + `interactions.outcome`
- **Nota + sonuç + personel, herkese görünür** → `business_notes` + `interactions`
- **WhatsApp'ta son dokunan birim/personel** → `whatsapp_contacts.lastContactedBy/Team`
- **Durum Takip (arama/mesaj/yüz yüze log)** → `activity_log` (+ `interactions`)
- **Manuel işletme + görüşme formu** → `businesses` (addedManually, createdBy) + `interactions`

## Notlar

- Statü/sonuç/kanal alanları DB'de `text`'tir; geçerli değerler `dbConstants.js`'te,
  doğrulama uygulama katmanında (zod) yapılır → yeni değer migration gerektirmez.
- Erişim kısıtı satır seviyesinde değil; veri ortaktır, kısıt uygulama katmanında (rol/birim).
- Zaman damgaları UTC, saniye çözünürlüğü, string olarak döner.
