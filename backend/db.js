const path = require("path");
const crypto = require("crypto");
const { sql } = require("drizzle-orm");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { getDb } = require("./dbClient");
const {
  USER_ROLES,
  TEAMS,
  INTERACTION_CHANNELS,
  INTERACTION_OUTCOMES,
} = require("./dbConstants");

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "Mehmet.1823";

// ---------------------------------------------------------------------------
// Düşük seviyeli yardımcılar (Drizzle + raw SQL).
// getDb().execute(sqlQuery) node-postgres sonucunu döndürür: { rows, rowCount }.
// ---------------------------------------------------------------------------
async function execAll(query) {
  const result = await getDb().execute(query);
  return result.rows || [];
}

async function execGet(query) {
  const result = await getDb().execute(query);
  return (result.rows && result.rows[0]) || null;
}

async function execRun(query) {
  const result = await getDb().execute(query);
  return { changes: result.rowCount || 0, rows: result.rows || [] };
}

// businesses.phone üzerindeki boşluk/işaretleri temizleyen SQL ifadesi.
function normalizedBusinessPhoneSql() {
  return sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', '')`;
}

// ---------------------------------------------------------------------------
// Normalleştirme / yardımcı saf fonksiyonlar.
// ---------------------------------------------------------------------------
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
    email: row.email,
    instagram: row.instagram,
    socials: row.socials,
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

// ---------------------------------------------------------------------------
// Şema / başlatma.
// ---------------------------------------------------------------------------
async function initDatabase() {
  await migrate(getDb(), {
    migrationsFolder: path.join(__dirname, "migrations"),
  });

  await seedDefaultAdminUser();
  await seedDefaultTeams();

  console.log("PostgreSQL database hazır.");
}

// Varsayılan birimleri (idempotent) ekle. Yeni birimler panelden yönetilir.
async function seedDefaultTeams() {
  const defaults = [
    ["saha_pazarlama", "Saha Pazarlama"],
    ["reklam_pazarlama", "Reklam Pazarlama"],
    ["cagri_merkezi", "Çağrı Merkezi"],
  ];
  for (const [code, label] of defaults) {
    await execRun(
      sql`INSERT INTO teams (code, label) VALUES (${code}, ${label})
          ON CONFLICT (code) DO NOTHING`
    );
  }
}

async function listTeams() {
  const rows = await execAll(
    sql`SELECT id, code, label, created_at FROM teams ORDER BY label`
  );
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    label: r.label,
    createdAt: r.created_at,
  }));
}

async function teamExists(code) {
  if (!code) return false;
  const row = await execGet(sql`SELECT 1 FROM teams WHERE code = ${code}`);
  return !!row;
}

