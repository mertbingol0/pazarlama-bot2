require("dotenv").config();

/** @type {import('drizzle-kit').Config} */
module.exports = {
  schema: "./schema.js",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgres://pazarlama:pazarlama@localhost:5433/pazarlama",
  },
};
