// CRM alanları için geçerli değer kümeleri.
// DB seviyesinde enum yerine text + uygulama katmanında (zod) doğrulama kullanıyoruz;
// bu sayede yeni değer eklemek migration gerektirmez. Bu sabitler hem şemada
// (default'lar) hem de ileride zod şemalarında ortak kaynak olarak kullanılır.

// Kullanıcı rolleri. admin: izleme/rapor/kullanıcı yönetimi. personnel: sahada
// çalışan, sorgu yapan, görüşme kaydeden kullanıcı (yetkileri birim farkı dışında aynı).
const USER_ROLES = ["admin", "personnel"];

// Birimler (team). Personel kullanıcılar bir birime bağlıdır; admin'in birimi olmaz.
// Birim bazlı atama, filtreleme, raporlama ve "hangi birim iletişime geçti" için kullanılır.
const TEAMS = ["saha_pazarlama", "reklam_pazarlama", "cagri_merkezi"];

// Bir işletmenin CRM süreç durumu.
const BUSINESS_STATUSES = [
  "pending", // henüz değerlendirilmedi
  "contacted", // iletişime geçildi
  "in_progress", // görüşme sürüyor
  "approved", // onaylandı / kayıt alındı
  "rejected", // reddedildi
];

// Bir görüşmenin (interaction) gerçekleştiği kanal.
const INTERACTION_CHANNELS = [
  "whatsapp",
  "call", // telefon araması
  "face_to_face", // yüz yüze (saha)
  "manual", // manuel kayıt
  "sms",
  "email",
  "other",
];

// Bir görüşmenin sonucu.
const INTERACTION_OUTCOMES = [
  "pending", // sonuç henüz yok
  "interested", // ilgileniyor
  "to_meet", // daha sonra görüşülecek (meetingAt kullanılır)
  "contacted", // iletişime geçildi
  "approved", // onaylandı
  "record_taken", // kayıt alındı
  "rejected", // reddedildi
  "follow_up", // tekrar dönülecek
  "not_interested", // ilgilenmiyor
  "completed", // tamamlandı
];

// WhatsApp mesaj yönü.
const MESSAGE_DIRECTIONS = ["incoming", "outgoing"];

// Giden mesaj iletim durumu.
const MESSAGE_STATUSES = ["queued", "sent", "delivered", "read", "failed"];

// Aktivite log eylemleri (Durum Takip sayfası + admin anlık izleme + analitik).
const ACTIVITY_ACTIONS = [
  "search", // işletme sorgusu yapıldı
  "business_created", // işletme eklendi (manuel veya sorgudan)
  "business_updated",
  "business_assigned", // işletme bir personele atandı
  "status_changed", // işletme durumu değişti
  "note_added", // not eklendi
  "interaction_logged", // görüşme kaydedildi
  "meeting_scheduled", // ileri tarihli görüşme planlandı
  "message_sent", // WhatsApp giden mesaj
  "message_received", // WhatsApp gelen mesaj
  "contact_created", // yeni WhatsApp kişisi
  "user_created", // admin yeni kullanıcı ekledi
  "login",
  "logout",
];

module.exports = {
  USER_ROLES,
  TEAMS,
  BUSINESS_STATUSES,
  INTERACTION_CHANNELS,
  INTERACTION_OUTCOMES,
  MESSAGE_DIRECTIONS,
  MESSAGE_STATUSES,
  ACTIVITY_ACTIONS,
};
