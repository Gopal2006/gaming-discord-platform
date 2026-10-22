import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./dist/schema/index.js",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env["DATABASE_URL"] ||
      "postgresql://nexus_dev:nexus_dev_password@localhost:5432/nexus_dev",
  },
  verbose: true,
  strict: true,
});