// Etiketten code (slug) üret.
function slugifyTeam(label) {
  return String(label || "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
    .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
    .replaceAll("İ", "i")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function createTeam({ label }) {
  const name = String(label || "").trim();
  if (!name) {
    const e = new Error("Birim adı boş olamaz.");
    e.statusCode = 400;
    throw e;
  }
  const code = slugifyTeam(name);
  if (!code) {
    const e = new Error("Geçerli bir birim adı girin.");
    e.statusCode = 400;
    throw e;
  }
  if (await teamExists(code)) {
    const e = new Error("Bu birim zaten mevcut.");
    e.statusCode = 409;
    throw e;
  }
  const row = await execGet(
    sql`INSERT INTO teams (code, label) VALUES (${code}, ${name})
        RETURNING id, code, label, created_at`
  );
  return { id: row.id, code: row.code, label: row.label, createdAt: row.created_at };
}

async function updateTeam(id, { label }) {
  const name = String(label || "").trim();
  if (!name) {
    const e = new Error("Birim adı boş olamaz.");
    e.statusCode = 400;
    throw e;
  }
  const row = await execGet(
    sql`UPDATE teams SET label = ${name} WHERE id = ${id}
        RETURNING id, code, label, created_at`
  );
  if (!row) {
    const e = new Error("Birim bulunamadı.");
    e.statusCode = 404;
    throw e;
  }
  return { id: row.id, code: row.code, label: row.label, createdAt: row.created_at };
}

async function deleteTeam(id) {
  const team = await execGet(sql`SELECT code FROM teams WHERE id = ${id}`);
  if (!team) {
    const e = new Error("Birim bulunamadı.");
    e.statusCode = 404;
    throw e;
  }
  const inUse = await execGet(
    sql`SELECT 1 FROM users WHERE team = ${team.code} LIMIT 1`
  );
  if (inUse) {
    const e = new Error(
      "Bu birime atanmış kullanıcılar var. Önce kullanıcıların birimini değiştirin."
    );
    e.statusCode = 409;
    throw e;
  }
  await execRun(sql`DELETE FROM teams WHERE id = ${id}`);
  return { id };
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
  const existing = await execGet(
    sql`SELECT id FROM users WHERE username = ${DEFAULT_ADMIN_USERNAME}`
  );

  if (existing) {
    return;
  }

  const { salt, hash } = hashPassword(DEFAULT_ADMIN_PASSWORD);

  await execRun(
    sql`
    INSERT INTO users (username, password_hash, password_salt, full_name, role)
    VALUES (${DEFAULT_ADMIN_USERNAME}, ${hash}, ${salt}, 'Sistem Yöneticisi', 'admin')
    `
  );

  console.log(
    `Varsayilan admin kullanicisi olusturuldu: ${DEFAULT_ADMIN_USERNAME}`
  );
}

// JS string dizisini Postgres text[] literaline çevirir ('{"a","b"}').
// Drizzle sql template'i dizi paramı olduğu gibi geçirmediği için gerekli.
function toPgTextArray(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return (
    "{" +
    values
      .map((v) => '"' + String(v).replace(/[\\"]/g, (m) => "\\" + m) + '"')
      .join(",") +
    "}"
  );
}

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name || null,
    role: row.role || "personnel",
    team: row.team || null,
    assignedCategories: row.assigned_categories || null,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

async function findUserByUsername(username) {
  return execGet(
    sql`
    SELECT id, username, password_hash, password_salt, full_name, role, team,
           is_active, created_at, updated_at, last_login_at
    FROM users
    WHERE username = ${String(username || "").trim()}
    `
  );
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

  // Pasif kullanıcılar giriş yapamaz.
  if (user.is_active === false) {
    return null;
  }

  const isValid = verifyPassword(
    password,
    user.password_salt,
    user.password_hash
  );

  if (!isValid) {
    return null;
  }

  // Son giriş zamanını güncelle (best-effort).
  await execRun(sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`);

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name || null,
    role: user.role || "personnel",
    team: user.team || null,
    createdAt: user.created_at,
  };
}

async function getUserById(userId) {
  const row = await execGet(
    sql`
    SELECT id, username, full_name, role, team, assigned_categories, is_active, created_at, last_login_at
    FROM users
    WHERE id = ${userId}
    `
  );

  return mapUserRow(row);
}

async function listUsers() {
  const rows = await execAll(
    sql`
    SELECT id, username, full_name, role, team, assigned_categories, is_active, created_at, last_login_at
    FROM users
    ORDER BY created_at ASC, id ASC
    `
  );

  return rows.map(mapUserRow);
}

// Admin tarafından yeni kullanıcı oluşturur. role/team doğrulanır.
async function createUser({
  username,
  password,
  fullName = null,
  role = "personnel",
  team = null,
  createdBy = null,
}) {
  const normalizedUsername = String(username || "").trim();

  if (!normalizedUsername) {
    const err = new Error("Kullanıcı adı zorunludur.");
    err.statusCode = 400;
    throw err;
  }

  if (!password || String(password).length < 6) {
    const err = new Error("Şifre en az 6 karakter olmalıdır.");
    err.statusCode = 400;
    throw err;
  }

  if (!USER_ROLES.includes(role)) {
    const err = new Error("Geçersiz rol.");
    err.statusCode = 400;
    throw err;
  }

  // admin'in birimi olmaz; personel için birim zorunludur.
  let normalizedTeam = team || null;
  if (role === "admin") {
    normalizedTeam = null;
  } else {
    if (!normalizedTeam || !(await teamExists(normalizedTeam))) {
      const err = new Error("Personel için geçerli bir birim seçilmelidir.");
      err.statusCode = 400;
      throw err;
    }
  }

  const { salt, hash } = hashPassword(password);

  try {
    const row = await execGet(
      sql`
      INSERT INTO users (username, password_hash, password_salt, full_name, role, team, created_by)
      VALUES (${normalizedUsername}, ${hash}, ${salt}, ${
        fullName || null
      }, ${role}, ${normalizedTeam}, ${createdBy})
      RETURNING id, username, full_name, role, team, is_active, created_at, last_login_at
      `
    );

    return mapUserRow(row);
  } catch (error) {
    // Drizzle, pg hatasını DrizzleQueryError içinde error.cause olarak sarar.
    const pgCode = error?.code || error?.cause?.code;
    if (pgCode === "23505") {
      const err = new Error("Bu kullanıcı adı zaten kullanılıyor.");
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
}

// Mevcut admin'in şifresini günceller (varsa). Boot'ta varsayılan admin şifresini
// (.env / DEFAULT) ile senkron tutmak için kullanılır.
async function setUserPasswordByUsername(username, password) {
  const { salt, hash } = hashPassword(password);
  const result = await execRun(
    sql`
    UPDATE users
    SET password_hash = ${hash}, password_salt = ${salt}, updated_at = now()
    WHERE username = ${String(username || "").trim()}
    `
  );
  return result.changes > 0;
}

// Admin tarafından mevcut kullanıcıyı kısmi olarak günceller. Yalnızca verilen
// alanlar uygulanır. role/team kuralları createUser ile aynıdır (admin'in team'i
// olmaz; personnel için geçerli bir team gereklidir).
async function updateUser(userId, patch = {}) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("Geçersiz kullanıcı id.");
    err.statusCode = 400;
    throw err;
  }

  const current = await execGet(
    sql`SELECT id, username, role, team FROM users WHERE id = ${id}`
  );
  if (!current) {
    const err = new Error("Kullanıcı bulunamadı.");
    err.statusCode = 404;
    throw err;
  }

  const updates = {};

  if (patch.username !== undefined) {
    const normalized = String(patch.username || "").trim();
    if (!normalized || normalized.length < 3) {
      const err = new Error("Kullanıcı adı en az 3 karakter olmalıdır.");
      err.statusCode = 400;
      throw err;
    }
    updates.username = normalized;
  }

  if (patch.fullName !== undefined) {
    const value = patch.fullName === null ? null : String(patch.fullName).trim();
    updates.fullName = value || null;
  }

  // role/team birlikte değerlendirilir: nihai role admin ise team null'a çekilir;
  // nihai role personnel ise team zorunludur (mevcut team korunabilir).
  let finalRole = current.role;
  let finalTeam = current.team;

  if (patch.role !== undefined) {
    if (!USER_ROLES.includes(patch.role)) {
      const err = new Error("Geçersiz rol.");
      err.statusCode = 400;
      throw err;
    }
    finalRole = patch.role;
  }

  if (patch.team !== undefined) {
    finalTeam = patch.team || null;
  }

  if (finalRole === "admin") {
    finalTeam = null;
  } else if (!finalTeam || !(await teamExists(finalTeam))) {
    const err = new Error("Personel için geçerli bir birim seçilmelidir.");
    err.statusCode = 400;
    throw err;
  }

  if (patch.role !== undefined) updates.role = finalRole;
  if (patch.role !== undefined || patch.team !== undefined) updates.team = finalTeam;

  if (patch.isActive !== undefined) {
    updates.isActive = Boolean(patch.isActive);
  }

  // Kategori ataması: dolu dizi → kaydet, boş dizi/null → temizle.
  if (patch.assignedCategories !== undefined) {
    updates.assignedCategories = toPgTextArray(patch.assignedCategories);
  }

  if (patch.password !== undefined && patch.password !== null && patch.password !== "") {
    if (String(patch.password).length < 6) {
      const err = new Error("Şifre en az 6 karakter olmalıdır.");
      err.statusCode = 400;
      throw err;
    }
    const { salt, hash } = hashPassword(patch.password);
    updates.passwordHash = hash;
    updates.passwordSalt = salt;
  }

  if (Object.keys(updates).length === 0) {
    return getUserById(id);
  }

  try {
    await execRun(sql`
      UPDATE users SET
        username       = ${updates.username       ?? current.username},
        full_name      = ${updates.fullName       !== undefined ? updates.fullName       : sql`full_name`},
        role           = ${updates.role           ?? finalRole},
        team           = ${updates.team           !== undefined ? updates.team           : sql`team`},
        assigned_categories = ${updates.assignedCategories !== undefined ? sql`${updates.assignedCategories}::text[]` : sql`assigned_categories`},
        is_active      = ${updates.isActive       !== undefined ? updates.isActive       : sql`is_active`},
        password_hash  = ${updates.passwordHash   !== undefined ? updates.passwordHash   : sql`password_hash`},
        password_salt  = ${updates.passwordSalt   !== undefined ? updates.passwordSalt   : sql`password_salt`},
        updated_at     = now()
      WHERE id = ${id}
    `);
  } catch (error) {
    const pgCode = error?.code || error?.cause?.code;
    if (pgCode === "23505") {
      const err = new Error("Bu kullanıcı adı zaten kullanılıyor.");
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }

  return getUserById(id);
}

// Admin tarafından kullanıcı silinir. İlgili FK'ler `ON DELETE SET NULL`
// olduğundan veri kaybı olmadan satır kaldırılır.
async function deleteUser(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("Geçersiz kullanıcı id.");
    err.statusCode = 400;
    throw err;
  }

  const result = await execRun(sql`DELETE FROM users WHERE id = ${id}`);
  return (result?.changes ?? result?.rowCount ?? 0) > 0;
}

async function getCachedSearchResults({ category, city, district }) {
  const searchKey = createSearchKey({ category, city, district });

  const search = await execGet(
    sql`SELECT * FROM searches WHERE search_key = ${searchKey}`
  );

  if (!search) {
    return null;
  }

  const rows = await execAll(
    sql`
    SELECT
      id, external_id, name, phone, email, instagram, socials, address,
      website, google_maps_url, rating, user_rating_count, source, status,
      category, city, district, lat, lng, whatsapp_status, template_sent_at,
      last_incoming_at, last_message_text, last_whatsapp_message_id, created_at
    FROM businesses
    WHERE search_id = ${search.id} AND status <> 'rejected'
    ORDER BY id ASC
    `
  );

  return {
    search,
    businesses: rows.map(mapBusinessRow),
  };
}

async function saveSearchResults({ category, city, district, businesses }) {
  const searchKey = createSearchKey({ category, city, district });

  await execRun(
    sql`
    INSERT INTO searches (search_key, category, city, district)
    VALUES (${searchKey}, ${category}, ${city}, ${district})
    ON CONFLICT(search_key) DO UPDATE SET
      category = excluded.category,
      city = excluded.city,
      district = excluded.district,
      updated_at = now()
    `
  );

  const search = await execGet(
    sql`SELECT * FROM searches WHERE search_key = ${searchKey}`
  );

  const existingBusinesses = await execAll(
    sql`
    SELECT
      id, external_id, name, phone, address, google_maps_url, status,
      whatsapp_status, template_sent_at, last_incoming_at, last_message_text,
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

  await execRun(sql`DELETE FROM businesses WHERE search_id = ${search.id}`);

  for (const business of businesses) {
    const businessKey = createBusinessIdentityKey(business);
    const previousBusinessState = existingBusinessStateMap.get(businessKey) || {};

    const preservedStatus =
      previousBusinessState.status || business.status || "pending";

    const preservedWhatsAppStatus =
      previousBusinessState.whatsappStatus ||
      business.whatsappStatus ||
      "not_sent";

    await execRun(
      sql`
      INSERT INTO businesses (
        search_id, external_id, name, phone, email, instagram, socials,
        address, website, google_maps_url, rating, user_rating_count, source,
        status, category, city, district, lat, lng, whatsapp_status,
        template_sent_at, last_incoming_at, last_message_text,
        last_whatsapp_message_id
      )
      VALUES (
        ${search.id},
        ${business.externalId || business.id || null},
        ${business.name || null},
        ${business.phone || null},
        ${business.email || null},
        ${business.instagram || null},
        ${business.socials || null},
        ${business.address || null},
        ${business.website || null},
        ${business.googleMapsUrl || null},
        ${business.rating || null},
        ${business.userRatingCount || 0},
        ${business.source || "google_places"},
        ${preservedStatus},
        ${business.category || null},
        ${business.city || null},
        ${business.district || null},
        ${business.lat || business.location?.latitude || null},
        ${business.lng || business.location?.longitude || null},
        ${preservedWhatsAppStatus},
        ${previousBusinessState.templateSentAt || business.templateSentAt || null},
        ${previousBusinessState.lastIncomingAt || business.lastIncomingAt || null},
        ${previousBusinessState.lastMessageText || business.lastMessageText || null},
        ${
          previousBusinessState.lastWhatsappMessageId ||
          business.lastWhatsappMessageId ||
          null
        }
      )
      `
    );
  }

  return search.id;
}

// "Yeni sorgu" (fresh) için: mevcut kayıtları SİLMEDEN, sadece bu sorguya ait
// işletmelerden DB'de henüz bulunmayan (kimlik anahtarına göre benzersiz) yeni
// kayıtları ekler. Mevcut işletmelerin durum/WhatsApp state'i korunur.
// Döndürür: { searchId, addedCount }.
async function mergeSearchResults({ category, city, district, businesses }) {
  const searchKey = createSearchKey({ category, city, district });

  await execRun(
    sql`
    INSERT INTO searches (search_key, category, city, district, last_fetched_at)
    VALUES (${searchKey}, ${category}, ${city}, ${district}, now())
    ON CONFLICT(search_key) DO UPDATE SET
      category = excluded.category,
      city = excluded.city,
      district = excluded.district,
      last_fetched_at = now(),
      updated_at = now()
    `
  );

  const search = await execGet(
    sql`SELECT * FROM searches WHERE search_key = ${searchKey}`
  );

  // Bu sorguya ait mevcut işletmelerin kimlik anahtarları (benzersizlik için).
  const existingRows = await execAll(
    sql`
    SELECT id, external_id, name, phone, address, google_maps_url
    FROM businesses
    WHERE search_id = ${search.id}
    `
  );

  const existingKeys = new Set(
    existingRows.map((row) => createBusinessIdentityKey(row))
  );

  let addedCount = 0;

  for (const business of businesses) {
    const key = createBusinessIdentityKey(business);

    // Zaten varsa atla (yeni veri değil).
    if (existingKeys.has(key)) {
      continue;
    }

    existingKeys.add(key);

    await execRun(
      sql`
      INSERT INTO businesses (
        search_id, external_id, name, phone, email, instagram, socials,
        address, website, google_maps_url, rating, user_rating_count, source,
        status, category, city, district, lat, lng, whatsapp_status,
        template_sent_at, last_incoming_at, last_message_text,
        last_whatsapp_message_id
      )
      VALUES (
        ${search.id},
        ${business.externalId || business.id || null},
        ${business.name || null},
        ${business.phone || null},
        ${business.email || null},
        ${business.instagram || null},
        ${business.socials || null},
        ${business.address || null},
        ${business.website || null},
        ${business.googleMapsUrl || null},
        ${business.rating || null},
        ${business.userRatingCount || 0},
        ${business.source || "google_places"},
        ${business.status || "pending"},
        ${business.category || null},
        ${business.city || null},
        ${business.district || null},
        ${business.lat || business.location?.latitude || null},
        ${business.lng || business.location?.longitude || null},
        ${business.whatsappStatus || "not_sent"},
        ${business.templateSentAt || null},
        ${business.lastIncomingAt || null},
        ${business.lastMessageText || null},
        ${business.lastWhatsappMessageId || null}
      )
      `
    );

    addedCount += 1;
  }

  return { searchId: search.id, addedCount };
}

async function getSearchHistory() {
  return execAll(sql`
    SELECT
      s.id,
      s.category,
      s.city,
      s.district,
      s.created_at,
      s.updated_at,
      COUNT(b.id)::int AS "totalBusinesses",
      SUM(CASE WHEN b.phone IS NOT NULL AND b.phone != '' THEN 1 ELSE 0 END)::int AS "phonesFound",
      SUM(CASE WHEN b.status = 'approved' THEN 1 ELSE 0 END)::int AS "approvedCount",
      SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END)::int AS "pendingCount",
      SUM(CASE WHEN b.status = 'rejected' THEN 1 ELSE 0 END)::int AS "rejectedCount"
    FROM searches s
    LEFT JOIN businesses b ON b.search_id = s.id
    GROUP BY s.id
    ORDER BY s.updated_at DESC
  `);
}

async function getSearchDetailsById(searchId) {
  const search = await execGet(
    sql`SELECT * FROM searches WHERE id = ${searchId}`
  );

  if (!search) {
    return null;
  }

  const rows = await execAll(
    sql`
    SELECT
      id, external_id, name, phone, email, instagram, socials, address,
      website, google_maps_url, rating, user_rating_count, source, status,
      category, city, district, lat, lng, whatsapp_status, template_sent_at,
      last_incoming_at, last_message_text, last_whatsapp_message_id, created_at
    FROM businesses
    WHERE search_id = ${searchId} AND status <> 'rejected'
    ORDER BY id ASC
    `
  );

  return {
    search,
    businesses: rows.map(mapBusinessRow),
  };
}

async function updateBusinessStatus(businessId, status) {
  validateBusinessStatus(status);

  const result = await execRun(
    sql`UPDATE businesses SET status = ${status} WHERE id = ${businessId}`
  );

  if (result.changes === 0) {
    return null;
  }

  const updatedBusiness = await execGet(
    sql`
    SELECT
      id, external_id, name, phone, email, instagram, socials, address,
      website, google_maps_url, rating, user_rating_count, source, status,
      category, city, district, lat, lng, whatsapp_status, template_sent_at,
      last_incoming_at, last_message_text, last_whatsapp_message_id, created_at
    FROM businesses
    WHERE id = ${businessId}
    `
  );

  return mapBusinessRow(updatedBusiness);
}

async function getBusinessesByStatus(status) {
  validateBusinessStatus(status);

  const rows = await execAll(
    sql`
    SELECT
      b.id, b.external_id, b.name, b.phone, b.address, b.website,
      b.google_maps_url, b.rating, b.user_rating_count, b.source, b.status,
      b.lat, b.lng, b.whatsapp_status, b.template_sent_at, b.last_incoming_at,
      b.last_message_text, b.last_whatsapp_message_id, b.created_at,
      s.category, s.city, s.district
    FROM businesses b
    LEFT JOIN searches s ON s.id = b.search_id
    WHERE b.status = ${status}
    ORDER BY b.created_at DESC, b.id DESC
    `
  );

  return rows.map(mapBusinessRow);
}

async function getBusinessById(businessId) {
  const row = await execGet(
    sql`
    SELECT
      id, external_id, name, phone, address, website, google_maps_url, rating,
      user_rating_count, source, status, lat, lng, whatsapp_status,
      template_sent_at, last_incoming_at, last_message_text,
      last_whatsapp_message_id, category, city, district, created_at
    FROM businesses
    WHERE id = ${businessId}
    `
  );

  if (!row) {
    return null;
  }

  return mapBusinessRow(row);
}

async function getBusinessesByWhatsAppStatus(whatsappStatus = "all") {
  const normalizedStatus = String(whatsappStatus || "all")
    .trim()
    .toLowerCase();

  let rows;

  if (normalizedStatus === "all") {
    rows = await execAll(sql`
      SELECT
        id, external_id, name, phone, address, website, google_maps_url, rating,
        user_rating_count, source, status, lat, lng, whatsapp_status,
        template_sent_at, last_incoming_at, last_message_text,
        last_whatsapp_message_id, category, city, district, created_at
      FROM businesses
      ORDER BY created_at DESC, id DESC
    `);
  } else {
    validateWhatsAppStatus(normalizedStatus);

    rows = await execAll(sql`
      SELECT
        id, external_id, name, phone, address, website, google_maps_url, rating,
        user_rating_count, source, status, lat, lng, whatsapp_status,
        template_sent_at, last_incoming_at, last_message_text,
        last_whatsapp_message_id, category, city, district, created_at
      FROM businesses
      WHERE whatsapp_status = ${normalizedStatus}
      ORDER BY created_at DESC, id DESC
    `);
  }

  return rows.map(mapBusinessRow);
}

async function updateBusinessWhatsAppStatus(businessId, whatsappStatus) {
  validateWhatsAppStatus(whatsappStatus);

  const result = await execRun(
    sql`UPDATE businesses SET whatsapp_status = ${whatsappStatus} WHERE id = ${businessId}`
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

  const result = await execRun(
    sql`
    UPDATE businesses
    SET
      whatsapp_status = ${whatsappStatus},
      template_sent_at = now(),
      last_whatsapp_message_id = ${messageId}
    WHERE id = ${businessId}
    `
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
  const normalizedPhone = String(phone || "").replace(/\D/g, "");

  if (!normalizedPhone) {
    return null;
  }

  const row = await execGet(
    sql`
    SELECT id
    FROM businesses
    WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE ${
      "%" + normalizedPhone.slice(-10) + "%"
    }
    ORDER BY id DESC
    LIMIT 1
    `
  );

  if (!row) {
    return null;
  }

  await execRun(
    sql`
    UPDATE businesses
    SET
      whatsapp_status = 'replied',
      last_incoming_at = now(),
      last_message_text = ${messageText},
      last_whatsapp_message_id = ${messageId}
    WHERE id = ${row.id}
    `
  );

  return getBusinessById(row.id);
}

const LIVE_SUPPORT_STATUSES = ["info_requested", "follow_up", "not_interested"];

async function saveLiveSupportLead({
  phone,
  buttonText = "Bilgi almak istiyorum",
  status = "info_requested",
  messageId = null,
}) {
  const normalizedPhone = String(phone || "").replace(/\D/g, "");

  if (!normalizedPhone) {
    return null;
  }

  const safeStatus = LIVE_SUPPORT_STATUSES.includes(status)
    ? status
    : "info_requested";

  await execRun(
    sql`
    INSERT INTO live_support_leads (phone, button_text, status, message_id, seen_at)
    VALUES (${normalizedPhone}, ${buttonText}, ${safeStatus}, ${messageId}, NULL)
    ON CONFLICT(phone) DO UPDATE SET
      button_text = excluded.button_text,
      status = excluded.status,
      message_id = excluded.message_id,
      seen_at = NULL,
      updated_at = now()
    `
  );

  return execGet(
    sql`
    SELECT id, phone, button_text, status, note, message_id, seen_at,
           created_at, updated_at
    FROM live_support_leads
    WHERE phone = ${normalizedPhone}
    `
  );
}

// Bir telefon numarasına (son 10 hane) karşılık gelen işletmeyi bulur.
async function findBusinessByPhone(normalizedPhone) {
  const last10 = String(normalizedPhone || "").slice(-10);

  if (last10.length < 7) {
    return null;
  }

  return execGet(
    sql`
    SELECT id, name, email, instagram, socials, address, website,
           whatsapp_status, status, source, category, city, district
    FROM businesses
    WHERE ${normalizedBusinessPhoneSql()} LIKE ${"%" + last10}
    ORDER BY id DESC
    LIMIT 1
    `
  );
}

// Giden/gelen bir WhatsApp mesajını konuşma geçmişi tablosuna kaydeder.
async function logWhatsAppMessage({
  phone,
  businessId = null,
  direction,
  type = "text",
  text = "",
  messageId = null,
}) {
  const normalizedPhone = String(phone || "").replace(/\D/g, "");

  if (!normalizedPhone || !direction) {
    return null;
  }

  await execRun(
    sql`
    INSERT INTO whatsapp_messages (phone, business_id, direction, type, text, message_id)
    VALUES (${normalizedPhone}, ${businessId}, ${direction}, ${type}, ${String(
      text || ""
    )}, ${messageId})
    `
  );

  return true;
}

// Bir telefon numarasının (son 10 hane) en son aktif olduğu güne ait
// WhatsApp konuşmasını (giden + gelen mesajlar) zaman sırasıyla döndürür.
async function getWhatsAppConversationByPhone(phone) {
  const last10 = String(phone || "")
    .replace(/\D/g, "")
    .slice(-10);

  if (last10.length < 7) {
    return [];
  }

  const lastDayRow = await execGet(
    sql`
    SELECT (MAX(created_at))::date AS "lastDay"
    FROM whatsapp_messages
    WHERE phone LIKE ${"%" + last10}
    `
  );

  if (!lastDayRow?.lastDay) {
    return [];
  }

  const rows = await execAll(
    sql`
    SELECT id, direction, type, text, message_id, created_at
    FROM whatsapp_messages
    WHERE phone LIKE ${"%" + last10} AND created_at::date = ${lastDayRow.lastDay}::date
    ORDER BY created_at ASC, id ASC
    `
  );

  return rows.map((row) => ({
    id: row.id,
    direction: row.direction,
    type: row.type,
    text: row.text,
    messageId: row.message_id,
    createdAt: row.created_at,
  }));
}

// UTC olarak saklanan created_at değerinin şu andan kaç ms önce olduğunu döndürür.
function msSince(createdAt) {
  if (!createdAt) return Infinity;
  const t = new Date(String(createdAt).replace(" ", "T") + "Z").getTime();
  if (Number.isNaN(t)) return Infinity;
  return Date.now() - t;
}

// WhatsApp gelen kutusu için sohbet listesi.
async function getWhatsAppConversations() {
  const rows = await execAll(sql`
    SELECT phone, direction, type, text, read_at, created_at
    FROM whatsapp_messages
    ORDER BY created_at ASC, id ASC
  `);

  const groups = new Map();

  for (const row of rows) {
    const key = String(row.phone || "")
      .replace(/\D/g, "")
      .slice(-10);
    if (key.length < 7) continue;

    let group = groups.get(key);
    if (!group) {
      group = {
        contactKey: key,
        phone: row.phone,
        lastMessage: null,
        lastMessageAt: null,
        lastIncomingAt: null,
        unreadCount: 0,
      };
      groups.set(key, group);
    }

    // Ülke kodlu (daha uzun) numarayı temsilci olarak tut.
    if (
      String(row.phone).replace(/\D/g, "").length >
      String(group.phone).replace(/\D/g, "").length
    ) {
      group.phone = row.phone;
    }

    group.lastMessage = {
      direction: row.direction,
      text: row.text,
      type: row.type,
    };
    group.lastMessageAt = row.created_at;

    if (row.direction === "incoming") {
      group.lastIncomingAt = row.created_at;
      if (!row.read_at) group.unreadCount += 1;
    }
  }

  // Geçmiş sohbetler: mesaj logunda olmayan ama WhatsApp geçmişi olan işletmeler.
  const historyRows = await execAll(sql`
    SELECT name, phone, last_message_text, last_incoming_at, template_sent_at
    FROM businesses
    WHERE phone IS NOT NULL AND TRIM(phone) != ''
      AND (
        template_sent_at IS NOT NULL
        OR last_incoming_at IS NOT NULL
        OR (last_message_text IS NOT NULL AND TRIM(last_message_text) != '')
      )
  `);

  for (const business of historyRows) {
    const key = String(business.phone).replace(/\D/g, "").slice(-10);
    if (key.length < 7 || groups.has(key)) continue;

    const hasReply =
      business.last_incoming_at ||
      (business.last_message_text && business.last_message_text.trim());

    groups.set(key, {
      contactKey: key,
      phone: business.phone,
      businessName: business.name || null,
      historical: true,
      lastMessage: hasReply
        ? { direction: "incoming", text: business.last_message_text || "(mesaj)" }
        : { direction: "outgoing", text: "Template gönderildi" },
      lastMessageAt: business.last_incoming_at || business.template_sent_at,
      lastIncomingAt: business.last_incoming_at || null,
      unreadCount: 0,
    });
  }

  // İşletme adlarını N+1 yerine tek sorguyla topla: telefonun son 10 hanesine
  // göre isim eşle (aynı sonek için en yüksek id kazanır — findBusinessByPhone
  // ile aynı davranış). Aksi halde her sohbet için `businesses` üzerinde ayrı
  // seq scan çalışır ve pool tükenip endpoint asılır.
  const businessRows = await execAll(sql`
    SELECT id, name,
           RIGHT(${normalizedBusinessPhoneSql()}, 10) AS phone_last10
    FROM businesses
    WHERE phone IS NOT NULL AND TRIM(phone) != ''
    ORDER BY id ASC
  `);

  const nameByPhoneKey = new Map();
  for (const row of businessRows) {
    const key = String(row.phone_last10 || "");
    if (key.length < 7) continue;
    // Son yazan (en yüksek id) kazansın — findBusinessByPhone DESC/LIMIT 1 gibi.
    nameByPhoneKey.set(key, row.name || null);
  }

  const conversations = Array.from(groups.values()).map((group) => ({
    contactKey: group.contactKey,
    phone: group.phone,
    businessName:
      group.businessName || nameByPhoneKey.get(group.contactKey) || null,
    lastMessage: group.lastMessage,
    lastMessageAt: group.lastMessageAt,
    lastIncomingAt: group.lastIncomingAt,
    unreadCount: group.unreadCount,
    // 24 saat müşteri hizmetleri penceresi açık mı (serbest metin için)
    canSendFreeText:
      group.lastIncomingAt != null &&
      msSince(group.lastIncomingAt) < 24 * 60 * 60 * 1000,
  }));

  conversations.sort((a, b) =>
    String(b.lastMessageAt || "").localeCompare(String(a.lastMessageAt || ""))
  );

  return conversations;
}

// Bir numaranın (son 10 hane) TÜM mesaj geçmişini döndürür.
async function getWhatsAppMessagesForPhone(phone) {
  const last10 = String(phone || "")
    .replace(/\D/g, "")
    .slice(-10);
  if (last10.length < 7) return { messages: [], canSendFreeText: false };

  const rows = await execAll(
    sql`
    SELECT id, direction, type, text, message_id, created_at
    FROM whatsapp_messages
    WHERE phone LIKE ${"%" + last10}
    ORDER BY created_at ASC, id ASC
    `
  );

  // Mesaj logu boşsa (geçmiş sohbet) işletme geçmişinden sentetik baloncuk üret.
  if (rows.length === 0) {
    const business = await execGet(
      sql`
      SELECT last_message_text, last_incoming_at, template_sent_at
      FROM businesses
      WHERE ${normalizedBusinessPhoneSql()} LIKE ${"%" + last10}
      ORDER BY id DESC
      LIMIT 1
      `
    );

    const synthetic = [];

    if (business?.template_sent_at) {
      synthetic.push({
        id: "history-template",
        direction: "outgoing",
        type: "template",
        text: "Template gönderildi",
        messageId: null,
        createdAt: business.template_sent_at,
      });
    }

    if (business?.last_message_text && business.last_message_text.trim()) {
      synthetic.push({
        id: "history-incoming",
        direction: "incoming",
        type: "text",
        text: business.last_message_text,
        messageId: null,
        createdAt: business.last_incoming_at || business.template_sent_at,
      });
    }

    return {
      messages: synthetic,
      historical: synthetic.length > 0,
      canSendFreeText:
        business?.last_incoming_at != null &&
        msSince(business.last_incoming_at) < 24 * 60 * 60 * 1000,
    };
  }

  const lastIncoming = [...rows]
    .reverse()
    .find((row) => row.direction === "incoming");

  return {
    messages: rows.map((row) => ({
      id: row.id,
      direction: row.direction,
      type: row.type,
      text: row.text,
      messageId: row.message_id,
      createdAt: row.created_at,
    })),
    canSendFreeText:
      lastIncoming != null &&
      msSince(lastIncoming.created_at) < 24 * 60 * 60 * 1000,
  };
}

// Bir numaraya ait okunmamış gelen mesajları okundu işaretler.
// Sidebar bildirimi: okunmamış gelen WhatsApp mesajı sayısı.
async function getWhatsAppUnreadCount() {
  const row = await execGet(
    sql`SELECT COUNT(*)::int AS count FROM whatsapp_messages
        WHERE direction = 'incoming' AND read_at IS NULL`
  );
  return row?.count || 0;
}

async function markWhatsAppConversationRead(phone) {
  const last10 = String(phone || "")
    .replace(/\D/g, "")
    .slice(-10);
  if (last10.length < 7) return { updatedCount: 0 };

  const result = await execRun(
    sql`
    UPDATE whatsapp_messages
    SET read_at = now()
    WHERE direction = 'incoming' AND read_at IS NULL AND phone LIKE ${
      "%" + last10
    }
    `
  );

  return { updatedCount: result.changes || 0 };
}

// Bir telefon için işletme bilgisi + canlı destek durumunu döndürür.
async function getWhatsAppContactInfo(phone) {
  const last10 = String(phone || "")
    .replace(/\D/g, "")
    .slice(-10);
  if (last10.length < 7) return { business: null, lead: null };

  const business = await findBusinessByPhone(last10);

  const lead = await execGet(
    sql`
    SELECT status, result, meeting_at, assigned_to
    FROM live_support_leads
    WHERE phone LIKE ${"%" + last10}
    ORDER BY id DESC
    LIMIT 1
    `
  );

  return {
    business: business
      ? {
          id: business.id,
          name: business.name,
          source: business.source,
          category: business.category,
          city: business.city,
          district: business.district,
          address: business.address,
          website: business.website,
          email: business.email,
          socials: business.socials || business.instagram || null,
        }
      : null,
    lead: lead
      ? {
          status: lead.status || "info_requested",
          result: lead.result || "pending",
          meetingAt: lead.meeting_at,
          assignedTo: lead.assigned_to,
        }
      : null,
  };
}

// WhatsApp sohbetinden sonuç + görüşme tarihi belirleyip lead oluşturur/günceller.
async function upsertLiveSupportOutcome({
  phone,
  result,
  meetingAt,
  buttonText = "Panelden eklendi",
}) {
  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  if (!normalizedPhone) return null;

  const safeResult = LIVE_SUPPORT_RESULTS.includes(result) ? result : "pending";

  await execRun(
    sql`
    INSERT INTO live_support_leads (phone, button_text, status, result, meeting_at, seen_at)
    VALUES (${normalizedPhone}, ${buttonText}, 'info_requested', ${safeResult}, ${
      meetingAt || null
    }, NULL)
    ON CONFLICT(phone) DO UPDATE SET
      result = excluded.result,
      meeting_at = excluded.meeting_at,
      updated_at = now()
    `
  );

  return getWhatsAppContactInfo(normalizedPhone);
}

async function getLiveSupportLeads() {
  const rows = await execAll(sql`
    SELECT
      id, phone, button_text, status, result, meeting_at, assigned_to, note,
      message_id, seen_at, created_at, updated_at
    FROM live_support_leads
    ORDER BY updated_at DESC, id DESC
  `);

  return Promise.all(
    rows.map(async (row) => {
      const business = await findBusinessByPhone(row.phone);
      const conversation = await getWhatsAppConversationByPhone(row.phone);

      return {
        id: row.id,
        phone: row.phone,
        buttonText: row.button_text,
        status: row.status || "info_requested",
        result: row.result || "pending",
        meetingAt: row.meeting_at,
        assignedTo: row.assigned_to,
        note: row.note || "",
        messageId: row.message_id,
        seenAt: row.seen_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        businessId: business?.id || null,
        businessName: business?.name || null,
        email: business?.email || null,
        instagram: business?.instagram || null,
        socials: business?.socials || null,
        address: business?.address || null,
        website: business?.website || null,

        conversation,
      };
    })
  );
}

// Belirli tarih aralığında (created_at, gün bazında dahil) rapor verisi üretir.
async function getReportData({ from, to }) {
  const supportRows = await execAll(
    sql`
    SELECT id, phone, button_text, status, result, meeting_at, assigned_to,
           note, created_at, updated_at
    FROM live_support_leads
    WHERE created_at::date BETWEEN ${from}::date AND ${to}::date
    ORDER BY created_at DESC, id DESC
    `
  );

  const enrichedSupport = await Promise.all(
    supportRows.map(async (row) => {
      const business = await findBusinessByPhone(row.phone);

      return {
        id: row.id,
        phone: row.phone,
        status: row.status || "info_requested",
        result: row.result || "pending",
        meetingAt: row.meeting_at,
        assignedTo: row.assigned_to,
        buttonText: row.button_text,
        note: row.note || "",
        createdAt: row.created_at,
        businessName: business?.name || null,
        email: business?.email || null,
        socials: business?.socials || business?.instagram || null,
        address: business?.address || null,
        website: business?.website || null,
      };
    })
  );

  const interested = enrichedSupport.filter(
    (lead) => lead.status === "info_requested"
  );
  const followUp = enrichedSupport.filter((lead) => lead.status === "follow_up");
  const notInterested = enrichedSupport.filter(
    (lead) => lead.status === "not_interested"
  );

  const approvedRows = await execAll(
    sql`
    SELECT id, name, phone, email, instagram, socials, address, website, created_at
    FROM businesses
    WHERE status = 'approved' AND created_at::date BETWEEN ${from}::date AND ${to}::date
    ORDER BY created_at DESC, id DESC
    `
  );

  const approved = approvedRows.map((row) => ({
    id: row.id,
    businessName: row.name,
    phone: row.phone,
    email: row.email,
    socials: row.socials || row.instagram,
    address: row.address,
    website: row.website,
    createdAt: row.created_at,
  }));

  return {
    range: { from, to },
    stats: {
      interested: interested.length,
      approved: approved.length,
      followUp: followUp.length,
      notInterested: notInterested.length,
    },
    categories: {
      interested,
      approved,
      followUp,
      notInterested,
    },
  };
}

async function updateLiveSupportLeadNote(leadId, note) {
  const result = await execRun(
    sql`
    UPDATE live_support_leads
    SET note = ${note}, updated_at = now()
    WHERE id = ${leadId}
    `
  );

  if (result.changes === 0) {
    return null;
  }

  const row = await execGet(
    sql`
    SELECT id, phone, button_text, status, note, message_id, seen_at,
           created_at, updated_at
    FROM live_support_leads
    WHERE id = ${leadId}
    `
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

const LIVE_SUPPORT_RESULTS = [
  "pending",
  "to_meet",
  "contacted",
  "record_taken",
  "rejected",
  "completed",
];

// Bir canlı destek lead'inin gönderilen alanlarını günceller.
async function updateLiveSupportLead(leadId, fields = {}) {
  const sets = [];

  if (fields.note !== undefined) {
    sets.push(sql`note = ${String(fields.note || "")}`);
  }

  if (fields.result !== undefined) {
    const safeResult = LIVE_SUPPORT_RESULTS.includes(fields.result)
      ? fields.result
      : "pending";
    sets.push(sql`result = ${safeResult}`);
  }

  if (fields.meetingAt !== undefined) {
    sets.push(sql`meeting_at = ${fields.meetingAt || null}`);
  }

  if (fields.assignedTo !== undefined) {
    sets.push(sql`assigned_to = ${fields.assignedTo || null}`);
  }

  if (sets.length === 0) {
    return null;
  }

  sets.push(sql`updated_at = now()`);

  const result = await execRun(
    sql`UPDATE live_support_leads SET ${sql.join(sets, sql`, `)} WHERE id = ${leadId}`
  );

  if (result.changes === 0) {
    return null;
  }

  const row = await execGet(
    sql`
    SELECT id, phone, button_text, status, result, meeting_at, assigned_to,
           note, message_id, seen_at, created_at, updated_at
    FROM live_support_leads
    WHERE id = ${leadId}
    `
  );

  const business = await findBusinessByPhone(row.phone);

  return {
    id: row.id,
    phone: row.phone,
    buttonText: row.button_text,
    status: row.status || "info_requested",
    result: row.result || "pending",
    meetingAt: row.meeting_at,
    assignedTo: row.assigned_to,
    note: row.note || "",
    messageId: row.message_id,
    seenAt: row.seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    businessId: business?.id || null,
    businessName: business?.name || null,
    email: business?.email || null,
    instagram: business?.instagram || null,
    socials: business?.socials || null,
    address: business?.address || null,
    website: business?.website || null,
  };
}

async function getLiveSupportUnseenCount() {
  const row = await execGet(sql`
    SELECT COUNT(*)::int AS count
    FROM live_support_leads
    WHERE seen_at IS NULL
  `);

  return Number(row?.count || 0);
}

async function markLiveSupportLeadsAsSeen() {
  const result = await execRun(sql`
    UPDATE live_support_leads
    SET seen_at = now(), updated_at = now()
    WHERE seen_at IS NULL
  `);

  return { updatedCount: result.changes || 0 };
}

async function clearLiveSupportLeads() {
  const result = await execRun(sql`DELETE FROM live_support_leads`);

  return { deletedCount: result.changes || 0 };
}

async function upsertManualMessageTestBusiness({
  category,
  city,
  district,
  phone = "905300448478",
}) {
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
    throw new Error(
      "Manual message test business icin gecerli bir telefon gerekli."
    );
  }

  await execRun(
    sql`
    INSERT INTO searches (search_key, category, city, district)
    VALUES (${searchKey}, ${normalizedCategory}, ${normalizedCity}, ${normalizedDistrict})
    ON CONFLICT(search_key) DO UPDATE SET
      category = excluded.category,
      city = excluded.city,
      district = excluded.district,
      updated_at = now()
    `
  );

  const search = await execGet(
    sql`SELECT id FROM searches WHERE search_key = ${searchKey}`
  );

  if (!search?.id) {
    throw new Error(
      "Manual message test business icin search kaydi olusturulamadi."
    );
  }

  const externalId = `manual-test-${normalizedPhone}`;
  const businessName = "Jefedes Manuel Mesaj Test Firması";
  const address = "Kadıköy / İstanbul - Manuel mesaj test kaydı";
  const lastMessageText = "Bilgi almak istiyorum";

  const existingBusiness = await execGet(
    sql`
    SELECT id
    FROM businesses
    WHERE external_id = ${externalId}
    ORDER BY id DESC
    LIMIT 1
    `
  );

  let businessId = existingBusiness?.id || null;

  if (businessId) {
    await execRun(
      sql`
      UPDATE businesses
      SET
        search_id = ${search.id},
        external_id = ${externalId},
        name = ${businessName},
        phone = ${normalizedPhone},
        address = ${address},
        website = NULL,
        google_maps_url = NULL,
        rating = NULL,
        user_rating_count = 0,
        source = 'manual',
        status = 'pending',
        category = ${normalizedCategory},
        city = ${normalizedCity},
        district = ${normalizedDistrict},
        lat = NULL,
        lng = NULL,
        whatsapp_status = 'replied',
        template_sent_at = NULL,
        last_incoming_at = now(),
        last_message_text = ${lastMessageText},
        last_whatsapp_message_id = NULL
      WHERE id = ${businessId}
      `
    );
  } else {
    const insertResult = await execRun(
      sql`
      INSERT INTO businesses (
        search_id, external_id, name, phone, address, website, google_maps_url,
        rating, user_rating_count, source, status, category, city, district,
        lat, lng, whatsapp_status, template_sent_at, last_incoming_at,
        last_message_text, last_whatsapp_message_id
      )
      VALUES (
        ${search.id}, ${externalId}, ${businessName}, ${normalizedPhone},
        ${address}, NULL, NULL, NULL, 0, 'manual', 'pending',
        ${normalizedCategory}, ${normalizedCity}, ${normalizedDistrict},
        NULL, NULL, 'replied', NULL, now(), ${lastMessageText}, NULL
      )
      RETURNING id
      `
    );

    businessId = insertResult.rows[0]?.id;
  }

  const row = await execGet(
    sql`
    SELECT
      id, external_id, name, phone, address, website, google_maps_url, rating,
      user_rating_count, source, status, category, city, district, lat, lng,
      whatsapp_status, template_sent_at, last_incoming_at, last_message_text,
      last_whatsapp_message_id, created_at
    FROM businesses
    WHERE id = ${businessId}
    `
  );

  return row ? mapBusinessRow(row) : null;
}

// ===========================================================================
// CRM: işletme görüşmesi (interaction) + notlar + atanabilir kullanıcılar.
// Görüşme: her işletme için tek, güncellenebilir kayıt (kanal + sonuç + personel).
// Notlar: eklenebilir geçmiş (yazar + zaman). Hepsi tüm kullanıcılarca görünür.
// ===========================================================================
function mapInteractionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id,
    userFullName: row.user_full_name || null,
    userUsername: row.user_username || null,
    team: row.team || null,
    channel: row.channel || null,
    outcome: row.outcome || null,
    note: row.note || null,
    meetingAt: row.meeting_at || null,
    updatedAt: row.updated_at || null,
  };
}

// Eski (category'siz) notlar için team'den sütun türet.
function deriveNoteCategory(row) {
  if (row.category) return row.category;
  if (row.team === "saha_pazarlama") return "saha";
  if (row.team === "cagri_merkezi") return "cagri";
  // ponytail: kalan eski notlar saha sütununa düşer (yerel veri az).
  return "saha";
}

function mapNoteRow(row) {
  return {
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id,
    userFullName: row.user_full_name || null,
    userUsername: row.user_username || null,
    team: row.team || null,
    category: deriveNoteCategory(row),
    note: row.note,
    createdAt: row.created_at,
  };
}

async function getUserTeam(userId) {
  if (!userId) return null;
  const u = await execGet(sql`SELECT team FROM users WHERE id = ${userId}`);
  return u?.team || null;
}

async function getBusinessInteraction(businessId) {
  const row = await execGet(
    sql`
    SELECT i.id, i.business_id, i.user_id, i.team, i.channel, i.outcome,
           i.note, i.meeting_at, i.updated_at,
           u.full_name AS user_full_name, u.username AS user_username
    FROM interactions i
    LEFT JOIN users u ON u.id = i.user_id
    WHERE i.business_id = ${businessId}
    ORDER BY i.id DESC
    LIMIT 1
    `
  );

  return mapInteractionRow(row);
}

// İşletmenin görüşme kaydını oluşturur/günceller (kanal + sonuç + iletişime
// geçen personel + planlanan görüşme tarihi). businesses.assigned_to da senkron
// tutulur. meetingAt undefined ise mevcut değer korunur; null ise silinir.
async function upsertBusinessInteraction({
  businessId,
  userId = null,
  channel = null,
  outcome = null,
  meetingAt,
}) {
  if (channel && !INTERACTION_CHANNELS.includes(channel)) {
    const e = new Error("Geçersiz iletişim kanalı.");
    e.statusCode = 400;
    throw e;
  }
  if (outcome && !INTERACTION_OUTCOMES.includes(outcome)) {
    const e = new Error("Geçersiz görüşme sonucu.");
    e.statusCode = 400;
    throw e;
  }

  const team = await getUserTeam(userId);
  const safeOutcome = outcome || "pending";
  const includeMeetingAt = meetingAt !== undefined;
  const meetingAtValue = meetingAt || null;

  const existing = await execGet(
    sql`SELECT id FROM interactions WHERE business_id = ${businessId} ORDER BY id DESC LIMIT 1`
  );

  if (existing) {
    // channel NOT NULL: caller null gönderirse mevcut değeri koru (personel/sonuç
    // değişikliği kanalı silmesin).
    if (includeMeetingAt) {
      await execRun(
        sql`
        UPDATE interactions
        SET user_id = ${userId}, team = ${team},
            channel = COALESCE(${channel}, channel),
            outcome = ${safeOutcome}, meeting_at = ${meetingAtValue},
            updated_at = now()
        WHERE id = ${existing.id}
        `
      );
    } else {
      await execRun(
        sql`
        UPDATE interactions
        SET user_id = ${userId}, team = ${team},
            channel = COALESCE(${channel}, channel),
            outcome = ${safeOutcome}, updated_at = now()
        WHERE id = ${existing.id}
        `
      );
    }
  } else {
    // Yeni kayıt: kanal belirtilmemişse "manual" (admin/personel manuel CRM aksiyonu).
    const insertChannel = channel || "manual";
    await execRun(
      sql`
      INSERT INTO interactions (business_id, user_id, team, channel, outcome, meeting_at)
      VALUES (${businessId}, ${userId}, ${team}, ${insertChannel}, ${safeOutcome}, ${meetingAtValue})
      `
    );
  }

  // İletişime geçen personeli işletmeye de ata (gelecekteki "bana atananlar" için).
  if (userId) {
    await execRun(
      sql`UPDATE businesses SET assigned_to = ${userId} WHERE id = ${businessId}`
    );
  }

  return getBusinessInteraction(businessId);
}

const NOTE_CATEGORIES = ["wp", "saha", "cagri", "admin"];

async function addBusinessNote({ businessId, userId = null, note, category = "saha" }) {
  const text = String(note || "").trim();
  if (!text) {
    const e = new Error("Not boş olamaz.");
    e.statusCode = 400;
    throw e;
  }
  if (!NOTE_CATEGORIES.includes(category)) {
    const e = new Error("Geçersiz not sütunu.");
    e.statusCode = 400;
    throw e;
  }

  const team = await getUserTeam(userId);

  const row = await execGet(
    sql`
    INSERT INTO business_notes (business_id, user_id, team, category, note)
    VALUES (${businessId}, ${userId}, ${team}, ${category}, ${text})
    RETURNING id, business_id, user_id, team, category, note, created_at
    `
  );

  const author = userId
    ? await execGet(
        sql`SELECT full_name, username FROM users WHERE id = ${userId}`
      )
    : null;

  return mapNoteRow({
    ...row,
    user_full_name: author?.full_name,
    user_username: author?.username,
  });
}

// Mevcut bir notu düzenler. Yalnızca notu ekleyen kullanıcı veya admin değiştirebilir.
async function updateBusinessNote({ noteId, note, actorId, actorRole }) {
  const text = String(note || "").trim();
  if (!text) {
    const e = new Error("Not boş olamaz.");
    e.statusCode = 400;
    throw e;
  }

  const existing = await execGet(
    sql`SELECT id, user_id FROM business_notes WHERE id = ${noteId}`
  );

  if (!existing) {
    const e = new Error("Not bulunamadı.");
    e.statusCode = 404;
    throw e;
  }

  if (actorRole !== "admin" && existing.user_id !== actorId) {
    const e = new Error("Bu notu düzenleme yetkiniz yok.");
    e.statusCode = 403;
    throw e;
  }

  await execRun(
    sql`UPDATE business_notes SET note = ${text} WHERE id = ${noteId}`
  );

  const row = await execGet(
    sql`
    SELECT n.id, n.business_id, n.user_id, n.team, n.category, n.note, n.created_at,
           u.full_name AS user_full_name, u.username AS user_username
    FROM business_notes n
    LEFT JOIN users u ON u.id = n.user_id
    WHERE n.id = ${noteId}
    `
  );

  return mapNoteRow(row);
}

async function getBusinessNotes(businessId) {
  const rows = await execAll(
    sql`
    SELECT n.id, n.business_id, n.user_id, n.team, n.category, n.note, n.created_at,
           u.full_name AS user_full_name, u.username AS user_username
    FROM business_notes n
    LEFT JOIN users u ON u.id = n.user_id
    WHERE n.business_id = ${businessId}
    ORDER BY n.created_at DESC, n.id DESC
    `
  );

  return rows.map(mapNoteRow);
}

// Birden çok işletme için görüşme + notları tek seferde getirir.
// Döner: { [businessId]: { interaction, notes } }.
async function getBusinessCrmBatch(businessIds) {
  const ids = Array.from(
    new Set((businessIds || []).map((id) => Number(id)).filter(Number.isInteger))
  );

  const map = {};
  if (ids.length === 0) return map;
  for (const id of ids) map[id] = { interaction: null, notes: [] };

  const idList = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `
  );

  const interactions = await execAll(
    sql`
    SELECT DISTINCT ON (i.business_id)
      i.id, i.business_id, i.user_id, i.team, i.channel, i.outcome,
      i.note, i.meeting_at, i.updated_at,
      u.full_name AS user_full_name, u.username AS user_username
    FROM interactions i
    LEFT JOIN users u ON u.id = i.user_id
    WHERE i.business_id IN (${idList})
    ORDER BY i.business_id, i.id DESC
    `
  );

  for (const row of interactions) {
    if (map[row.business_id]) {
      map[row.business_id].interaction = mapInteractionRow(row);
    }
  }

  const notes = await execAll(
    sql`
    SELECT n.id, n.business_id, n.user_id, n.team, n.category, n.note, n.created_at,
           u.full_name AS user_full_name, u.username AS user_username
    FROM business_notes n
    LEFT JOIN users u ON u.id = n.user_id
    WHERE n.business_id IN (${idList})
    ORDER BY n.created_at DESC, n.id DESC
    `
  );

  for (const row of notes) {
    if (map[row.business_id]) {
      map[row.business_id].notes.push(mapNoteRow(row));
    }
  }

  return map;
}

// Personelin sahadan manuel eklediği işletme. source='manual', addedManually=true,
// createdBy/assignedTo = ekleyen kullanıcı. Görüşme (kanal/sonuç) ve not ayrı
// fonksiyonlarla eklenir. Yeni işletmenin id'sini döndürür.
async function createManualBusiness({
  name,
  phone = null,
  email = null,
  address = null,
  city = null,
  district = null,
  category = null,
  website = null,
  socials = null,
  createdBy = null,
}) {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) {
    const e = new Error("İşletme adı zorunludur.");
    e.statusCode = 400;
    throw e;
  }

  const row = await execGet(
    sql`
    INSERT INTO businesses (
      name, phone, email, address, city, district, category, website, socials,
      source, status, added_manually, created_by, assigned_to
    )
    VALUES (
      ${normalizedName}, ${phone || null}, ${email || null}, ${address || null},
      ${city || null}, ${district || null}, ${category || null},
      ${website || null}, ${socials || null}, 'manual', 'pending', true,
      ${createdBy}, ${createdBy}
    )
    RETURNING id
    `
  );

  return row.id;
}

// İletişime geçilen işletmeler: en az bir görüşme kaydı, notu, WhatsApp
// template gönderimi VEYA giden WhatsApp mesajı olan işletmeler. Her biri
// için son görüşme (kanal/sonuç/personel) + notlar döner.
//
// Filtreler:
//  - from/to (YYYY-MM-DD): aktivite tarihine göre aralık.
//  - q: isim / adres / telefon / e-posta metin araması.
//  - Filtre yoksa: son 24 saatteki aktiviteler (o günün verisi).
// Aktivite zamanı = en son görüşme güncellemesi, en son not, template
// gönderim zamanı veya son giden WhatsApp mesajı (hangisi yeniyse).
// userId verildiğinde template gönderimi ve WhatsApp mesajları filtreye
// dahil edilmez; bu aktiviteler belirli bir personele bağlı saklanmıyor.
async function getContactedBusinesses({
  from = null,
  to = null,
  q = null,
  all = false,
  userId = null,
  // Personele atanan kategori kısıtı (slug listesi). Dolu ise yalnız bu
  // kategorilerdeki işletmeler döner.
  categories = null,
  // İsteği yapan kullanıcının id'si. Kategori kısıtı varken de kullanıcının
  // kendi manuel eklediği işletmeleri görebilmesi için istisna olarak kullanılır.
  actorId = null,
} = {}) {
  // Aktivite penceresi: from/to varsa o aralık, yoksa (all değilse) son 24 saat.
  // Filtreyi tek ifade olarak inşa edip her UNION dalına ekliyoruz. Böylece
  // sürücü tablo businesses değil, çok daha küçük aktivite tabloları oluyor.
  const fromDate = from ? String(from).trim() : null;
  const toDate = to ? String(to).trim() : null;

  const timeCol = (col) => {
    if (all) return sql``;
    if (fromDate || toDate) {
      const f = fromDate || toDate;
      const t = toDate || fromDate;
      return sql` AND (${col})::date BETWEEN ${f}::date AND ${t}::date`;
    }
    return sql` AND ${col} >= (now() - interval '24 hours')::timestamp`;
  };

  // Telefon karşılaştırması (whatsapp_messages.phone yalnızca rakam saklanır;
  // businesses.phone karışık formatta olabilir).
  const bPhoneNorm = sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(b.phone, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', '')`;
  const bPhoneLast10 = sql`RIGHT(${bPhoneNorm}, 10)`;

  // userId verildiğinde: yalnız o personele ait interactions/notes; template ve
  // WhatsApp aktiviteleri (belirli bir kullanıcıya bağlı olmadıklarından) dahil
  // edilmez.
  const iUserFilter = userId ? sql` AND i.user_id = ${userId}` : sql``;
  const nUserFilter = userId ? sql` AND n.user_id = ${userId}` : sql``;

  const branches = [
    sql`
      SELECT i.business_id AS id, MAX(i.updated_at) AS ts
        FROM interactions i
       WHERE TRUE${iUserFilter}${timeCol(sql`i.updated_at`)}
       GROUP BY i.business_id
    `,
    sql`
      SELECT n.business_id AS id, MAX(n.created_at) AS ts
        FROM business_notes n
       WHERE TRUE${nUserFilter}${timeCol(sql`n.created_at`)}
       GROUP BY n.business_id
    `,
  ];

  if (!userId) {
    branches.push(sql`
      SELECT b.id AS id, b.template_sent_at AS ts
        FROM businesses b
       WHERE b.template_sent_at IS NOT NULL${timeCol(sql`b.template_sent_at`)}
    `);
    branches.push(sql`
      SELECT wm.business_id AS id, MAX(wm.created_at) AS ts
        FROM whatsapp_messages wm
       WHERE wm.direction = 'outgoing'
         AND wm.business_id IS NOT NULL${timeCol(sql`wm.created_at`)}
       GROUP BY wm.business_id
    `);
    // Legacy giden WhatsApp mesajları (business_id set edilmemiş) için telefon
    // son-10-hane eşleşmesi. Küçük veri hacminde nested-loop join hızlı çalışır.
    branches.push(sql`
      SELECT b.id AS id, MAX(wm.created_at) AS ts
        FROM whatsapp_messages wm
        JOIN businesses b ON wm.phone LIKE ('%' || ${bPhoneLast10})
       WHERE wm.direction = 'outgoing'
         AND LENGTH(${bPhoneNorm}) >= 10${timeCol(sql`wm.created_at`)}
       GROUP BY b.id
    `);
  }

  const unionBranches = sql.join(branches, sql` UNION ALL `);

  // Metin araması (isim/adres/telefon/e-posta) — dış SELECT'te uygulanır.
  const searchConditions = [];
  const term = q ? String(q).trim() : "";
  if (term) {
    const like = `%${term}%`;
    const digits = term.replace(/\D/g, "");
    const phoneClause = digits
      ? sql` OR ${normalizedBusinessPhoneSql()} LIKE ${"%" + digits + "%"}`
      : sql``;
    searchConditions.push(
      sql`(b.name ILIKE ${like} OR b.address ILIKE ${like} OR b.phone ILIKE ${like} OR b.email ILIKE ${like}${phoneClause})`
    );
  }
  const categoriesLiteral = toPgTextArray(categories);
  if (categoriesLiteral) {
    // Kullanıcının sahadan kendi manuel eklediği kayıt kategoriye bakılmaksızın
    // görünmeli — aksi halde free-text "Sektör/Kategori" alanı slug'la eşleşmediği
    // için ekleyen personel kendi kaydını hiç göremez.
    const ownManualClause = actorId
      ? sql` OR (b.added_manually = TRUE AND b.created_by = ${actorId})`
      : sql``;
    searchConditions.push(
      sql`(COALESCE(b.category, s.category) = ANY(${categoriesLiteral}::text[])${ownManualClause})`
    );
  }

  const searchWhere = searchConditions.length
    ? sql` WHERE ${sql.join(searchConditions, sql` AND `)}`
    : sql``;

  const businessRows = await execAll(
    sql`
    WITH act AS (
      ${unionBranches}
    ),
    act_agg AS (
      SELECT id, MAX(ts) AS activity_at FROM act GROUP BY id
    )
    SELECT b.id, b.name, b.phone, b.email, b.socials, b.instagram, b.address,
           COALESCE(b.city, s.city) AS city,
           COALESCE(b.district, s.district) AS district,
           COALESCE(b.category, s.category) AS category,
           b.website, b.google_maps_url, b.status,
           aa.activity_at
    FROM act_agg aa
    JOIN businesses b ON b.id = aa.id
    LEFT JOIN searches s ON s.id = b.search_id${searchWhere}
    ORDER BY aa.activity_at DESC
    `
  );

  if (businessRows.length === 0) return [];

  const ids = businessRows.map((row) => row.id);
  const crm = await getBusinessCrmBatch(ids);

  return businessRows.map((b) => {
    const data = crm[b.id] || { interaction: null, notes: [] };
    return {
      id: b.id,
      name: b.name,
      phone: b.phone,
      email: b.email,
      socials: b.socials || b.instagram || null,
      address: b.address,
      city: b.city,
      district: b.district,
      category: b.category,
      website: b.website,
      googleMapsUrl: b.google_maps_url,
      status: b.status || "pending",
      activityAt: b.activity_at,
      interaction: data.interaction,
      notes: data.notes,
    };
  });
}

// external_id -> sektör (activityGroup) listesi. Sektör bilgisi businesses'ta
// tutulmaz; tools/benefit_facilities.json'dan (import kaynağı) türetilir.
// ponytail: dosya bir kez okunup cache'lenir; veri tazelenince süreç yeniden başlar.
let _multisportSectorMap = null;
function getMultisportSectorMap() {
  if (_multisportSectorMap) return _multisportSectorMap;
  _multisportSectorMap = {};
  try {
    const p = require("path").join(
      __dirname,
      "..",
      "tools",
      "benefit_facilities.json"
    );
    const facilities = JSON.parse(require("fs").readFileSync(p, "utf8"));
    for (const f of facilities) {
      const groups = (f.activityGroups || [])
        .map((g) => String(g.name || "").trim())
        .filter(Boolean);
      _multisportSectorMap[`multisport_${f.id}`] = [...new Set(groups)];
    }
  } catch (error) {
    console.warn("multisport sektör verisi okunamadı:", error.message);
  }
  return _multisportSectorMap;
}

// Multisport (Benefit Systems) import'u ile gelen işletmeler.
// scripts/importMultisportBusinesses.js ile doldurulur (source='multisport').
async function listMultisportBusinesses({ q = null, city = null } = {}) {
  const conditions = [sql`b.source = 'multisport'`];

  const term = q ? String(q).trim() : "";
  if (term) {
    const like = `%${term}%`;
    conditions.push(
      sql`(b.name ILIKE ${like} OR b.address ILIKE ${like} OR b.phone ILIKE ${like} OR b.district ILIKE ${like})`
    );
  }
  if (city && String(city).trim()) {
    conditions.push(sql`b.city = ${String(city).trim()}`);
  }

  const rows = await execAll(sql`
    SELECT b.id, b.external_id, b.name, b.phone, b.address, b.city, b.district,
           b.website, b.whatsapp_status, b.template_sent_at
    FROM businesses b
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY b.city ASC, b.district ASC, b.name ASC
  `);

  const sectorMap = getMultisportSectorMap();

  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    phone: b.phone,
    address: b.address,
    city: b.city,
    district: b.district,
    website: b.website,
    sectors: sectorMap[b.external_id] || [],
    whatsappStatus: b.whatsapp_status || "not_sent",
    templateSentAt: b.template_sent_at,
  }));
}

// Sidebar bildirim rozeti: `since`'ten sonra aktivitesi (görüşme/not) olan
// işletmeleri say; son görüşme sonucu record_taken ise "recorded", değilse
// "talked" kovasına düşer (görüşülen/kayıt alınan sayfalarıyla aynı mantık).
async function getContactedActivityCounts(since) {
  const sinceTs = since ? String(since).trim() : null;
  if (!sinceTs) return { talked: 0, recorded: 0 };

  const bPhoneNorm = sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(b.phone, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', '')`;
  const bPhoneLast10 = sql`RIGHT(${bPhoneNorm}, 10)`;

  // getContactedBusinesses ile aynı aktivite-tabanlı UNION deseni; her dal
  // kendi timestamp'ini sinceTs sınırıyla filtreler, sonra business_id başına
  // aggregate edilir.
  const rows = await execAll(
    sql`
    WITH act AS (
      SELECT i.business_id AS id
        FROM interactions i
       WHERE i.updated_at > ${sinceTs}::timestamp
      UNION ALL
      SELECT n.business_id AS id
        FROM business_notes n
       WHERE n.created_at > ${sinceTs}::timestamp
      UNION ALL
      SELECT b.id
        FROM businesses b
       WHERE b.template_sent_at IS NOT NULL
         AND b.template_sent_at > ${sinceTs}::timestamp
      UNION ALL
      SELECT wm.business_id AS id
        FROM whatsapp_messages wm
       WHERE wm.direction = 'outgoing'
         AND wm.business_id IS NOT NULL
         AND wm.created_at > ${sinceTs}::timestamp
      UNION ALL
      SELECT b.id
        FROM whatsapp_messages wm
        JOIN businesses b ON wm.phone LIKE ('%' || ${bPhoneLast10})
       WHERE wm.direction = 'outgoing'
         AND wm.created_at > ${sinceTs}::timestamp
         AND LENGTH(${bPhoneNorm}) >= 10
    ),
    act_agg AS (SELECT DISTINCT id FROM act)
    SELECT
      CASE WHEN li.outcome = 'record_taken' THEN 'recorded' ELSE 'talked' END AS bucket,
      COUNT(*)::int AS count
    FROM act_agg aa
    LEFT JOIN LATERAL (
      SELECT outcome FROM interactions i WHERE i.business_id = aa.id ORDER BY i.id DESC LIMIT 1
    ) li ON true
    GROUP BY bucket
    `
  );

  const counts = { talked: 0, recorded: 0 };
  for (const row of rows) {
    if (row.bucket === "recorded") counts.recorded = row.count;
    else counts.talked = row.count;
  }
  return counts;
}

// Admin dashboard istatistikleri. Varsayılan pencere: son 24 saat ("bugün").
// from/to verilirse o tarih aralığı. Görüşme sonucu (kanal/sonuç) son güncelleme
// zamanına; notlar oluşturma zamanına göre sayılır.
const KNOWN_OUTCOMES = ["record_taken", "to_meet", "follow_up", "rejected"];

function emptyOutcomeCounts() {
  return {
    record_taken: 0,
    to_meet: 0,
    follow_up: 0,
    rejected: 0,
    other: 0,
    total: 0,
  };
}

function addOutcome(counts, outcome, n) {
  const value = Number(n) || 0;
  if (KNOWN_OUTCOMES.includes(outcome)) {
    counts[outcome] += value;
  } else {
    counts.other += value;
  }
  counts.total += value;
}

async function getDashboardStats({ from = null, to = null, userId = null } = {}) {
  const fromDate = from ? String(from).trim() : null;
  const toDate = to ? String(to).trim() : null;
  const useRange = Boolean(fromDate || toDate);
  const f = fromDate || toDate;
  const t = toDate || fromDate;

  const cond = (col) =>
    useRange
      ? sql`(${col})::date BETWEEN ${f}::date AND ${t}::date`
      : sql`${col} >= (now() - interval '24 hours')::timestamp`;

  // Belirli bir personele kısıtla (Durum Takip için).
  const userCond = (col) => (userId ? sql` AND ${col} = ${userId}` : sql``);

  // Sonuç bazlı toplam
  const outcomeRows = await execAll(
    sql`
    SELECT outcome, COUNT(*)::int AS count
    FROM interactions
    WHERE ${cond(sql`updated_at`)}${userCond(sql`user_id`)}
    GROUP BY outcome
    `
  );

  const outcomes = emptyOutcomeCounts();
  for (const row of outcomeRows) addOutcome(outcomes, row.outcome, row.count);

  // Birim bazlı
  const teamRows = await execAll(
    sql`
    SELECT COALESCE(team, '(birimsiz)') AS team, outcome, COUNT(*)::int AS count
    FROM interactions
    WHERE ${cond(sql`updated_at`)}${userCond(sql`user_id`)}
    GROUP BY COALESCE(team, '(birimsiz)'), outcome
    `
  );

  const teamMap = new Map();
  for (const row of teamRows) {
    if (!teamMap.has(row.team)) {
      teamMap.set(row.team, { team: row.team, ...emptyOutcomeCounts() });
    }
    addOutcome(teamMap.get(row.team), row.outcome, row.count);
  }

  // Personel bazlı
  const personnelRows = await execAll(
    sql`
    SELECT i.user_id, u.full_name, u.username, i.team, i.outcome,
           COUNT(*)::int AS count
    FROM interactions i
    LEFT JOIN users u ON u.id = i.user_id
    WHERE ${cond(sql`i.updated_at`)}${userCond(sql`i.user_id`)}
    GROUP BY i.user_id, u.full_name, u.username, i.team, i.outcome
    `
  );

  const personnelMap = new Map();
  for (const row of personnelRows) {
    const key = String(row.user_id ?? "none");
    if (!personnelMap.has(key)) {
      personnelMap.set(key, {
        userId: row.user_id,
        fullName: row.full_name || null,
        username: row.username || null,
        team: row.team || null,
        ...emptyOutcomeCounts(),
      });
    }
    addOutcome(personnelMap.get(key), row.outcome, row.count);
  }

  // Kanal dağılımı
  const channelRows = await execAll(
    sql`
    SELECT COALESCE(channel, 'other') AS channel, COUNT(*)::int AS count
    FROM interactions
    WHERE ${cond(sql`updated_at`)}${userCond(sql`user_id`)}
    GROUP BY COALESCE(channel, 'other')
    `
  );
  const channels = { whatsapp: 0, call: 0, face_to_face: 0, other: 0, total: 0 };
  for (const row of channelRows) {
    const value = Number(row.count) || 0;
    if (row.channel in channels) channels[row.channel] += value;
    else channels.other += value;
    channels.total += value;
  }

  // Notlar
  const notesRow = await execGet(
    sql`SELECT COUNT(*)::int AS count FROM business_notes WHERE ${cond(
      sql`created_at`
    )}${userCond(sql`user_id`)}`
  );

  // Son aktiviteler (görüşme güncellemeleri + notlar), zaman sırasıyla.
  const recentInteractions = await execAll(
    sql`
    SELECT i.business_id, b.name AS business_name, i.outcome, i.channel, i.team,
           i.updated_at AS at, u.full_name AS user_full_name, u.username AS user_username
    FROM interactions i
    JOIN businesses b ON b.id = i.business_id
    LEFT JOIN users u ON u.id = i.user_id
    WHERE ${cond(sql`i.updated_at`)}${userCond(sql`i.user_id`)}
    ORDER BY i.updated_at DESC, i.id DESC
    LIMIT 30
    `
  );
  const recentNotes = await execAll(
    sql`
    SELECT n.business_id, b.name AS business_name, n.note, n.team,
           n.created_at AS at, u.full_name AS user_full_name, u.username AS user_username
    FROM business_notes n
    JOIN businesses b ON b.id = n.business_id
    LEFT JOIN users u ON u.id = n.user_id
    WHERE ${cond(sql`n.created_at`)}${userCond(sql`n.user_id`)}
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT 30
    `
  );

  const recentActivity = [
    ...recentInteractions.map((r) => ({
      type: "interaction",
      businessId: r.business_id,
      businessName: r.business_name || null,
      userName: r.user_full_name || r.user_username || null,
      team: r.team || null,
      outcome: r.outcome || null,
      channel: r.channel || null,
      note: null,
      at: r.at,
    })),
    ...recentNotes.map((r) => ({
      type: "note",
      businessId: r.business_id,
      businessName: r.business_name || null,
      userName: r.user_full_name || r.user_username || null,
      team: r.team || null,
      outcome: null,
      channel: null,
      note: r.note,
      at: r.at,
    })),
  ]
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")))
    .slice(0, 30);

  const sortByTotal = (a, b) => b.total - a.total;

  return {
    range: useRange ? { from: f, to: t } : { window: "24h" },
    outcomes,
    channels,
    totalContacted: outcomes.total,
    totalNotes: Number(notesRow?.count || 0),
    recentActivity,
    byTeam: Array.from(teamMap.values()).sort(sortByTotal),
    byPersonnel: Array.from(personnelMap.values()).sort(sortByTotal),
  };
}

// Görüşme atamasında kullanılacak aktif kullanıcılar (tüm kullanıcılara açık,
// minimal alanlar).
async function listAssignableUsers() {
  const rows = await execAll(
    sql`
    SELECT id, username, full_name, role, team
    FROM users
    WHERE is_active = true
    ORDER BY full_name NULLS LAST, username ASC
    `
  );

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    fullName: row.full_name || null,
    role: row.role || "personnel",
    team: row.team || null,
  }));
}

module.exports = {
  initDatabase,
  getCachedSearchResults,
  saveSearchResults,
  mergeSearchResults,
  getSearchHistory,
  getSearchDetailsById,
  updateBusinessStatus,
  getBusinessesByStatus,

  getBusinessById,
  getBusinessesByWhatsAppStatus,
  updateBusinessWhatsAppStatus,
  markTemplateSent,
  markIncomingWhatsAppReply,

  logWhatsAppMessage,
  getWhatsAppConversationByPhone,
  getWhatsAppConversations,
  getWhatsAppUnreadCount,
  getWhatsAppMessagesForPhone,
  markWhatsAppConversationRead,
  getWhatsAppContactInfo,
  upsertLiveSupportOutcome,

  saveLiveSupportLead,
  getLiveSupportLeads,
  getReportData,
  updateLiveSupportLeadNote,
  updateLiveSupportLead,
  clearLiveSupportLeads,
  getLiveSupportUnseenCount,
  markLiveSupportLeadsAsSeen,
  upsertManualMessageTestBusiness,

  authenticateUser,
  findUserByUsername,
  getUserById,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  setUserPasswordByUsername,

  getBusinessInteraction,
  upsertBusinessInteraction,
  addBusinessNote,
  updateBusinessNote,
  getBusinessNotes,
  getBusinessCrmBatch,
  getContactedBusinesses,
  listMultisportBusinesses,
  getContactedActivityCounts,
  getDashboardStats,
  createManualBusiness,
  listAssignableUsers,
};
