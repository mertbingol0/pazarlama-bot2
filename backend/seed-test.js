// Geçici test verisi: WhatsApp (cep) + sabit hat ayrımını denemek için.
const { saveSearchResults } = require("./db");

async function main() {
  const businesses = [
    { name: "Güzellik Merkezi Ada", phone: "0532 111 22 33", address: "Bağdat Cad. No:1, Kadıköy", website: "https://ada-guzellik.com", email: "info@ada-guzellik.com", instagram: "https://instagram.com/adaguzellik", socials: "https://instagram.com/adaguzellik, https://facebook.com/adaguzellik", source: "google_places" },
    { name: "Berber Mehmet", phone: "+90 555 444 33 22", address: "Moda Cad. No:5, Kadıköy", email: "mehmet@berber.com", socials: "https://instagram.com/berbermehmet", source: "google_places" },
    { name: "Saç Tasarım Elif", phone: "0541 000 11 22", address: "Caferağa Mah., Kadıköy", website: "https://saceliftasarim.com", source: "google_places" },
    { name: "Kuaför Lüks Salon", phone: "0216 345 67 89", address: "Feneryolu, Kadıköy", email: "rezervasyon@luxsalon.com", socials: "https://instagram.com/luxsalon, https://tiktok.com/@luxsalon", source: "google_places" },
    { name: "Eski Usül Berber", phone: "(0212) 555 11 22", address: "Kadıköy Çarşı", source: "google_places" },
    { name: "Çağrı Merkezi Kuaför", phone: "0850 222 33 44", address: "Acıbadem, Kadıköy", email: "destek@cagrikuafor.com", source: "google_places" },
    { name: "Sadece Mailli İşletme", phone: "", address: "Bostancı, Kadıköy", email: "iletisim@mailliisletme.com", socials: "https://facebook.com/mailliisletme", source: "google_places" },
  ];

  // Frontend slug değerleri gönderir (Güzellik=guzellik, İstanbul=istanbul, Kadıköy=kadikoy)
  await saveSearchResults({
    category: "guzellik",
    city: "istanbul",
    district: "kadikoy",
    businesses,
  });

  console.log("Test verisi eklendi: Güzellik / İstanbul / Kadıköy (%d işletme)", businesses.length);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
