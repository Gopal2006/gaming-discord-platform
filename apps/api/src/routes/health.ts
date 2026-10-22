import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health/live", async () => {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/health/ready", async () => {
    return {
      status: "ready",
      timestamp: new Date().toISOString(),
    };
  });
};
