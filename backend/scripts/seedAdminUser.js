// Yerel admin kullanıcısını oluşturur/günceller (PostgreSQL + Drizzle).
require("dotenv").config();

const crypto = require("crypto");
const { sql } = require("drizzle-orm");
const { getDb, getPool } = require("../dbClient");
const { initDatabase } = require("../db");

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "jefedes1212";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");

  return { hash, salt };
}

async function main() {
  // Tabloların var olduğundan emin ol (migration uygula).
  await initDatabase();

  const { hash, salt } = hashPassword(ADMIN_PASSWORD);

  await getDb().execute(sql`
    INSERT INTO users (username, password_hash, password_salt, full_name, role)
    VALUES (${ADMIN_USERNAME}, ${hash}, ${salt}, 'Sistem Yöneticisi', 'admin')
    ON CONFLICT(username) DO UPDATE SET
      password_hash = excluded.password_hash,
      password_salt = excluded.password_salt,
      role = 'admin',
      updated_at = now()
  `);

  console.log(`Local admin kullanicisi hazir: ${ADMIN_USERNAME}`);

  await getPool().end();
}

main().catch(async (error) => {
  console.error(error.message);
  process.exit(1);
});
