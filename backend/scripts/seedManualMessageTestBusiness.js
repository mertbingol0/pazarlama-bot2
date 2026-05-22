const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const { initDatabase } = require("../db");

const TEST_PHONE = process.argv[2];

if (!TEST_PHONE) {
  console.error(
    "Kullanım: node backend/scripts/seedManualMessageTestBusiness.js 905300448478"
  );
  process.exit(1);
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function createSearchKey({ category, city, district }) {
  return `${normalizeText(category)}|${normalizeText(city)}|${normalizeText(
    district
  )}`;
}

async function main() {
  await initDatabase();

  const dataDir = path.join(__dirname, "..", "data");
  const dbPath = path.join(dataDir, "database.sqlite");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const database = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await database.exec("PRAGMA foreign_keys = ON;");

  const category = "kuaför";
  const city = "İstanbul";
  const district = "Kadıköy";
  const searchKey = createSearchKey({ category, city, district });
  const normalizedPhone = normalizePhone(TEST_PHONE);
  const externalId = `manual-test-${normalizedPhone}`;

  await database.run(
    `
    INSERT INTO searches (search_key, category, city, district)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(search_key) DO UPDATE SET
      category = excluded.category,
      city = excluded.city,
      district = excluded.district,
      updated_at = CURRENT_TIMESTAMP
    `,
    searchKey,
    category,
    city,
    district
  );

  const search = await database.get(
    "SELECT id FROM searches WHERE search_key = ?",
    searchKey
  );

  if (!search) {
    throw new Error("Search kaydı oluşturulamadı.");
  }

  const existingBusiness = await database.get(
    `
    SELECT id
    FROM businesses
    WHERE external_id = ?
       OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE ?
    ORDER BY id DESC
    LIMIT 1
    `,
    externalId,
    `%${normalizedPhone.slice(-10)}%`
  );

  if (existingBusiness) {
    await database.run(
      `
      UPDATE businesses
      SET
        search_id = ?,
        external_id = ?,
        name = ?,
        phone = ?,
        address = ?,
        website = ?,
        google_maps_url = ?,
        rating = ?,
        user_rating_count = ?,
        source = ?,
        status = ?,
        category = ?,
        city = ?,
        district = ?,
        whatsapp_status = ?,
        template_sent_at = NULL,
        last_incoming_at = CURRENT_TIMESTAMP,
        last_message_text = ?,
        last_whatsapp_message_id = ?
      WHERE id = ?
      `,
      search.id,
      externalId,
      "Jefedes Manuel Mesaj Test Firması",
      TEST_PHONE,
      "Kadıköy / İstanbul - Manuel mesaj test kaydı",
      null,
      null,
      null,
      0,
      "manual",
      "pending",
      category,
      city,
      district,
      "replied",
      "Bilgi almak istiyorum",
      `manual-test-message-${Date.now()}`,
      existingBusiness.id
    );

    console.log("Test firma güncellendi:", {
      id: existingBusiness.id,
      phone: TEST_PHONE,
      whatsappStatus: "replied",
    });

    await database.close();
    return;
  }

  const result = await database.run(
    `
    INSERT INTO businesses (
      search_id,
      external_id,
      name,
      phone,
      address,
      website,
      google_maps_url,
      rating,
      user_rating_count,
      source,
      status,
      category,
      city,
      district,
      lat,
      lng,
      whatsapp_status,
      template_sent_at,
      last_incoming_at,
      last_message_text,
      last_whatsapp_message_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `,
    search.id,
    externalId,
    "Jefedes Manuel Mesaj Test Firması",
    TEST_PHONE,
    "Kadıköy / İstanbul - Manuel mesaj test kaydı",
    null,
    null,
    null,
    0,
    "manual",
    "pending",
    category,
    city,
    district,
    null,
    null,
    "replied",
    null,
    "Bilgi almak istiyorum",
    `manual-test-message-${Date.now()}`
  );

  console.log("Test firma eklendi:", {
    id: result.lastID,
    phone: TEST_PHONE,
    status: "pending",
    whatsappStatus: "replied",
    search: `${category} / ${city} / ${district}`,
  });

  await database.close();
}

main().catch((error) => {
  console.error("Test firma seed hatası:", error);
  process.exit(1);
});