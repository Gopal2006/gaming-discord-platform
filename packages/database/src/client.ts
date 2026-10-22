import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export interface DatabaseClientOptions {
  connectionString: string;
  maxConnections?: number;
}

export function createDatabaseClient(options: DatabaseClientOptions) {
  const queryClient = postgres(options.connectionString, {
    max: options.maxConnections ?? 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db = drizzle(queryClient, { schema });
  return { db, queryClient };
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>["db"];
