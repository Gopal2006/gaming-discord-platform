import fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { generateCorrelationId } from "@nexus/observability";
import {
  ApplicationError,
  UnauthorizedError,
  ResourceNotFoundError,
  ConflictError,
} from "@nexus/application";
import {
  DomainError,
  InvalidStateTransitionError,
  InvariantViolationError,
} from "@nexus/domain";
import type { IUnitOfWork } from "@nexus/database";
import type { ISessionStore } from "./auth/session-manager.js";
import type { IDiscordOAuthClient } from "./auth/discord-oauth.js";
import { healthRoutes } from "./routes/health.js";
import { createAuthRoutes } from "./routes/auth.js";
import { createGuildRoutes } from "./routes/guilds.js";
import { createPlatformRoutes } from "./routes/platform.js";

export interface AppOptions {
  uow: IUnitOfWork;
  sessionStore: ISessionStore;
  oauthClient: IDiscordOAuthClient;
  cookieSecret?: string;
  enableRateLimit?: boolean;
}

export function buildApp(options: AppOptions): FastifyInstance {
  const {
    uow,
    sessionStore,
    oauthClient,
    cookieSecret = "nexus_dev_cookie_secret_1234567890123456",
    enableRateLimit = true,
  } = options;

  const app = fastify({
    genReqId: () => generateCorrelationId("req"),
    trustProxy: true,
  });

  // Security plugins
  app.register(helmet, {
    contentSecurityPolicy: false, // API responses only
  });

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.register(cookie, {
    secret: cookieSecret,
    hook: "onRequest",
  });

  if (enableRateLimit) {
    app.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
    });
  }

  // Consistent Error Handler
  app.setErrorHandler((error, request, reply) => {
    let statusCode = 500;
    let code = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected error occurred";
    let details: Record<string, unknown> | undefined;

    if (error instanceof UnauthorizedError) {
      statusCode = 403;
      code = "UNAUTHORIZED";
      message = error.message;
      details = error.details;
    } else if (error instanceof ResourceNotFoundError) {
      statusCode = 404;
      code = "NOT_FOUND";
      message = error.message;
      details = error.details;
    } else if (
      error instanceof ConflictError ||
      error instanceof InvalidStateTransitionError
    ) {
      statusCode = 409;
      code = error.code;
      message = error.message;
      details = error.details;
    } else if (error instanceof InvariantViolationError) {
      statusCode = 422;
      code = error.code;
      message = error.message;
      details = error.details;
    } else if (
      error instanceof ApplicationError ||
      error instanceof DomainError
    ) {
      statusCode = 400;
      code = error.code;
      message = error.message;
      details = error.details;
    } else if (typeof error === "object" && error !== null) {
      const errObj = error as {
        statusCode?: number;
        code?: string;
        message?: string;
      };
      if (errObj.statusCode && typeof errObj.statusCode === "number") {
        statusCode = errObj.statusCode;
      }
      if (errObj.code && typeof errObj.code === "string") {
        code = errObj.code;
      }
      if (errObj.message && typeof errObj.message === "string") {
        message = errObj.message;
      }
    }

    reply.status(statusCode).send({
      error: {
        code,
        message,
        requestId: request.id,
        details,
      },
    });
  });

  // Register Routes
  app.register(healthRoutes);
  app.register(createAuthRoutes({ oauthClient, sessionStore }));
  app.register(createGuildRoutes({ uow, sessionStore }));
  app.register(createPlatformRoutes({ sessionStore }));

  return app;
}
