import type { FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";
import type { IDiscordOAuthClient } from "../auth/discord-oauth.js";
import type { ISessionStore } from "../auth/session-manager.js";
import { createAuthHooks } from "../middleware/auth.js";

export interface AuthRoutesOptions {
  oauthClient: IDiscordOAuthClient;
  sessionStore: ISessionStore;
  secureCookies?: boolean;
}

export function createAuthRoutes(
  options: AuthRoutesOptions,
): FastifyPluginAsync {
  const { oauthClient, sessionStore, secureCookies = false } = options;
  const { authenticate } = createAuthHooks(sessionStore);

  return async (app) => {
    // 1. Start OAuth login
    app.get("/api/v1/auth/discord/login", async (request, reply) => {
      const state = crypto.randomBytes(16).toString("hex");

      reply.setCookie("oauth_state", state, {
        path: "/",
        httpOnly: true,
        secure: secureCookies,
        sameSite: "lax",
        maxAge: 300, // 5 minutes
      });

      const authUrl = oauthClient.getAuthorizationUrl(state);
      return { url: authUrl };
    });

    // 2. OAuth Callback
    app.get<{ Querystring: { code?: string; state?: string } }>(
      "/api/v1/auth/discord/callback",
      async (request, reply) => {
        const { code, state } = request.query;
        const savedState = request.cookies["oauth_state"];

        if (!code || !state || state !== savedState) {
          return reply.status(400).send({
            error: {
              code: "INVALID_OAUTH_STATE",
              message: "State mismatch or missing authorization code",
              requestId: request.id,
            },
          });
        }

        // Exchange code
        const { accessToken } = await oauthClient.exchangeCode(code);
        const user = await oauthClient.fetchUser(accessToken);
        const guilds = await oauthClient.fetchUserGuilds(accessToken);

        // Filter to guilds where user has administrator or manage server permission (bitwise: 0x8 or 0x20)
        const manageableGuilds = guilds
          .filter((g) => {
            if (g.owner) return true;
            const perms = BigInt(g.permissions);
            const admin = (perms & BigInt(0x8)) !== BigInt(0);
            const manageGuild = (perms & BigInt(0x20)) !== BigInt(0);
            return admin || manageGuild;
          })
          .map((g) => ({ guildId: g.id, isOwner: g.owner }));

        // Create Session
        const { rawToken, session } = await sessionStore.createSession({
          userId: user.id,
          username: user.username,
          email: user.email,
          isPlatformOperator: false,
          accessibleGuilds: manageableGuilds,
        });

        // Set session cookie
        reply.setCookie("nexus_session", rawToken, {
          path: "/",
          httpOnly: true,
          secure: secureCookies,
          sameSite: "lax",
          maxAge: 7 * 24 * 3600, // 7 days
        });

        reply.clearCookie("oauth_state", { path: "/" });

        return {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          session: {
            sessionId: session.sessionId,
            expiresAt: session.expiresAt.toISOString(),
            manageableGuildsCount: manageableGuilds.length,
          },
        };
      },
    );

    // 3. Logout
    app.post(
      "/api/v1/auth/logout",
      { preHandler: [authenticate] },
      async (request, reply) => {
        const token = request.cookies["nexus_session"];
        if (token) {
          await sessionStore.revokeSession(token);
        }
        reply.clearCookie("nexus_session", { path: "/" });
        return { success: true };
      },
    );

    // 4. Current user & session
    app.get(
      "/api/v1/auth/me",
      { preHandler: [authenticate] },
      async (request) => {
        const session = request.session!;
        return {
          user: {
            id: session.userId,
            username: session.username,
            email: session.email,
            isPlatformOperator: session.isPlatformOperator,
          },
          session: {
            sessionId: session.sessionId,
            expiresAt: session.expiresAt.toISOString(),
          },
        };
      },
    );

    // 5. Accessible Guilds
    app.get(
      "/api/v1/me/guilds",
      { preHandler: [authenticate] },
      async (request) => {
        const session = request.session!;
        return {
          guilds: session.accessibleGuilds,
        };
      },
    );
  };
}
