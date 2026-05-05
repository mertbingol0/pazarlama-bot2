const { searchBusinessesWithGoogle } = require("./services/googlePlacesService");

const {
  initDatabase,
  getCachedSearchResults,
  saveSearchResults,
  getSearchHistory,
  getSearchDetailsById,
  updateBusinessStatus,
  getBusinessesByStatus,
} = require("./db");

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

function isValidStatus(status) {
  return ["approved", "pending", "rejected"].includes(status);
}

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

app.patch("/api/businesses/:id/status", async (req, res) => {
  try {
    const businessId = Number(req.params.id);
    const status = String(req.body.status || "")
      .trim()
      .toLowerCase();

    if (!Number.isInteger(businessId) || businessId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Geçerli bir işletme ID değeri gönderilmelidir.",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status alanı zorunludur.",
      });
    }

    if (!isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Status sadece approved, pending veya rejected olabilir.",
      });
    }

    const updatedBusiness = await updateBusinessStatus(businessId, status);

    if (!updatedBusiness) {
      return res.status(404).json({
        success: false,
        message: "İşletme bulunamadı.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "İşletme durumu başarıyla güncellendi.",
      business: updatedBusiness,
    });
  } catch (error) {
    console.error("/api/businesses/:id/status hata:", error);

    return res.status(500).json({
      success: false,
      message: "İşletme durumu güncellenirken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.get("/api/businesses/status/:status", async (req, res) => {
  try {
    const status = String(req.params.status || "")
      .trim()
      .toLowerCase();

    if (!isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Status sadece approved, pending veya rejected olabilir.",
      });
    }

    const businesses = await getBusinessesByStatus(status);

    return res.status(200).json({
      success: true,
      message: `${status} durumundaki işletmeler başarıyla getirildi.`,
      status,
      count: businesses.length,
      businesses,
    });
  } catch (error) {
    console.error("/api/businesses/status/:status hata:", error);

    return res.status(500).json({
      success: false,
      message: "Duruma göre işletmeler getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.post("/api/search", async (req, res) => {
  const { category, city, district, limit = 10 } = req.body;

  console.log("Yeni arama isteği geldi:");
  console.log("Kategori:", category);
  console.log("İl:", city);
  console.log("İlçe:", district);
  console.log("Limit:", limit);
  console.log("Aktif provider: google");

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
      const googleResult = await searchBusinessesWithGoogle({
        category,
        city,
        district,
        limit,
      });

      const googleBusinesses = googleResult.businesses || [];

      await saveSearchResults({
        category,
        city,
        district,
        businesses: googleBusinesses,
      });

      const savedResults = await getCachedSearchResults({
        category,
        city,
        district,
      });

      businesses = savedResults?.businesses || googleBusinesses;

      console.log("Güncel sonuçlar Google Places API'den çekildi.");
      console.log("Sonuçlar SQLite'a kaydedildi.");
    } catch (googleError) {
      console.error(
        "Google Places hata verdi, kayıtlı sonuç kontrol ediliyor:",
        googleError
      );

      const cached = await getCachedSearchResults({
        category,
        city,
        district,
      });

      if (!cached) {
        throw googleError;
      }

      businesses = cached.businesses;
      fromCache = true;

      console.log(
        "Google Places hata verdiği için sonuçlar SQLite yedeğinden getirildi."
      );
    }

    const phones = businesses
      .filter((business) => business.phone)
      .map((business) => ({
        id: business.id,
        value: business.phone,
        businessName: business.name,
        address: business.address,
        source: business.source || "google_places",
        url: business.googleMapsUrl,
        website: business.website,
        rating: business.rating,
        status: business.status || "pending",
      }));

    const totalBusinesses = businesses.length;
    const phonesFound = phones.length;

    return res.status(200).json({
      success: true,
      provider: "google",
      message: fromCache
        ? "Güncel veri alınamadığı için kayıtlı son sonuçlar gösteriliyor."
        : "Güncel Google Places arama sonuçları başarıyla getirildi.",
      fromCache,
      query: {
        category,
        city,
        district,
        limit,
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