import { describe, it, expect, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import { InMemorySessionStore } from "../src/auth/session-manager.js";
import { MockDiscordOAuthClient } from "../src/auth/discord-oauth.js";
import { InMemoryUnitOfWork } from "@nexus/database";
import type { FastifyInstance } from "fastify";

describe("Nexus API - Health Endpoints", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp({
      uow: new InMemoryUnitOfWork(),
      sessionStore: new InMemorySessionStore(),
      oauthClient: new MockDiscordOAuthClient(),
      enableRateLimit: false,
    });
  });

  it("GET /health/live returns status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health/live" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.uptime).toBeTypeOf("number");
  });

  it("GET /health/ready returns status ready", async () => {
    const res = await app.inject({ method: "GET", url: "/health/ready" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ready");
  });
});

describe("Nexus API - Authentication & Session Lifecycle", () => {
  let app: FastifyInstance;
  let sessionStore: InMemorySessionStore;

  beforeEach(() => {
    sessionStore = new InMemorySessionStore();
    app = buildApp({
      uow: new InMemoryUnitOfWork(),
      sessionStore,
      oauthClient: new MockDiscordOAuthClient(),
      enableRateLimit: false,
    });
  });

  it("initiates OAuth login and sets state cookie", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/discord/login",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.url).toContain("https://discord.com/api/oauth2/authorize");

    const cookies = res.cookies;
    const stateCookie = cookies.find((c) => c.name === "oauth_state");
    expect(stateCookie).toBeDefined();
    expect(stateCookie?.value).toBeTruthy();
  });

  it("completes OAuth callback with valid state, sets session cookie", async () => {
    // 1. Get state
    const loginRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/discord/login",
    });
    const stateCookie = loginRes.cookies.find((c) => c.name === "oauth_state")!;

    // 2. Callback with matching state
    const callbackRes = await app.inject({
      method: "GET",
      url: `/api/v1/auth/discord/callback?code=mock_code&state=${stateCookie.value}`,
      cookies: {
        oauth_state: stateCookie.value,
      },
    });

    expect(callbackRes.statusCode).toBe(200);
    const body = callbackRes.json();
    expect(body.user.username).toBe("TestDiscordUser");

    const sessionCookie = callbackRes.cookies.find(
      (c) => c.name === "nexus_session",
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);

    // 3. Authenticate with session cookie
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: {
        nexus_session: sessionCookie!.value,
      },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().user.username).toBe("TestDiscordUser");
  });

  it("rejects callback when state does not match", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/discord/callback?code=mock_code&state=wrong_state",
      cookies: {
        oauth_state: "expected_state",
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_OAUTH_STATE");
  });

  it("revokes session on logout", async () => {
    const { rawToken } = await sessionStore.createSession({
      userId: "usr_logout_test",
      username: "LogoutUser",
      email: null,
    });

    // Verify session works before logout
    const preLogoutRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { nexus_session: rawToken },
    });
    expect(preLogoutRes.statusCode).toBe(200);

    // Logout
    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: { nexus_session: rawToken },
    });
    expect(logoutRes.statusCode).toBe(200);

    // Verify session is revoked
    const postLogoutRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { nexus_session: rawToken },
    });
    expect(postLogoutRes.statusCode).toBe(401);
  });
});

describe("Nexus API - Tenant Boundary & Cross-Tenant Negative Tests", () => {
  let app: FastifyInstance;
  let sessionStore: InMemorySessionStore;
  let uow: InMemoryUnitOfWork;
  let tenantToken: string;

  const guildAlpha = "111111111111111111";
  const guildBeta = "222222222222222222";

  beforeEach(async () => {
    uow = new InMemoryUnitOfWork();
    sessionStore = new InMemorySessionStore();
    app = buildApp({
      uow,
      sessionStore,
      oauthClient: new MockDiscordOAuthClient(),
      enableRateLimit: false,
    });

    // Create a user who only has access to guildAlpha
    const sessionRes = await sessionStore.createSession({
      userId: "usr_alpha_owner",
      username: "AlphaOwner",
      email: "alpha@test.com",
      isPlatformOperator: false,
      accessibleGuilds: [{ guildId: guildAlpha, isOwner: true }],
    });
    tenantToken = sessionRes.rawToken;
  });

  it("allows access to managed guild endpoints", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/guilds/${guildAlpha}/settings`,
      cookies: { nexus_session: tenantToken },
    });
    expect(res.statusCode).toBe(200);
  });

  it("strictly prohibits cross-tenant access to unmanaged guilds (403 TENANT_ACCESS_DENIED)", async () => {
    // Attempting to access guildBeta
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/guilds/${guildBeta}/settings`,
      cookies: { nexus_session: tenantToken },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.error.code).toBe("TENANT_ACCESS_DENIED");
  });

  it("prohibits guild actors from accessing platform routes (403 REALM_MISMATCH)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/platform/health",
      cookies: { nexus_session: tenantToken },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("REALM_MISMATCH");
  });

  it("allows platform operators to access platform routes", async () => {
    const operatorSession = await sessionStore.createSession({
      userId: "usr_platform_op",
      username: "PlatformAdmin",
      email: "admin@platform.gg",
      isPlatformOperator: true,
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/platform/health",
      cookies: { nexus_session: operatorSession.rawToken },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().platformStatus).toBe("healthy");
  });
});

