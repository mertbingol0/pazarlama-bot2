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
      name TEXT,
      phone TEXT,
      address TEXT,
      website TEXT,
      google_maps_url TEXT,
      rating REAL,
      user_rating_count INTEGER DEFAULT 0,
      source TEXT DEFAULT 'Apify Google Maps Scraper',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (search_id) REFERENCES searches(id) ON DELETE CASCADE
    );
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
      name,
      phone,
      address,
      website,
      google_maps_url,
      rating,
      user_rating_count,
      source
    FROM businesses
    WHERE search_id = ?
    ORDER BY id ASC
    `,
    search.id
  );

  const businesses = rows.map((row) => ({
    name: row.name,
    phone: row.phone,
    address: row.address,
    website: row.website,
    googleMapsUrl: row.google_maps_url,
    rating: row.rating,
    userRatingCount: row.user_rating_count,
    source: row.source,
  }));

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

  await database.run("DELETE FROM businesses WHERE search_id = ?", search.id);

  for (const business of businesses) {
    await database.run(
      `
      INSERT INTO businesses (
        search_id,
        name,
        phone,
        address,
        website,
        google_maps_url,
        rating,
        user_rating_count,
        source
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      search.id,
      business.name || null,
      business.phone || null,
      business.address || null,
      business.website || null,
      business.googleMapsUrl || null,
      business.rating || null,
      business.userRatingCount || 0,
      business.source || "Apify Google Maps Scraper"
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
      SUM(CASE WHEN b.phone IS NOT NULL AND b.phone != '' THEN 1 ELSE 0 END) AS phonesFound
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

  const businesses = await database.all(
    `
    SELECT 
      id,
      name,
      phone,
      address,
      website,
      google_maps_url,
      rating,
      user_rating_count,
      source,
      created_at
    FROM businesses
    WHERE search_id = ?
    ORDER BY id ASC
    `,
    searchId
  );

  return {
    search,
    businesses,
  };
}
module.exports = {
  initDatabase,
  getCachedSearchResults,
  saveSearchResults,
  getSearchHistory,
  getSearchDetailsById,
};