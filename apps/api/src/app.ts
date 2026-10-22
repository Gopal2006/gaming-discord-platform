import fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { generateCorrelationId } from "@nexus/observability";
import {
  ApplicationError,
  PolicyViolationError,
  UnauthorizedError,
  ResourceNotFoundError,
  ConflictError,
  type IConfirmationService,
  InMemoryConfirmationService,
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
  confirmationService?: IConfirmationService;
  cookieSecret?: string;
  enableRateLimit?: boolean;
  allowedOrigins?: string[];
  secureCookies?: boolean;
}

export function buildApp(options: AppOptions): FastifyInstance {
  const {
    uow,
    sessionStore,
    oauthClient,
    confirmationService = new InMemoryConfirmationService(),
    cookieSecret = "nexus_dev_cookie_secret_1234567890123456",
    enableRateLimit = true,
    allowedOrigins = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    secureCookies = false,
  } = options;

  const app = fastify({
    genReqId: () => generateCorrelationId("req"),
    trustProxy: true,
  });

  // Security plugins
  app.register(helmet, {
    contentSecurityPolicy: false, // API responses only
  });

  // Strict CORS: Validate origin against explicit allowlist
  app.register(cors, {
    origin: (origin, cb) => {
      // Server-to-server or non-browser tools (curl, postman, vitest) have no Origin header
      if (!origin) {
        return cb(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
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

  // Anti-CSRF Guard for Cookie-Authenticated Mutations
  app.addHook("preHandler", async (request, reply) => {
    const isMutation = ["POST", "PATCH", "PUT", "DELETE"].includes(
      request.method,
    );
    const sessionCookie = request.cookies["nexus_session"];

    // Only apply CSRF check if request relies on session cookie
    if (isMutation && sessionCookie) {
      const origin = request.headers["origin"];
      const referer = request.headers["referer"];

      // If origin header is supplied by browser, it must match allowedOrigins
      if (origin && !allowedOrigins.includes(origin)) {
        return reply.status(403).send({
          error: {
            code: "CSRF_VERIFICATION_FAILED",
            message:
              "Cross-Site Request Forgery verification failed: untrusted origin.",
            requestId: request.id,
          },
        });
      }

      // If origin header is absent but referer is present, verify referer host
      if (!origin && referer) {
        try {
          const refererOrigin = new URL(referer).origin;
          if (!allowedOrigins.includes(refererOrigin)) {
            return reply.status(403).send({
              error: {
                code: "CSRF_VERIFICATION_FAILED",
                message:
                  "Cross-Site Request Forgery verification failed: untrusted referer.",
                requestId: request.id,
              },
            });
          }
        } catch {
          return reply.status(403).send({
            error: {
              code: "CSRF_VERIFICATION_FAILED",
              message:
                "Cross-Site Request Forgery verification failed: malformed referer.",
              requestId: request.id,
            },
          });
        }
      }
    }
  });

  // Consistent Error Handler
  app.setErrorHandler((error, request, reply) => {
    let statusCode = 500;
    let code = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected error occurred";
    let details: Record<string, unknown> | undefined;

    if (error instanceof PolicyViolationError) {
      if (error.reasonCode === "DENIED_CONFIRMATION_REQUIRED") {
        statusCode = 428; // Precondition Required
      } else {
        statusCode = 403; // Forbidden
      }
      code = error.reasonCode;
      message = error.message;
      details = error.details;
    } else if (error instanceof UnauthorizedError) {
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
  app.register(createAuthRoutes({ oauthClient, sessionStore, secureCookies }));
  app.register(createGuildRoutes({ uow, sessionStore, confirmationService }));
  app.register(createPlatformRoutes({ sessionStore }));

  return app;
}
