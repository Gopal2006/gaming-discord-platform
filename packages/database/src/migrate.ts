import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabaseClient } from "./client.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const connectionString =
    process.env["DATABASE_URL"] ||
    "postgresql://nexus_dev:nexus_dev_password@localhost:5432/nexus_dev";

  console.log("Connecting to database for migrations...");
  const { db, queryClient } = createDatabaseClient({
    connectionString,
    maxConnections: 1,
  });

  try {
    const migrationsFolder = path.resolve(__dirname, "../drizzle/migrations");
    console.log(`Applying migrations from ${migrationsFolder}...`);
    await migrate(db, { migrationsFolder });
    console.log("Migrations applied successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

runMigrations();
