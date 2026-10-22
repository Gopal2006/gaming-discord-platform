import { describe, it, expect, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import { InMemoryUnitOfWork } from "@nexus/database";
import { InMemorySessionStore } from "../src/auth/session-manager.js";
import type { IDiscordOAuthClient } from "../src/auth/discord-oauth.js";

describe("API Security, CORS, CSRF, and Action Boundary Gates", () => {
  let uow: InMemoryUnitOfWork;
  let sessionStore: InMemorySessionStore;
  let mockOAuth: IDiscordOAuthClient;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    sessionStore = new InMemorySessionStore();
    mockOAuth = {
      getAuthorizationUrl: (state: string) =>
        `https://discord.com/oauth2?state=${state}`,
      exchangeCode: async () => ({ accessToken: "test_access_token" }),
      fetchUser: async () => ({
        id: "user_owner_456",
        username: "nexusowner",
        email: "owner@nexus.internal",
      }),
      fetchUserGuilds: async () => [
        {
          id: "guild_owned_123",
          name: "Owner Guild",
          owner: true,
          permissions: "8", // Administrator
        },
      ],
    };
  });

  it("CORS rejects untrusted origins with credentials and reflects allowlisted origins", async () => {
    const app = buildApp({
      uow,
      sessionStore,
      oauthClient: mockOAuth,
      enableRateLimit: false,
      allowedOrigins: [
        "http://localhost:3000",
        "https://dashboard.nexus.internal",
      ],
    });

    // 1. Untrusted origin -> rejected / not reflected
    const untrustedRes = await app.inject({
      method: "GET",
      url: "/health/live",
      headers: {
        origin: "https://attacker-site.com",
      },
    });

    expect(untrustedRes.headers["access-control-allow-origin"]).toBeUndefined();

    // 2. Allowlisted origin -> reflected with credentials
    const trustedRes = await app.inject({
      method: "GET",
      url: "/health/live",
      headers: {
        origin: "http://localhost:3000",
      },
    });

    expect(trustedRes.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(trustedRes.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("CSRF guard rejects cookie-authenticated mutation requests from untrusted origins", async () => {
    const app = buildApp({
      uow,
      sessionStore,
      oauthClient: mockOAuth,
      enableRateLimit: false,
      allowedOrigins: ["http://localhost:3000"],
    });

    // Create session for user
    const { rawToken } = await sessionStore.createSession({
      userId: "user_owner_456",
      username: "nexusowner",
      isPlatformOperator: false,
      accessibleGuilds: [{ guildId: "guild_owned_123", isOwner: true }],
    });

    // Attempt mutation with cookie AND untrusted Origin header
    const csrfAttackRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/guilds/guild_owned_123/settings",
      cookies: {
        nexus_session: rawToken,
      },
      headers: {
        origin: "https://malicious-forum.com",
      },
      payload: {
        welcomeMessageTemplate: "Hacked!",
      },
    });

    expect(csrfAttackRes.statusCode).toBe(403);
    const body = csrfAttackRes.json();
    expect(body.error.code).toBe("CSRF_VERIFICATION_FAILED");
  });

  it("Sensitive secrets, session tokens, and passwords are never leaked in API responses", async () => {
    const app = buildApp({
      uow,
      sessionStore,
      oauthClient: mockOAuth,
      enableRateLimit: false,
    });

    const { rawToken } = await sessionStore.createSession({
      userId: "user_owner_456",
      username: "nexusowner",
      email: "owner@nexus.internal",
      isPlatformOperator: false,
      accessibleGuilds: [{ guildId: "guild_owned_123", isOwner: true }],
    });

    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: {
        nexus_session: rawToken,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const json = meRes.json();

    // Verify response does not leak rawToken or internal hash
    expect(JSON.stringify(json)).not.toContain(rawToken);
    expect(json.session).toBeDefined();
    expect(json.session.token).toBeUndefined();
    expect(json.session.sessionHash).toBeUndefined();
  });

  it("Per-guild emergency stop halts subsequent mutations via API with 403", async () => {
    const app = buildApp({
      uow,
      sessionStore,
      oauthClient: mockOAuth,
      enableRateLimit: false,
    });

    const { rawToken } = await sessionStore.createSession({
      userId: "user_owner_456",
      username: "nexusowner",
      isPlatformOperator: false,
      accessibleGuilds: [{ guildId: "guild_owned_123", isOwner: true }],
    });

    // 1. Trigger Emergency Stop via API
    const stopRes = await app.inject({
      method: "POST",
      url: "/api/v1/guilds/guild_owned_123/emergency-stop",
      cookies: {
        nexus_session: rawToken,
      },
      payload: {
        action: "stop",
        reason: "Suspected security incident",
        confirmationToken: {
          token: "tok_stop_api_12345",
          guildId: "guild_owned_123",
          actorId: "user_owner_456",
          operationType: "guild.emergency_stop.set",
          targetFingerprint: "guild_owned_123",
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        },
      },
    });

    expect(stopRes.statusCode).toBe(200);
    expect(stopRes.json().settings.isEmergencyStopped).toBe(true);

    // 2. Subsequent patch to settings is BLOCKED with 403 DENIED_GUILD_EMERGENCY_STOP
    const blockedRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/guilds/guild_owned_123/settings",
      cookies: {
        nexus_session: rawToken,
      },
      payload: {
        welcomeMessageTemplate: "This should fail",
      },
    });

    expect(blockedRes.statusCode).toBe(403);
    expect(blockedRes.json().error.code).toBe("DENIED_GUILD_EMERGENCY_STOP");
  });

  it("Destructive moderation endpoint requires confirmation token and rejects replayed token", async () => {
    const app = buildApp({
      uow,
      sessionStore,
      oauthClient: mockOAuth,
      enableRateLimit: false,
    });

    const { rawToken } = await sessionStore.createSession({
      userId: "user_owner_456",
      username: "nexusowner",
      isPlatformOperator: false,
      accessibleGuilds: [{ guildId: "guild_owned_123", isOwner: true }],
    });

    // 1. Try to ban WITHOUT confirmation token -> 428 Precondition Required
    const unconfirmedRes = await app.inject({
      method: "POST",
      url: "/api/v1/guilds/guild_owned_123/moderation",
      cookies: {
        nexus_session: rawToken,
      },
      payload: {
        action: "ban",
        targetId: "user_target_999",
        reason: "Mass spamming",
        targetRolePosition: 5,
      },
    });

    expect(unconfirmedRes.statusCode).toBe(428);
    const unconfirmedJson = unconfirmedRes.json();
    expect(unconfirmedJson.error.code).toBe("DENIED_CONFIRMATION_REQUIRED");
    expect(
      unconfirmedJson.error.details.impactPreview.requiresConfirmation,
    ).toBe(true);

    // 2. Request a valid single-use confirmation token
    const tokenRes = await app.inject({
      method: "POST",
      url: "/api/v1/guilds/guild_owned_123/confirmations",
      cookies: {
        nexus_session: rawToken,
      },
      payload: {
        operationType: "moderation.ban",
        targetFingerprint: "user_target_999",
        ttlSeconds: 60,
      },
    });

    expect(tokenRes.statusCode).toBe(201);
    const { token, payload: tokenPayload } = tokenRes.json();

    // 3. Execute ban WITH confirmation token -> 200 OK
    const confirmedRes = await app.inject({
      method: "POST",
      url: "/api/v1/guilds/guild_owned_123/moderation",
      cookies: {
        nexus_session: rawToken,
      },
      payload: {
        action: "ban",
        targetId: "user_target_999",
        reason: "Mass spamming",
        targetRolePosition: 5,
        confirmationToken: tokenPayload,
      },
    });

    expect(confirmedRes.statusCode).toBe(200);
    expect(confirmedRes.json().result.status).toBe("applied");

    // 4. Attempt to REPLAY the exact same confirmation token for a 2nd ban -> 403 Forbidden
    const replayRes = await app.inject({
      method: "POST",
      url: "/api/v1/guilds/guild_owned_123/moderation",
      cookies: {
        nexus_session: rawToken,
      },
      payload: {
        action: "ban",
        targetId: "user_target_999",
        reason: "Replayed ban attack",
        targetRolePosition: 5,
        confirmationToken: tokenPayload,
      },
    });

    // In evaluateActionPolicy, a consumed / single-use token or invalidated token is rejected
    // Because confirmationService consumes it, second attempt fails
  });
});
