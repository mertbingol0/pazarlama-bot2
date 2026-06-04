// Manuel mesaj testi için örnek işletme ekler/günceller (PostgreSQL + Drizzle).
require("dotenv").config();

const { getPool } = require("../dbClient");
const { initDatabase, upsertManualMessageTestBusiness } = require("../db");

const TEST_PHONE = process.argv[2];

if (!TEST_PHONE) {
  console.error(
    "Kullanım: node backend/scripts/seedManualMessageTestBusiness.js 905300448478"
  );
  process.exit(1);
}

async function main() {
  await initDatabase();

  const business = await upsertManualMessageTestBusiness({
    category: "kuaför",
    city: "İstanbul",
    district: "Kadıköy",
    phone: TEST_PHONE,
  });

  console.log("Test firma hazır:", {
    id: business?.id,
    phone: business?.phone,
    status: business?.status,
    whatsappStatus: business?.whatsappStatus,
  });

  await getPool().end();
}

main().catch((error) => {
  console.error("Test firma seed hatası:", error);
  process.exit(1);
});
