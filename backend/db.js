const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "jefedes1212";

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "database.sqlite");

let db;

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

function createBusinessIdentityKey(business) {
  const normalizedPhone = normalizePhone(business.phone);

  if (normalizedPhone) {
    return `phone:${normalizedPhone}`;
  }

  const externalId =
    business.externalId ||
    business.external_id ||
    (typeof business.id === "string" ? business.id : null);

  if (externalId) {
    return `external:${externalId}`;
  }

  const googleMapsUrl = business.googleMapsUrl || business.google_maps_url;

  if (googleMapsUrl) {
    return `maps:${googleMapsUrl}`;
  }

  return `name-address:${normalizeText(business.name)}|${normalizeText(
    business.address
  )}`;
}
function getBusinessStatePriority(state) {
  let priority = 0;

  if (!state) {
    return priority;
  }

  if (state.status === "approved" || state.status === "rejected") {
    priority += 50;
  }

  if (state.whatsappStatus && state.whatsappStatus !== "not_sent") {
    priority += 30;
  }

  if (state.templateSentAt) {
    priority += 20;
  }

  if (state.lastIncomingAt) {
    priority += 15;
  }

  if (state.lastMessageText) {
    priority += 10;
  }

  if (state.lastWhatsappMessageId) {
    priority += 10;
  }

  return priority;
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

    lat: row.lat,
    lng: row.lng,

    whatsappStatus: row.whatsapp_status || "not_sent",
    templateSentAt: row.template_sent_at,
    lastIncomingAt: row.last_incoming_at,
    lastMessageText: row.last_message_text,
    lastWhatsappMessageId: row.last_whatsapp_message_id,

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
function validateWhatsAppStatus(status) {
  const allowedStatuses = [
  "not_sent",
  "template_sent",
  "waiting_reply",
  "replied",
  "follow_up",
  "not_interested",
];

  if (!allowedStatuses.includes(status)) {
 throw new Error(
  "Geçersiz WhatsApp status. Sadece not_sent, template_sent, waiting_reply, replied, follow_up veya not_interested olabilir."
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
    category TEXT,
    city TEXT,
    district TEXT,
    lat REAL,
    lng REAL,
    whatsapp_status TEXT DEFAULT 'not_sent',
    template_sent_at TEXT,
    last_incoming_at TEXT,
    last_message_text TEXT,
    last_whatsapp_message_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (search_id) REFERENCES searches(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS live_support_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL UNIQUE,
    button_text TEXT DEFAULT 'Bilgi almak istiyorum',
    status TEXT DEFAULT 'info_requested',
    note TEXT DEFAULT '',
    message_id TEXT,
    seen_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    confirmation_code TEXT NOT NULL UNIQUE,
    facebook_user_id TEXT,
    status TEXT DEFAULT 'received',
    notes TEXT DEFAULT '',
    raw_payload TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
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

  if (!businessColumnNames.includes("category")) {
    await database.exec("ALTER TABLE businesses ADD COLUMN category TEXT;");
  }

  if (!businessColumnNames.includes("city")) {
    await database.exec("ALTER TABLE businesses ADD COLUMN city TEXT;");
  }

  if (!businessColumnNames.includes("district")) {
    await database.exec("ALTER TABLE businesses ADD COLUMN district TEXT;");
  }
  if (!businessColumnNames.includes("lat")) {
  await database.exec("ALTER TABLE businesses ADD COLUMN lat REAL;");
}

if (!businessColumnNames.includes("lng")) {
  await database.exec("ALTER TABLE businesses ADD COLUMN lng REAL;");
}

if (!businessColumnNames.includes("whatsapp_status")) {
  await database.exec(
    "ALTER TABLE businesses ADD COLUMN whatsapp_status TEXT DEFAULT 'not_sent';"
  );
}

if (!businessColumnNames.includes("template_sent_at")) {
  await database.exec("ALTER TABLE businesses ADD COLUMN template_sent_at TEXT;");
}

if (!businessColumnNames.includes("last_incoming_at")) {
  await database.exec("ALTER TABLE businesses ADD COLUMN last_incoming_at TEXT;");
}

if (!businessColumnNames.includes("last_message_text")) {
  await database.exec("ALTER TABLE businesses ADD COLUMN last_message_text TEXT;");
}

if (!businessColumnNames.includes("last_whatsapp_message_id")) {
  await database.exec(
    "ALTER TABLE businesses ADD COLUMN last_whatsapp_message_id TEXT;"
  );
}
const liveSupportColumns = await database.all(
  "PRAGMA table_info(live_support_leads)"
);

const liveSupportColumnNames = liveSupportColumns.map((column) => column.name);

if (!liveSupportColumnNames.includes("seen_at")) {
  await database.exec(
    "ALTER TABLE live_support_leads ADD COLUMN seen_at TEXT DEFAULT NULL;"
  );
}


  await database.run(`
    UPDATE businesses
    SET source = 'google_places'
    WHERE source IS NULL OR source = 'Apify Google Maps Scraper'
  `);

  await database.exec(`
    CREATE INDEX IF NOT EXISTS idx_businesses_status 
    ON businesses(status);

    CREATE INDEX IF NOT EXISTS idx_businesses_external_id 
    ON businesses(external_id);

    CREATE INDEX IF NOT EXISTS idx_businesses_whatsapp_status 
    ON businesses(whatsapp_status);

    CREATE INDEX IF NOT EXISTS idx_live_support_leads_phone 
    ON live_support_leads(phone);

    CREATE INDEX IF NOT EXISTS idx_live_support_leads_status 
    ON live_support_leads(status);

    CREATE INDEX IF NOT EXISTS idx_live_support_leads_updated_at 
    ON live_support_leads(updated_at);

    CREATE INDEX IF NOT EXISTS idx_live_support_leads_seen_at
    ON live_support_leads(seen_at);

    CREATE INDEX IF NOT EXISTS idx_users_username
    ON users(username);

    CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_code
    ON data_deletion_requests(confirmation_code);

    CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user
    ON data_deletion_requests(facebook_user_id);
  `);

  await seedDefaultAdminUser();

  console.log("SQLite database hazır.");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");

  return {
    salt,
    hash: derived,
  };
}

function verifyPassword(password, salt, expectedHash) {
  if (!password || !salt || !expectedHash) {
    return false;
  }

  const derived = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(String(expectedHash), "hex");

  if (derived.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(derived, expected);
}

async function seedDefaultAdminUser() {
  const database = await getDb();

  const existing = await database.get(
    "SELECT id FROM users WHERE username = ?",
    DEFAULT_ADMIN_USERNAME
  );

  if (existing) {
    return;
  }

  const { salt, hash } = hashPassword(DEFAULT_ADMIN_PASSWORD);

  await database.run(
    `
    INSERT INTO users (username, password_hash, password_salt, role)
    VALUES (?, ?, ?, 'admin')
    `,
    DEFAULT_ADMIN_USERNAME,
    hash,
    salt
  );

  console.log(`Varsayilan admin kullanicisi olusturuldu: ${DEFAULT_ADMIN_USERNAME}`);
}

async function findUserByUsername(username) {
  const database = await getDb();

  const row = await database.get(
    `
    SELECT id, username, password_hash, password_salt, role, created_at, updated_at
    FROM users
    WHERE username = ?
    `,
    String(username || "").trim()
  );

  return row || null;
}

function generateConfirmationCode() {
  return crypto.randomBytes(12).toString("hex");
}

async function createDataDeletionRequest({
  facebookUserId = null,
  rawPayload = null,
}) {
  const database = await getDb();
  const confirmationCode = generateConfirmationCode();

  const insertResult = await database.run(
    `
    INSERT INTO data_deletion_requests (
      confirmation_code,
      facebook_user_id,
      status,
      raw_payload
    )
    VALUES (?, ?, 'received', ?)
    `,
    confirmationCode,
    facebookUserId,
    rawPayload ? JSON.stringify(rawPayload) : null
  );

  return database.get(
    `
    SELECT
      id,
      confirmation_code,
      facebook_user_id,
      status,
      notes,
      created_at,
      completed_at
    FROM data_deletion_requests
    WHERE id = ?
    `,
    insertResult.lastID
  );
}

async function getDataDeletionRequest(confirmationCode) {
  const database = await getDb();

  const row = await database.get(
    `
    SELECT
      id,
      confirmation_code,
      facebook_user_id,
      status,
      notes,
      created_at,
      completed_at
    FROM data_deletion_requests
    WHERE confirmation_code = ?
    `,
    String(confirmationCode || "").trim()
  );

  return row || null;
}

async function authenticateUser({ username, password }) {
  const normalizedUsername = String(username || "").trim();

  if (!normalizedUsername || !password) {
    return null;
  }

  const user = await findUserByUsername(normalizedUsername);

  if (!user) {
    return null;
  }

  const isValid = verifyPassword(password, user.password_salt, user.password_hash);

  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role || "admin",
    createdAt: user.created_at,
  };
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
    category,
    city,
    district,
    lat,
    lng,
    whatsapp_status,
    template_sent_at,
    last_incoming_at,
    last_message_text,
    last_whatsapp_message_id,
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
      status,
      whatsapp_status,
      template_sent_at,
      last_incoming_at,
      last_message_text,
      last_whatsapp_message_id
    FROM businesses
    `
  );

  const existingBusinessStateMap = new Map();

for (const existingBusiness of existingBusinesses) {
  const key = createBusinessIdentityKey(existingBusiness);

  const nextState = {
    status: existingBusiness.status || "pending",
    whatsappStatus: existingBusiness.whatsapp_status || "not_sent",
    templateSentAt: existingBusiness.template_sent_at || null,
    lastIncomingAt: existingBusiness.last_incoming_at || null,
    lastMessageText: existingBusiness.last_message_text || null,
    lastWhatsappMessageId: existingBusiness.last_whatsapp_message_id || null,
  };

  const currentState = existingBusinessStateMap.get(key);

  if (
    !currentState ||
    getBusinessStatePriority(nextState) > getBusinessStatePriority(currentState)
  ) {
    existingBusinessStateMap.set(key, nextState);
  }
}
  await database.run("DELETE FROM businesses WHERE search_id = ?", search.id);

  for (const business of businesses) {
    const businessKey = createBusinessIdentityKey(business);
    const previousBusinessState = existingBusinessStateMap.get(businessKey) || {};

    const preservedStatus =
      previousBusinessState.status || business.status || "pending";

    const preservedWhatsAppStatus =
      previousBusinessState.whatsappStatus ||
      business.whatsappStatus ||
      "not_sent";

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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      preservedStatus,
      business.category || null,
      business.city || null,
      business.district || null,
      business.lat || business.location?.latitude || null,
      business.lng || business.location?.longitude || null,
      preservedWhatsAppStatus,
      previousBusinessState.templateSentAt || business.templateSentAt || null,
      previousBusinessState.lastIncomingAt || business.lastIncomingAt || null,
      previousBusinessState.lastMessageText || business.lastMessageText || null,
      previousBusinessState.lastWhatsappMessageId ||
        business.lastWhatsappMessageId ||
        null
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
    category,
    city,
    district,
    lat,
    lng,
    whatsapp_status,
    template_sent_at,
    last_incoming_at,
    last_message_text,
    last_whatsapp_message_id,
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
    category,
    city,
    district,
    lat,
    lng,
    whatsapp_status,
    template_sent_at,
    last_incoming_at,
    last_message_text,
    last_whatsapp_message_id,
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
    b.lat,
    b.lng,
    b.whatsapp_status,
    b.template_sent_at,
    b.last_incoming_at,
    b.last_message_text,
    b.last_whatsapp_message_id,
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
async function getBusinessById(businessId) {
  const database = await getDb();

  const row = await database.get(
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
      lat,
      lng,
      whatsapp_status,
      template_sent_at,
      last_incoming_at,
      last_message_text,
      last_whatsapp_message_id,
      category,
      city,
      district,
      created_at
    FROM businesses
    WHERE id = ?
    `,
    businessId
  );

  if (!row) {
    return null;
  }

  return mapBusinessRow(row);
}

async function getBusinessesByWhatsAppStatus(whatsappStatus = "all") {
  const database = await getDb();

  const normalizedStatus = String(whatsappStatus || "all")
    .trim()
    .toLowerCase();

  let rows;

  if (normalizedStatus === "all") {
    rows = await database.all(`
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
        lat,
        lng,
        whatsapp_status,
        template_sent_at,
        last_incoming_at,
        last_message_text,
        last_whatsapp_message_id,
        category,
        city,
        district,
        created_at
      FROM businesses
      ORDER BY created_at DESC, id DESC
    `);
  } else {
    validateWhatsAppStatus(normalizedStatus);

    rows = await database.all(
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
        lat,
        lng,
        whatsapp_status,
        template_sent_at,
        last_incoming_at,
        last_message_text,
        last_whatsapp_message_id,
        category,
        city,
        district,
        created_at
      FROM businesses
      WHERE whatsapp_status = ?
      ORDER BY created_at DESC, id DESC
      `,
      normalizedStatus
    );
  }

  return rows.map(mapBusinessRow);
}

async function updateBusinessWhatsAppStatus(businessId, whatsappStatus) {
  validateWhatsAppStatus(whatsappStatus);

  const database = await getDb();

  const result = await database.run(
    `
    UPDATE businesses
    SET whatsapp_status = ?
    WHERE id = ?
    `,
    whatsappStatus,
    businessId
  );

  if (result.changes === 0) {
    return null;
  }

  return getBusinessById(businessId);
}

async function markTemplateSent({
  businessId,
  whatsappStatus = "template_sent",
  messageId = null,
}) {
  validateWhatsAppStatus(whatsappStatus);

  const database = await getDb();

  const result = await database.run(
    `
    UPDATE businesses
    SET
      whatsapp_status = ?,
      template_sent_at = CURRENT_TIMESTAMP,
      last_whatsapp_message_id = ?
    WHERE id = ?
    `,
    whatsappStatus,
    messageId,
    businessId
  );

  if (result.changes === 0) {
    return null;
  }

  return getBusinessById(businessId);
}

async function markIncomingWhatsAppReply({
  phone,
  messageText = "",
  messageId = null,
}) {
  const database = await getDb();

  const normalizedPhone = String(phone || "").replace(/\D/g, "");

  if (!normalizedPhone) {
    return null;
  }

  const row = await database.get(
    `
    SELECT id
    FROM businesses
    WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE ?
    ORDER BY id DESC
    LIMIT 1
    `,
    `%${normalizedPhone.slice(-10)}%`
  );

  if (!row) {
    return null;
  }

  await database.run(
    `
    UPDATE businesses
    SET
      whatsapp_status = 'replied',
      last_incoming_at = CURRENT_TIMESTAMP,
      last_message_text = ?,
      last_whatsapp_message_id = ?
    WHERE id = ?
    `,
    messageText,
    messageId,
    row.id
  );

  return getBusinessById(row.id);
}

async function saveLiveSupportLead({
  phone,
  buttonText = "Bilgi almak istiyorum",
  messageId = null,
}) {
  const database = await getDb();

  const normalizedPhone = String(phone || "").replace(/\D/g, "");

  if (!normalizedPhone) {
    return null;
  }

  await database.run(
    `
    INSERT INTO live_support_leads (
      phone,
      button_text,
      status,
      message_id,
      seen_at
    )
    VALUES (?, ?, 'info_requested', ?, NULL)
    ON CONFLICT(phone) DO UPDATE SET
      button_text = excluded.button_text,
      status = 'info_requested',
      message_id = excluded.message_id,
      seen_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    `,
    normalizedPhone,
    buttonText,
    messageId
  );

  return database.get(
    `
    SELECT
      id,
      phone,
      button_text,
      status,
      note,
      message_id,
      seen_at,
      created_at,
      updated_at
    FROM live_support_leads
    WHERE phone = ?
    `,
    normalizedPhone
  );
}

async function getLiveSupportLeads() {
  const database = await getDb();

  const rows = await database.all(`
    SELECT
      id,
      phone,
      button_text,
      status,
      note,
      message_id,
      seen_at,
      created_at,
      updated_at
    FROM live_support_leads
    ORDER BY updated_at DESC, id DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    phone: row.phone,
    buttonText: row.button_text,
    status: row.status || "info_requested",
    note: row.note || "",
    messageId: row.message_id,
    seenAt: row.seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function updateLiveSupportLeadNote(leadId, note) {
  const database = await getDb();

  const result = await database.run(
    `
    UPDATE live_support_leads
    SET
      note = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    note,
    leadId
  );

  if (result.changes === 0) {
    return null;
  }

  const row = await database.get(
    `
    SELECT
      id,
      phone,
      button_text,
      status,
      note,
      message_id,
      seen_at,
      created_at,
      updated_at
    FROM live_support_leads
    WHERE id = ?
    `,
    leadId
  );

  return {
    id: row.id,
    phone: row.phone,
    buttonText: row.button_text,
    status: row.status || "info_requested",
    note: row.note || "",
    messageId: row.message_id,
    seenAt: row.seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getLiveSupportUnseenCount() {
  const database = await getDb();

  const row = await database.get(`
    SELECT COUNT(*) AS count
    FROM live_support_leads
    WHERE seen_at IS NULL
  `);

  return Number(row?.count || 0);
}

async function markLiveSupportLeadsAsSeen() {
  const database = await getDb();

  const result = await database.run(`
    UPDATE live_support_leads
    SET
      seen_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE seen_at IS NULL
  `);

  return {
    updatedCount: result.changes || 0,
  };
}

async function clearLiveSupportLeads() {
  const database = await getDb();

  const result = await database.run(`
    DELETE FROM live_support_leads
  `);

  return {
    deletedCount: result.changes || 0,
  };
}

async function upsertManualMessageTestBusiness({
  category,
  city,
  district,
  phone = "905300448478",
}) {
  const database = await getDb();

  const normalizedCategory = String(category || "").trim();
  const normalizedCity = String(city || "").trim();
  const normalizedDistrict = String(district || "").trim();
  const normalizedPhone = normalizePhone(phone || "905300448478");
  const searchKey = createSearchKey({
    category: normalizedCategory,
    city: normalizedCity,
    district: normalizedDistrict,
  });

  if (!normalizedPhone) {
    throw new Error("Manual message test business icin gecerli bir telefon gerekli.");
  }

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
    normalizedCategory,
    normalizedCity,
    normalizedDistrict
  );

  const search = await database.get(
    "SELECT id FROM searches WHERE search_key = ?",
    searchKey
  );

  if (!search?.id) {
    throw new Error("Manual message test business icin search kaydi olusturulamadi.");
  }

  const externalId = `manual-test-${normalizedPhone}`;
  const businessName = "Jefedes Manuel Mesaj Test Firması";
  const address = "Kadıköy / İstanbul - Manuel mesaj test kaydı";
  const lastMessageText = "Bilgi almak istiyorum";

  const existingBusiness = await database.get(
    `
    SELECT id
    FROM businesses
    WHERE external_id = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    externalId
  );

  let businessId = existingBusiness?.id || null;

  if (businessId) {
    await database.run(
      `
      UPDATE businesses
      SET
        search_id = ?,
        external_id = ?,
        name = ?,
        phone = ?,
        address = ?,
        website = NULL,
        google_maps_url = NULL,
        rating = NULL,
        user_rating_count = 0,
        source = 'manual',
        status = 'pending',
        category = ?,
        city = ?,
        district = ?,
        lat = NULL,
        lng = NULL,
        whatsapp_status = 'replied',
        template_sent_at = NULL,
        last_incoming_at = CURRENT_TIMESTAMP,
        last_message_text = ?,
        last_whatsapp_message_id = NULL
      WHERE id = ?
      `,
      search.id,
      externalId,
      businessName,
      normalizedPhone,
      address,
      normalizedCategory,
      normalizedCity,
      normalizedDistrict,
      lastMessageText,
      businessId
    );
  } else {
    const insertResult = await database.run(
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
      VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, 0, 'manual', 'pending', ?, ?, ?, NULL, NULL, 'replied', NULL, CURRENT_TIMESTAMP, ?, NULL)
      `,
      search.id,
      externalId,
      businessName,
      normalizedPhone,
      address,
      normalizedCategory,
      normalizedCity,
      normalizedDistrict,
      lastMessageText
    );

    businessId = insertResult.lastID;
  }

  const row = await database.get(
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
      category,
      city,
      district,
      lat,
      lng,
      whatsapp_status,
      template_sent_at,
      last_incoming_at,
      last_message_text,
      last_whatsapp_message_id,
      created_at
    FROM businesses
    WHERE id = ?
    `,
    businessId
  );

  return row ? mapBusinessRow(row) : null;
}

module.exports = {
  initDatabase,
  getCachedSearchResults,
  saveSearchResults,
  getSearchHistory,
  getSearchDetailsById,
  updateBusinessStatus,
  getBusinessesByStatus,

  getBusinessById,
  getBusinessesByWhatsAppStatus,
  updateBusinessWhatsAppStatus,
  markTemplateSent,
  markIncomingWhatsAppReply,

  saveLiveSupportLead,
  getLiveSupportLeads,
  updateLiveSupportLeadNote,
  clearLiveSupportLeads,
  getLiveSupportUnseenCount,
  markLiveSupportLeadsAsSeen,
  upsertManualMessageTestBusiness,

  authenticateUser,
  findUserByUsername,

  createDataDeletionRequest,
  getDataDeletionRequest,
};
