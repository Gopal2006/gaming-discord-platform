import type { FastifyPluginAsync } from "fastify";
import type { ISessionStore } from "../auth/session-manager.js";
import { createAuthHooks } from "../middleware/auth.js";

export interface PlatformRoutesOptions {
  sessionStore: ISessionStore;
}

export function createPlatformRoutes(
  options: PlatformRoutesOptions,
): FastifyPluginAsync {
  const { sessionStore } = options;
  const { authenticate, requirePlatformRealm } = createAuthHooks(sessionStore);

  return async (app) => {
    app.get(
      "/api/v1/platform/health",
      { preHandler: [authenticate, requirePlatformRealm] },
      async () => {
        return {
          platformStatus: "healthy",
          version: "0.1.0",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        };
      },
    );
  };
}
