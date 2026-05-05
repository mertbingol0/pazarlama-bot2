const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "database.sqlite");

let db;

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function createSearchKey({ category, city, district }) {
  return `${normalizeText(category)}|${normalizeText(city)}|${normalizeText(
    district
  )}`;
}

function createBusinessIdentityKey(business) {
  const externalId =
    business.externalId ||
    business.external_id ||
    (typeof business.id === "string" ? business.id : null);

  if (externalId) {
    return `external:${externalId}`;
  }

  if (business.googleMapsUrl || business.google_maps_url) {
    return `maps:${business.googleMapsUrl || business.google_maps_url}`;
  }

  if (business.phone) {
    return `phone:${normalizeText(business.phone)}`;
  }

  return `name-address:${normalizeText(business.name)}|${normalizeText(
    business.address
  )}`;
}

function mapBusinessRow(row) {
  return {
    id: row.id,
    externalId: row.external_id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    website: row.website,
    googleMapsUrl: row.google_maps_url,
    rating: row.rating,
    userRatingCount: row.user_rating_count,
    source: row.source,
    status: row.status || "pending",
    createdAt: row.created_at,
    category: row.category,
    city: row.city,
    district: row.district,
  };
}

function validateBusinessStatus(status) {
  const allowedStatuses = ["approved", "pending", "rejected"];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      "Geçersiz status. Sadece approved, pending veya rejected olabilir."
    );
  }
}

async function getDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!db) {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    await db.exec("PRAGMA foreign_keys = ON;");
  }

  return db;
}

async function initDatabase() {
  const database = await getDb();

  await database.exec(`
    CREATE TABLE IF NOT EXISTS searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_key TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_id INTEGER NOT NULL,
      external_id TEXT,
      name TEXT,
      phone TEXT,
      address TEXT,
      website TEXT,
      google_maps_url TEXT,
      rating REAL,
      user_rating_count INTEGER DEFAULT 0,
      source TEXT DEFAULT 'google_places',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (search_id) REFERENCES searches(id) ON DELETE CASCADE
    );
  `);

  const businessColumns = await database.all("PRAGMA table_info(businesses)");
  const businessColumnNames = businessColumns.map((column) => column.name);

  if (!businessColumnNames.includes("external_id")) {
    await database.exec("ALTER TABLE businesses ADD COLUMN external_id TEXT;");
  }

  if (!businessColumnNames.includes("status")) {
    await database.exec(
      "ALTER TABLE businesses ADD COLUMN status TEXT DEFAULT 'pending';"
    );
  }

  await database.run(`
    UPDATE businesses
    SET source = 'google_places'
    WHERE source IS NULL OR source = 'Apify Google Maps Scraper'
  `);

  await database.exec(`
    CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
    CREATE INDEX IF NOT EXISTS idx_businesses_external_id ON businesses(external_id);
  `);

  console.log("SQLite database hazır.");
}

async function getCachedSearchResults({ category, city, district }) {
  const database = await getDb();
  const searchKey = createSearchKey({ category, city, district });

  const search = await database.get(
    "SELECT * FROM searches WHERE search_key = ?",
    searchKey
  );

  if (!search) {
    return null;
  }

  const rows = await database.all(
    `
    SELECT 
      id,
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
      created_at
    FROM businesses
    WHERE search_id = ?
    ORDER BY id ASC
    `,
    search.id
  );

  const businesses = rows.map(mapBusinessRow);

  return {
    search,
    businesses,
  };
}

async function saveSearchResults({ category, city, district, businesses }) {
  const database = await getDb();
  const searchKey = createSearchKey({ category, city, district });

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
    "SELECT * FROM searches WHERE search_key = ?",
    searchKey
  );

  const existingBusinesses = await database.all(
    `
    SELECT 
      id,
      external_id,
      name,
      phone,
      address,
      google_maps_url,
      status
    FROM businesses
    WHERE search_id = ?
    `,
    search.id
  );

  const existingStatusMap = new Map();

  for (const existingBusiness of existingBusinesses) {
    const key = createBusinessIdentityKey(existingBusiness);
    existingStatusMap.set(key, existingBusiness.status || "pending");
  }

  await database.run("DELETE FROM businesses WHERE search_id = ?", search.id);

  for (const business of businesses) {
    const businessKey = createBusinessIdentityKey(business);
    const preservedStatus =
      existingStatusMap.get(businessKey) || business.status || "pending";

    await database.run(
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
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      search.id,
      business.externalId || business.id || null,
      business.name || null,
      business.phone || null,
      business.address || null,
      business.website || null,
      business.googleMapsUrl || null,
      business.rating || null,
      business.userRatingCount || 0,
      business.source || "google_places",
      preservedStatus
    );
  }

  return search.id;
}

async function getSearchHistory() {
  const database = await getDb();

  return database.all(`
    SELECT 
      s.id,
      s.category,
      s.city,
      s.district,
      s.created_at,
      s.updated_at,
      COUNT(b.id) AS totalBusinesses,
      SUM(CASE WHEN b.phone IS NOT NULL AND b.phone != '' THEN 1 ELSE 0 END) AS phonesFound,
      SUM(CASE WHEN b.status = 'approved' THEN 1 ELSE 0 END) AS approvedCount,
      SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
      SUM(CASE WHEN b.status = 'rejected' THEN 1 ELSE 0 END) AS rejectedCount
    FROM searches s
    LEFT JOIN businesses b ON b.search_id = s.id
    GROUP BY s.id
    ORDER BY s.updated_at DESC
  `);
}

async function getSearchDetailsById(searchId) {
  const database = await getDb();

  const search = await database.get(
    "SELECT * FROM searches WHERE id = ?",
    searchId
  );

  if (!search) {
    return null;
  }

  const rows = await database.all(
    `
    SELECT 
      id,
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
      created_at
    FROM businesses
    WHERE search_id = ?
    ORDER BY id ASC
    `,
    searchId
  );

  return {
    search,
    businesses: rows.map(mapBusinessRow),
  };
}

async function updateBusinessStatus(businessId, status) {
  validateBusinessStatus(status);

  const database = await getDb();

  const result = await database.run(
    `
    UPDATE businesses
    SET status = ?
    WHERE id = ?
    `,
    status,
    businessId
  );

  if (result.changes === 0) {
    return null;
  }

  const updatedBusiness = await database.get(
    `
    SELECT
      id,
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
      created_at
    FROM businesses
    WHERE id = ?
    `,
    businessId
  );

  return mapBusinessRow(updatedBusiness);
}

async function getBusinessesByStatus(status) {
  validateBusinessStatus(status);

  const database = await getDb();

  const rows = await database.all(
    `
    SELECT
      b.id,
      b.external_id,
      b.name,
      b.phone,
      b.address,
      b.website,
      b.google_maps_url,
      b.rating,
      b.user_rating_count,
      b.source,
      b.status,
      b.created_at,
      s.category,
      s.city,
      s.district
    FROM businesses b
    LEFT JOIN searches s ON s.id = b.search_id
    WHERE b.status = ?
    ORDER BY b.created_at DESC, b.id DESC
    `,
    status
  );

  return rows.map(mapBusinessRow);
}

module.exports = {
  initDatabase,
  getCachedSearchResults,
  saveSearchResults,
  getSearchHistory,
  getSearchDetailsById,
  updateBusinessStatus,
  getBusinessesByStatus,
};