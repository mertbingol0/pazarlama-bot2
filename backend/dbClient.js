// PostgreSQL bağlantısı + Drizzle istemcisi (tek singleton).
require("dotenv").config();

const { Pool, types } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const schema = require("./schema");

// timestamp / timestamptz alanlarını ham string olarak döndür (JS Date'e çevirme).
// Böylece "YYYY-MM-DD HH:MM:SS" formatı korunur ve msSince mantığı UTC olarak
// doğru çalışır (oturum zaman dilimi aşağıda UTC'ye sabitlenir).
types.setTypeParser(1114, (value) => value); // timestamp without time zone
types.setTypeParser(1184, (value) => value); // timestamp with time zone

let pool;
let db;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL tanımlı değil. backend/.env içine PostgreSQL bağlantısını ekleyin."
      );
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Oturum zaman dilimini bağlantı başlangıcında UTC'ye sabitle
      // (created_at/updated_at değerleri UTC olarak saklanır ve okunur).
      // jit=off: küçük veri hacminde JIT derleme (>1s) net kayıp; kapatıyoruz.
      options: "-c timezone=UTC -c jit=off",
    });
  }

  return pool;
}

function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema });
  }

  return db;
}

module.exports = {
  getDb,
  getPool,
  schema,
};
