import { describe, it, expect } from "vitest";
import {
  evaluateActionPolicy,
  DiscordPermissions,
  type ActorContext,
  type PermissionGrant,
} from "../src/index.js";
import { GuildCapability } from "@nexus/contracts";

describe("Action Safety Policy Engine", () => {
  const guildOwnerActor: ActorContext = {
    actorId: "user_owner_111",
    actorType: "user",
    realm: "guild",
    guildId: "guild_alpha",
    isGuildOwner: true,
  };

  const moderatorActor: ActorContext = {
    actorId: "user_mod_222",
    actorType: "user",
    realm: "guild",
    guildId: "guild_alpha",
    roleIds: ["role_mod"],
    actorRolePosition: 50,
  };

  const unprivilegedActor: ActorContext = {
    actorId: "user_member_333",
    actorType: "user",
    realm: "guild",
    guildId: "guild_alpha",
    roleIds: ["role_member"],
    actorRolePosition: 10,
  };

  const modGrants: PermissionGrant[] = [
    {
      id: "grant_mod_1",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId: "guild_alpha",
      capability: "moderation.*",
      effect: "allow",
    },
  ];

  it("Administrator permission in Discord DOES NOT bypass missing internal capability grants", () => {
    // Bot has full Discord Administrator bit, but actor has NO grant for moderation.ban
    const decision = evaluateActionPolicy({
      actor: unprivilegedActor,
      targetGuildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      operation: {
        type: "moderation.ban",
        riskLevel: "critical",
        isDestructive: true,
        target: {
          targetId: "user_target_444",
          targetRolePosition: 5,
        },
      },
      grants: [], // No grants
      botPermissions: {
        rawBitfield: DiscordPermissions.ADMINISTRATOR, // 0x8
        botRolePosition: 99,
      },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("DENIED_UNAUTHORIZED");
  });

  it("Administrator permission in Discord DOES NOT bypass guild emergency stop", () => {
    const decision = evaluateActionPolicy({
      actor: moderatorActor,
      targetGuildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      operation: {
        type: "moderation.ban",
        riskLevel: "critical",
        isDestructive: true,
        target: {
          targetId: "user_target_444",
          targetRolePosition: 5,
        },
      },
      grants: modGrants,
      botPermissions: {
        rawBitfield: DiscordPermissions.ADMINISTRATOR,
      },
      guildState: {
        isEmergencyStopped: true,
        emergencyStopReason: "Raid in progress",
      },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("DENIED_GUILD_EMERGENCY_STOP");
  });

  it("Administrator permission in Discord DOES NOT bypass global emergency stop", () => {
    const decision = evaluateActionPolicy({
      actor: moderatorActor,
      targetGuildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      operation: {
        type: "moderation.ban",
        riskLevel: "critical",
        isDestructive: true,
        target: {
          targetId: "user_target_444",
          targetRolePosition: 5,
        },
      },
      grants: modGrants,
      botPermissions: {
        rawBitfield: DiscordPermissions.ADMINISTRATOR,
      },
      globalState: {
        isEmergencyStopped: true,
      },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("DENIED_GLOBAL_EMERGENCY_STOP");
  });

  it("Administrator permission in Discord DOES NOT bypass role hierarchy rules", () => {
    // 1. Cannot ban the guild owner
    const banOwnerDecision = evaluateActionPolicy({
      actor: moderatorActor,
      targetGuildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      operation: {
        type: "moderation.ban",
        riskLevel: "critical",
        isDestructive: true,
        target: {
          targetId: "user_owner_111",
          isGuildOwner: true,
        },
      },
      grants: modGrants,
      botPermissions: {
        rawBitfield: DiscordPermissions.ADMINISTRATOR,
        botRolePosition: 99,
      },
    });

    expect(banOwnerDecision.allowed).toBe(false);
    expect(banOwnerDecision.reasonCode).toBe("DENIED_ROLE_HIERARCHY");

    // 2. Bot cannot target itself
    const banBotDecision = evaluateActionPolicy({
      actor: moderatorActor,
      targetGuildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      operation: {
        type: "moderation.ban",
        riskLevel: "critical",
        isDestructive: true,
        target: {
          targetId: "bot_nexus_id",
          isBotSelf: true,
        },
      },
      grants: modGrants,
      botPermissions: {
        rawBitfield: DiscordPermissions.ADMINISTRATOR,
        botRolePosition: 99,
      },
    });

    expect(banBotDecision.allowed).toBe(false);
    expect(banBotDecision.reasonCode).toBe("DENIED_ROLE_HIERARCHY");

    // 3. Actor cannot ban someone with equal or superior role position
    const banSuperiorDecision = evaluateActionPolicy({
      actor: moderatorActor, // position 50
      targetGuildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      operation: {
        type: "moderation.ban",
        riskLevel: "critical",
        isDestructive: true,
        target: {
          targetId: "user_admin_999",
          targetRolePosition: 80, // Superior role
        },
      },
      grants: modGrants,
      botPermissions: {
        rawBitfield: DiscordPermissions.ADMINISTRATOR,
        botRolePosition: 99,
      },
    });

    expect(banSuperiorDecision.allowed).toBe(false);
    expect(banSuperiorDecision.reasonCode).toBe("DENIED_ROLE_HIERARCHY");
  });

  it("Administrator permission in Discord DOES NOT bypass bulk safety limits", () => {
    const decision = evaluateActionPolicy({
      actor: moderatorActor,
      targetGuildId: "guild_alpha",
      capability: GuildCapability.ModerationPurge,
      operation: {
        type: "moderation.purge",
        riskLevel: "high",
        isDestructive: true,
        bulkCount: 500, // Exceeds default limit of 100
        target: {
          targetId: "channel_general",
        },
      },
      grants: modGrants,
      botPermissions: {
        rawBitfield: DiscordPermissions.ADMINISTRATOR,
      },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("DENIED_BULK_LIMIT_EXCEEDED");
    expect(decision.details?.maxAllowed).toBe(100);
  });

  it("Administrator permission in Discord DOES NOT bypass confirmation requirement for destructive actions", () => {
    const decision = evaluateActionPolicy({
      actor: moderatorActor,
      targetGuildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      operation: {
        type: "moderation.ban",
        riskLevel: "critical",
        isDestructive: true,
        target: {
          targetId: "user_target_444",
          targetRolePosition: 5,
        },
      },
      grants: modGrants,
      botPermissions: {
        rawBitfield: DiscordPermissions.ADMINISTRATOR,
        botRolePosition: 99,
      },
      // No confirmationToken provided
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("DENIED_CONFIRMATION_REQUIRED");
    expect(decision.impactPreview?.requiresConfirmation).toBe(true);
  });

  it("Enforces granular Discord permissions in restricted mode when Administrator is absent", () => {
    // 1. Missing permission: bot lacks BAN_MEMBERS
    const missingPermDecision = evaluateActionPolicy({
      actor: moderatorActor,
      targetGuildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      operation: {
        type: "moderation.ban",
        riskLevel: "critical",
        isDestructive: true,
        target: {
          targetId: "user_target_444",
          targetRolePosition: 5,
        },
      },
      grants: modGrants,
      botPermissions: {
        rawBitfield:
          DiscordPermissions.SEND_MESSAGES | DiscordPermissions.VIEW_CHANNEL,
        botRolePosition: 99,
      },
      confirmationToken: {
        token: "tok_1234567890123456",
        guildId: "guild_alpha",
        actorId: moderatorActor.actorId,
        operationType: "moderation.ban",
        targetFingerprint: "user_target_444",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });

    expect(missingPermDecision.allowed).toBe(false);
    expect(missingPermDecision.reasonCode).toBe(
      "DENIED_MISSING_DISCORD_PERMISSIONS",
    );
    expect(missingPermDecision.missingDiscordPermissions).toContain(
      "BAN_MEMBERS",
    );

    // 2. Granted permission: bot has BAN_MEMBERS granularly
    const grantedPermDecision = evaluateActionPolicy({
      actor: moderatorActor,
      targetGuildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      operation: {
        type: "moderation.ban",
        riskLevel: "critical",
        isDestructive: true,
        target: {
          targetId: "user_target_444",
          targetRolePosition: 5,
        },
      },
      grants: modGrants,
      botPermissions: {
        rawBitfield: DiscordPermissions.BAN_MEMBERS,
        botRolePosition: 99,
      },
      confirmationToken: {
        token: "tok_1234567890123456",
        guildId: "guild_alpha",
        actorId: moderatorActor.actorId,
        operationType: "moderation.ban",
        targetFingerprint: "user_target_444",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });

    expect(grantedPermDecision.allowed).toBe(true);
    expect(grantedPermDecision.reasonCode).toBe("ALLOWED");
    expect(grantedPermDecision.hasAdminBit).toBe(false);
  });

  it("Rejects expired or mismatched confirmation tokens", () => {
    const past = new Date(Date.now() - 5000);

    // Expired token
    const expiredDecision = evaluateActionPolicy({
      actor: moderatorActor,
      targetGuildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      operation: {
        type: "moderation.ban",
        riskLevel: "critical",
        isDestructive: true,
        target: {
          targetId: "user_target_444",
          targetRolePosition: 5,
        },
      },
      grants: modGrants,
      botPermissions: {
        rawBitfield: DiscordPermissions.ADMINISTRATOR,
      },
      confirmationToken: {
        token: "tok_expired",
        guildId: "guild_alpha",
        actorId: moderatorActor.actorId,
        operationType: "moderation.ban",
        targetFingerprint: "user_target_444",
        createdAt: new Date(Date.now() - 65000).toISOString(),
        expiresAt: past.toISOString(),
      },
    });

    expect(expiredDecision.allowed).toBe(false);
    expect(expiredDecision.reasonCode).toBe("DENIED_CONFIRMATION_INVALID");

    // Mismatched target fingerprint
    const mismatchDecision = evaluateActionPolicy({
      actor: moderatorActor,
      targetGuildId: "guild_alpha",
      capability: GuildCapability.ModerationBan,
      operation: {
        type: "moderation.ban",
        riskLevel: "critical",
        isDestructive: true,
        target: {
          targetId: "user_target_444",
          targetRolePosition: 5,
        },
      },
      grants: modGrants,
      botPermissions: {
        rawBitfield: DiscordPermissions.ADMINISTRATOR,
      },
      confirmationToken: {
        token: "tok_valid",
        guildId: "guild_alpha",
        actorId: moderatorActor.actorId,
        operationType: "moderation.ban",
        targetFingerprint: "DIFFERENT_TARGET_USER",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });

    expect(mismatchDecision.allowed).toBe(false);
    expect(mismatchDecision.reasonCode).toBe("DENIED_CONFIRMATION_INVALID");
  });
});
