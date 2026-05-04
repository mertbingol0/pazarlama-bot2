const express = require("express");
const cors = require("cors");
require("dotenv").config();

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

app.post("/api/search", (req, res) => {
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

  return res.status(200).json({
    success: true,
    message: "Bilgiler backend tarafından başarıyla alındı.",
    receivedData: {
      category,
      city,
      district,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Backend ${PORT} portunda çalışıyor.`);
});