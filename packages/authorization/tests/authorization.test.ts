import { describe, it, expect } from "vitest";
import { GuildCapability, PlatformCapability } from "@nexus/contracts";
import {
  evaluateAuthorization,
  type ActorContext,
  type PermissionGrant,
  type AuthorizationRequest,
} from "../src/index.js";

describe("Authorization Engine", () => {
  const guildActor: ActorContext = {
    actorId: "usr_100",
    actorType: "user",
    realm: "guild",
    guildId: "guild_alpha",
    roleIds: ["role_moderator"],
    isGuildOwner: false,
  };

  const platformOperator: ActorContext = {
    actorId: "op_999",
    actorType: "platform_operator",
    realm: "platform",
  };

  it("denies by default when no grants exist", () => {
    const request: AuthorizationRequest = {
      actor: guildActor,
      capability: GuildCapability.AnnouncementPublish,
      targetRealm: "guild",
      targetGuildId: "guild_alpha",
    };

    const decision = evaluateAuthorization(request, []);
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("DENIED_BY_DEFAULT");
  });

  it("prohibits guild actors from accessing platform realm", () => {
    const request: AuthorizationRequest = {
      actor: guildActor,
      capability: PlatformCapability.HealthView,
      targetRealm: "platform",
    };

    const decision = evaluateAuthorization(request, []);
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("DENIED_REALM_MISMATCH");
  });

  it("enforces tenant isolation: actor from guild_alpha cannot act on guild_beta", () => {
    const request: AuthorizationRequest = {
      actor: guildActor,
      capability: GuildCapability.GuildSettingsEdit,
      targetRealm: "guild",
      targetGuildId: "guild_beta", // cross-tenant!
    };

    const decision = evaluateAuthorization(request, []);
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("DENIED_TENANT_MISMATCH");
  });

  it("allows access when an active user grant exists", () => {
    const grant: PermissionGrant = {
      id: "grant_1",
      principalType: "user",
      principalId: "usr_100",
      realm: "guild",
      guildId: "guild_alpha",
      capability: GuildCapability.AnnouncementPublish,
      effect: "allow",
    };

    const request: AuthorizationRequest = {
      actor: guildActor,
      capability: GuildCapability.AnnouncementPublish,
      targetRealm: "guild",
      targetGuildId: "guild_alpha",
    };

    const decision = evaluateAuthorization(request, [grant]);
    expect(decision.allowed).toBe(true);
    expect(decision.reasonCode).toBe("ALLOWED");
    expect(decision.matchedGrantId).toBe("grant_1");
  });

  it("allows access via role grant", () => {
    const grant: PermissionGrant = {
      id: "grant_role_mod",
      principalType: "role",
      principalId: "role_moderator",
      realm: "guild",
      guildId: "guild_alpha",
      capability: GuildCapability.ModerationWarn,
      effect: "allow",
    };

    const request: AuthorizationRequest = {
      actor: guildActor,
      capability: GuildCapability.ModerationWarn,
      targetRealm: "guild",
      targetGuildId: "guild_alpha",
    };

    const decision = evaluateAuthorization(request, [grant]);
    expect(decision.allowed).toBe(true);
    expect(decision.reasonCode).toBe("ALLOWED");
  });

  it("enforces explicit DENY over role ALLOW", () => {
    const allowRoleGrant: PermissionGrant = {
      id: "grant_role_allow",
      principalType: "role",
      principalId: "role_moderator",
      realm: "guild",
      guildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      effect: "allow",
    };

    const explicitDenyUserGrant: PermissionGrant = {
      id: "grant_user_deny",
      principalType: "user",
      principalId: "usr_100",
      realm: "guild",
      guildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      effect: "deny",
    };

    const request: AuthorizationRequest = {
      actor: guildActor,
      capability: GuildCapability.ModerationBan,
      targetRealm: "guild",
      targetGuildId: "guild_alpha",
    };

    const decision = evaluateAuthorization(request, [
      allowRoleGrant,
      explicitDenyUserGrant,
    ]);
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("DENIED_EXPLICIT");
    expect(decision.matchedGrantId).toBe("grant_user_deny");
  });

  it("ignores expired grants", () => {
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
    const expiredGrant: PermissionGrant = {
      id: "grant_expired",
      principalType: "user",
      principalId: "usr_100",
      realm: "guild",
      guildId: "guild_alpha",
      capability: GuildCapability.AnnouncementCreate,
      effect: "allow",
      expiresAt: pastDate,
    };

    const request: AuthorizationRequest = {
      actor: guildActor,
      capability: GuildCapability.AnnouncementCreate,
      targetRealm: "guild",
      targetGuildId: "guild_alpha",
      now: new Date(),
    };

    const decision = evaluateAuthorization(request, [expiredGrant]);
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("DENIED_BY_DEFAULT");
  });

  it("enforces resource scope constraints", () => {
    const scopedGrant: PermissionGrant = {
      id: "grant_scoped_channel",
      principalType: "user",
      principalId: "usr_100",
      realm: "guild",
      guildId: "guild_alpha",
      capability: GuildCapability.AnnouncementPublish,
      resourceScope: {
        resourceType: "channel",
        resourceId: "chan_announcements",
      },
      effect: "allow",
    };

    // Attempting to publish to a different channel
    const requestWrongChannel: AuthorizationRequest = {
      actor: guildActor,
      capability: GuildCapability.AnnouncementPublish,
      targetRealm: "guild",
      targetGuildId: "guild_alpha",
      resourceScope: { resourceType: "channel", resourceId: "chan_general" },
    };

    const decision = evaluateAuthorization(requestWrongChannel, [scopedGrant]);
    expect(decision.allowed).toBe(false);

    // Publishing to the granted channel
    const requestTargetChannel: AuthorizationRequest = {
      actor: guildActor,
      capability: GuildCapability.AnnouncementPublish,
      targetRealm: "guild",
      targetGuildId: "guild_alpha",
      resourceScope: {
        resourceType: "channel",
        resourceId: "chan_announcements",
      },
    };

    const decisionTarget = evaluateAuthorization(requestTargetChannel, [
      scopedGrant,
    ]);
    expect(decisionTarget.allowed).toBe(true);
  });
});
