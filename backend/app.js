const {
  initDatabase,
  getCachedSearchResults,
  saveSearchResults,
} = require("./db");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { searchBusinessesWithApify } = require("./services/apifyService");
const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend aktif.",
  });
});

app.post("/api/search", async (req, res) => {
  const { category, city, district } = req.body;

  console.log("Yeni arama isteği geldi:");
  console.log("Kategori:", category);
  console.log("İl:", city);
  console.log("İlçe:", district);

  if (!category || !city || !district) {
    return res.status(400).json({
      success: false,
      message: "Kategori, il ve ilçe bilgileri zorunludur.",
    });
  }

  const searchQuery = `${category} ${district} ${city}`;

  try {
    let businesses = [];
let fromCache = false;

const cached = await getCachedSearchResults({
  category,
  city,
  district,
});

if (cached) {
  businesses = cached.businesses;
  fromCache = true;
  console.log("Sonuçlar SQLite cache üzerinden getirildi.");
} else {
  businesses = await searchBusinessesWithApify({
    category,
    city,
    district,
  });

  await saveSearchResults({
    category,
    city,
    district,
    businesses,
  });

  console.log("Sonuçlar Apify'dan çekildi ve SQLite'a kaydedildi.");
}

const phones = businesses
  .filter((business) => business.phone)
  .map((business) => ({
    value: business.phone,
    businessName: business.name,
    address: business.address,
    source: "Apify Google Maps Scraper",
    url: business.googleMapsUrl,
  }));

    const totalBusinesses = businesses.length;
    const phonesFound = phones.length;

    return res.status(200).json({
      success: true,
      message: fromCache
  ? "Sonuçlar database üzerinden getirildi."
  : "Apify arama sonuçları başarıyla getirildi.",
fromCache,
      query: {
        category,
        city,
        district,
        searchQuery,
      },
      stats: {
        totalBusinesses,
        phonesFound,
        emailsFound: 0,
        instagramsFound: 0,
      },
      results: {
        phones,
        emails: [],
        instagrams: [],
      },
      businesses,
    });
  } catch (error) {
    console.error("/api/search hata:", error);
    return res.status(500).json({
      success: false,
      message: "Arama sırasında bir hata oluştu.",
      error: error.message,
    });
  }
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend ${PORT} portunda çalışıyor.`);
    });
  })
  .catch((error) => {
    console.error("Database başlatılamadı:", error);
    process.exit(1);
  });