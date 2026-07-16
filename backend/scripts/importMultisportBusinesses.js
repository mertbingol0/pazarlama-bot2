// Multisport (Benefit Systems) tesislerini businesses tablosuna aktarır.
// Kaynak: tools/benefit_facilities.json + tools/benefit_phones.json
// (tools/crawl_benefit.py ve tools/crawl_benefit_phones.py çıktıları).
// Tekrar çalıştırılabilir: external_id üzerinden upsert.
//
// Kullanım: node scripts/importMultisportBusinesses.js
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { sql } = require("drizzle-orm");
const { getDb, getPool } = require("../dbClient");

const TOOLS_DIR = path.join(__dirname, "..", "..", "tools");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, name), "utf8"));
}

async function main() {
  const facilities = readJson("benefit_facilities.json");
  const phones = readJson("benefit_phones.json");
  const db = getDb();

  let inserted = 0;
  let updated = 0;

  for (const f of facilities) {
    const externalId = `multisport_${f.id}`;
    const phone = phones[f.id] || null;
    const website = f.slug
      ? `https://benefitsystems.com.tr/tesisler/${f.slug}`
      : null;

    const result = await db.execute(sql`
      INSERT INTO businesses
        (external_id, source, category, name, phone, address, city, district,
         lat, lng, website, added_manually)
      SELECT ${externalId}, 'multisport', 'multisport', ${f.name || null},
             ${phone}, ${f.address || null}, ${f.city || null},
             ${f.cityDistrict || null}, ${f.lat || null}, ${f.lng || null},
             ${website}, false
      WHERE NOT EXISTS (
        SELECT 1 FROM businesses WHERE external_id = ${externalId}
      )
      RETURNING id
    `);

    if (result.rows.length > 0) {
      inserted += 1;
    } else {
      // Var olan kaydın iletişim bilgilerini tazele (telefon yalnız doluysa yazılır).
      await db.execute(sql`
        UPDATE businesses SET
          name = ${f.name || null},
          phone = COALESCE(${phone}, phone),
          address = ${f.address || null},
          city = ${f.city || null},
          district = ${f.cityDistrict || null},
          website = ${website}
        WHERE external_id = ${externalId}
      `);
      updated += 1;
    }
  }

  console.log(
    `multisport import bitti: ${inserted} yeni, ${updated} güncellendi (toplam ${facilities.length})`
  );

  await getPool().end();
}

main().catch((error) => {
  console.error("multisport import hatası:", error);
  process.exit(1);
});
