const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "jefedes1212";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");

  return {
    hash,
    salt,
  };
}

async function main() {
  const dbPath = path.join(__dirname, "..", "data", "database.sqlite");

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Local database bulunamadi: ${dbPath}`);
  }

  const database = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  try {
    const usersTable = await database.get(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    );

    if (!usersTable) {
      throw new Error("users tablosu bulunamadi.");
    }

    const { hash, salt } = hashPassword(ADMIN_PASSWORD);

    await database.run(
      `
      INSERT INTO users (username, password_hash, password_salt, role)
      VALUES (?, ?, ?, 'admin')
      ON CONFLICT(username) DO UPDATE SET
        password_hash = excluded.password_hash,
        password_salt = excluded.password_salt,
        role = 'admin',
        updated_at = CURRENT_TIMESTAMP
      `,
      ADMIN_USERNAME,
      hash,
      salt
    );

    console.log(`Local admin kullanicisi hazir: ${ADMIN_USERNAME}`);
  } finally {
    await database.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
