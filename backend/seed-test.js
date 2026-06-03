// Geçici test verisi: WhatsApp (cep) + sabit hat ayrımını denemek için.
const { saveSearchResults } = require("./db");

async function main() {
  const businesses = [
    { name: "Güzellik Merkezi Ada", phone: "0532 111 22 33", address: "Bağdat Cad. No:1, Kadıköy", source: "google_places" },
    { name: "Berber Mehmet", phone: "+90 555 444 33 22", address: "Moda Cad. No:5, Kadıköy", source: "google_places" },
    { name: "Saç Tasarım Elif", phone: "0541 000 11 22", address: "Caferağa Mah., Kadıköy", source: "google_places" },
    { name: "Kuaför Lüks Salon", phone: "0216 345 67 89", address: "Feneryolu, Kadıköy", source: "google_places" },
    { name: "Eski Usül Berber", phone: "(0212) 555 11 22", address: "Kadıköy Çarşı", source: "google_places" },
    { name: "Çağrı Merkezi Kuaför", phone: "0850 222 33 44", address: "Acıbadem, Kadıköy", source: "google_places" },
    { name: "Telefonsuz Salon", phone: "", address: "Bostancı, Kadıköy", source: "google_places" },
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
