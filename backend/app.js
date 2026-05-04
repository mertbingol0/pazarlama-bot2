const {
  initDatabase,
  getCachedSearchResults,
  saveSearchResults,
  getSearchHistory,
  getSearchDetailsById,
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

app.get("/api/searches", async (req, res) => {
  try {
    const searches = await getSearchHistory();

    return res.status(200).json({
      success: true,
      message: "Kayıtlı aramalar başarıyla getirildi.",
      searches,
    });
  } catch (error) {
    console.error("/api/searches hata:", error);

    return res.status(500).json({
      success: false,
      message: "Kayıtlı aramalar getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.get("/api/searches/:id", async (req, res) => {
  try {
    const searchId = Number(req.params.id);

    if (!Number.isInteger(searchId) || searchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Geçerli bir arama ID değeri gönderilmelidir.",
      });
    }

    const details = await getSearchDetailsById(searchId);

    if (!details) {
      return res.status(404).json({
        success: false,
        message: "Arama kaydı bulunamadı.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Arama detayı başarıyla getirildi.",
      search: details.search,
      businesses: details.businesses,
    });
  } catch (error) {
    console.error("/api/searches/:id hata:", error);

    return res.status(500).json({
      success: false,
      message: "Arama detayı getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
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

    try {
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

      console.log("Güncel sonuçlar Apify'dan çekildi ve SQLite'a kaydedildi.");
    } catch (apifyError) {
      console.error(
        "Apify hata verdi, kayıtlı sonuç kontrol ediliyor:",
        apifyError
      );

      const cached = await getCachedSearchResults({
        category,
        city,
        district,
      });

      if (!cached) {
        throw apifyError;
      }

      businesses = cached.businesses;
      fromCache = true;
      console.log(
        "Apify hata verdiği için sonuçlar SQLite yedeğinden getirildi."
      );
    }

    const phones = businesses
      .filter((business) => business.phone)
      .map((business) => ({
        value: business.phone,
        businessName: business.name,
        address: business.address,
        source: business.source || "Apify Google Maps Scraper",
        url: business.googleMapsUrl,
      }));

    const totalBusinesses = businesses.length;
    const phonesFound = phones.length;

    return res.status(200).json({
      success: true,
      message: fromCache
        ? "Güncel veri alınamadığı için kayıtlı son sonuçlar gösteriliyor."
        : "Güncel Apify arama sonuçları başarıyla getirildi.",
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