describe("Nexus API - Workflow Endpoints", () => {
  let app: FastifyInstance;
  let sessionStore: InMemorySessionStore;
  let uow: InMemoryUnitOfWork;
  let token: string;
  const guildId = "111111111111111111";

  beforeEach(async () => {
    uow = new InMemoryUnitOfWork();
    sessionStore = new InMemorySessionStore();
    app = buildApp({
      uow,
      sessionStore,
      oauthClient: new MockDiscordOAuthClient(),
      enableRateLimit: false,
    });

    const sessionRes = await sessionStore.createSession({
      userId: "usr_owner",
      username: "GuildOwner",
      email: "owner@nexus.gg",
      isPlatformOperator: false,
      accessibleGuilds: [{ guildId, isOwner: true }],
    });
    token = sessionRes.rawToken;
  });

  it("PATCH /api/v1/guilds/:guildId/settings updates settings", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/guilds/${guildId}/settings`,
      cookies: { nexus_session: token },
      payload: {
        welcomeChannelId: "chan_welcome_1",
        welcomeMessageTemplate: "Hello and welcome!",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.settings.welcomeChannelId).toBe("chan_welcome_1");
  });

  it("POST /api/v1/guilds/:guildId/announcements creates announcement with sanitized mentions", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/guilds/${guildId}/announcements`,
      cookies: { nexus_session: token },
      payload: {
        id: "ann_api_1",
        channelId: "chan_announcements",
        title: "Community Gathering",
        content: "Hey @everyone, join us!",
        allowEveryone: false,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.announcement.id).toBe("ann_api_1");
    expect(body.announcement.content).toContain("@\u200beveryone");
  });

  it("POST /api/v1/guilds/:guildId/tickets/:ticketId/transition handles ticket lifecycle", async () => {
    // Seed open ticket
    await uow.getRepositories().tickets.create(
      { guildId },
      {
        id: "tkt_api_1",
        ticketNumber: 101,
        requesterId: "usr_req",
        assignedUserId: null,
        channelId: "chan_tkt",
        category: "general",
        status: "open",
        closedAt: null,
        retentionDeadline: null,
      },
    );

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/guilds/${guildId}/tickets/tkt_api_1/transition`,
      cookies: { nexus_session: token },
      payload: {
        action: "start_work",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ticket.status).toBe("in_progress");
  });

  it("POST /api/v1/guilds/:guildId/tickets opens a new ticket", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/guilds/${guildId}/tickets`,
      cookies: { nexus_session: token },
      payload: {
        category: "billing",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.ticket.category).toBe("billing");
    expect(body.ticket.status).toBe("open");

    // List tickets
    const listRes = await app.inject({
      method: "GET",
      url: `/api/v1/guilds/${guildId}/tickets`,
      cookies: { nexus_session: token },
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().tickets.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/v1/guilds/:guildId/polls handles creation, voting, and closing", async () => {
    // 1. Create Poll
    const createRes = await app.inject({
      method: "POST",
      url: `/api/v1/guilds/${guildId}/polls`,
      cookies: { nexus_session: token },
      payload: {
        question: "Best Game?",
        options: ["Apex", "Valorant", "Overwatch"],
        channelId: "chan_polls",
      },
    });

    expect(createRes.statusCode).toBe(201);
    const pollId = createRes.json().poll.id;

    // 2. Vote
    const voteRes = await app.inject({
      method: "POST",
      url: `/api/v1/guilds/${guildId}/polls/${pollId}/vote`,
      cookies: { nexus_session: token },
      payload: {
        optionIndex: 0,
      },
    });
    expect(voteRes.statusCode).toBe(200);
    expect(voteRes.json().success).toBe(true);

    // 3. Close Poll
    const closeRes = await app.inject({
      method: "POST",
      url: `/api/v1/guilds/${guildId}/polls/${pollId}/close`,
      cookies: { nexus_session: token },
    });
    expect(closeRes.statusCode).toBe(200);
    expect(closeRes.json().poll.status).toBe("closed");
  });

  it("POST /api/v1/guilds/:guildId/giveaways handles lifecycle", async () => {
    // 1. Create Giveaway
    const createRes = await app.inject({
      method: "POST",
      url: `/api/v1/guilds/${guildId}/giveaways`,
      cookies: { nexus_session: token },
      payload: {
        prize: "Battle Pass",
        channelId: "chan_giveaways",
        winnerCount: 1,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const giveawayId = createRes.json().giveaway.id;

    // 2. Enter Giveaway
    const enterRes = await app.inject({
      method: "POST",
      url: `/api/v1/guilds/${guildId}/giveaways/${giveawayId}/enter`,
      cookies: { nexus_session: token },
    });
    expect(enterRes.statusCode).toBe(200);
    expect(enterRes.json().success).toBe(true);

    // 3. End Giveaway
    const endRes = await app.inject({
      method: "POST",
      url: `/api/v1/guilds/${guildId}/giveaways/${giveawayId}/end`,
      cookies: { nexus_session: token },
    });
    expect(endRes.statusCode).toBe(200);
    expect(endRes.json().giveaway.status).toBe("ended");
    expect(endRes.json().winners).toEqual(["usr_owner"]);
  });
});
