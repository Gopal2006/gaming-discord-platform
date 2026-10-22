import { loadConfig } from "@nexus/config";
import { createLogger } from "@nexus/observability";
import { createDatabaseClient, DrizzleUnitOfWork } from "@nexus/database";
import { buildApp } from "./app.js";
import { InMemorySessionStore } from "./auth/session-manager.js";
import { MockDiscordOAuthClient } from "./auth/discord-oauth.js";

async function start() {
  const config = loadConfig();
  const logger = createLogger({ name: "nexus-api", level: config.LOG_LEVEL });

  const { db } = createDatabaseClient({
    connectionString: config.DATABASE_URL,
    maxConnections: config.DATABASE_MAX_CONNECTIONS,
  });

  const uow = new DrizzleUnitOfWork(db);
  const sessionStore = new InMemorySessionStore();
  const oauthClient = new MockDiscordOAuthClient();

  const app = buildApp({
    uow,
    sessionStore,
    oauthClient,
    cookieSecret: config.SESSION_SECRET,
  });

  try {
    const address = await app.listen({ port: config.PORT, host: config.HOST });
    logger.info(`Nexus API listening at ${address}`);
  } catch (err) {
    logger.fatal({ err }, "Failed to start Nexus API server");
    process.exit(1);
  }
}

if (process.env["NODE_ENV"] !== "test") {
  start();
}
