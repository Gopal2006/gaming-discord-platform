import { GuildCapability } from "@nexus/contracts";
import { evaluateAuthorization } from "./engine.js";
import {
  checkCapabilityPermissions,
  CAPABILITY_PERMISSION_MANIFEST,
} from "./manifest.js";
import type {
  ActionPolicyRequest,
  ActionPolicyDecision,
  ActionImpactPreview,
} from "./action-policy-types.js";

/**
 * Central, transport-independent Action-Safety Policy Engine.
 *
 * Enforces:
 * 1. Global emergency stop
 * 2. Guild-level emergency stop
 * 3. Actor authorization (grants / RBAC)
 * 4. Role hierarchy & self-action protection
 * 5. Discord permission validation (Administrator or Granular bitset)
 *    *NOTE: Discord Administrator permission never bypasses internal safety rules!*
 * 6. Bulk safety caps (unbounded destructive operations strictly forbidden)
 * 7. Mass mention suppression
 * 8. High-impact single-use cryptographic confirmation token validation
 * 9. Fail-closed on error or indeterminate state
 */
export function evaluateActionPolicy(
  request: ActionPolicyRequest,
): ActionPolicyDecision {
  try {
    const now = request.now ?? new Date();
    const {
      actor,
      targetGuildId,
      capability,
      operation,
      grants,
      botPermissions,
      guildState,
      globalState,
      confirmationToken,
      safetyLimits,
    } = request;

    // 1. Global Emergency Stop (Halts all bot mutations platform-wide)
    if (globalState?.isEmergencyStopped) {
      return {
        allowed: false,
        reasonCode: "DENIED_GLOBAL_EMERGENCY_STOP",
        message:
          "Platform-wide emergency stop is active. Automated and privileged bot mutations are paused.",
        details: {
          reason: globalState.emergencyStopReason ?? "Manual intervention",
        },
      };
    }

    // 2. Guild-level Emergency Stop (Halts all actions in this guild except emergency management)
    const isEmergencyManagementOp =
      operation.type === "guild.emergency_stop.lift" ||
      operation.type === "guild.emergency_stop.set";

    if (guildState?.isEmergencyStopped && !isEmergencyManagementOp) {
      return {
        allowed: false,
        reasonCode: "DENIED_GUILD_EMERGENCY_STOP",
        message: `Emergency stop is active for guild ${targetGuildId}. Bot actions are paused.`,
        details: {
          reason:
            guildState.emergencyStopReason ?? "Guild emergency stop active",
        },
      };
    }

    // 3. Actor Authorization (RBAC & Grants)
    const authDecision = evaluateAuthorization(
      {
        actor,
        capability,
        targetRealm: "guild",
        targetGuildId,
        now,
      },
      grants,
    );

    if (!authDecision.allowed) {
      return {
        allowed: false,
        reasonCode: "DENIED_UNAUTHORIZED",
        message: `Actor is not authorized for capability '${capability}'`,
        details: { authReason: authDecision.reasonCode },
      };
    }

    // 4. Role Hierarchy & Target Validation
    if (operation.target) {
      const target = operation.target;

      // A. Cannot target guild owner with disciplinary/moderation actions
      if (target.isGuildOwner) {
        return {
          allowed: false,
          reasonCode: "DENIED_ROLE_HIERARCHY",
          message:
            "Protected target: cannot execute disciplinary or moderation action against the server owner.",
          details: { targetId: target.targetId },
        };
      }

      // B. Bot cannot target itself
      if (target.isBotSelf) {
        return {
          allowed: false,
          reasonCode: "DENIED_ROLE_HIERARCHY",
          message:
            "Invalid target: bot cannot execute disciplinary action on itself.",
          details: { targetId: target.targetId },
        };
      }

      // C. Actor cannot target self for destructive disciplinary actions
      if (operation.isDestructive && target.targetId === actor.actorId) {
        return {
          allowed: false,
          reasonCode: "DENIED_ROLE_HIERARCHY",
          message:
            "Invalid target: actor cannot execute destructive action on self.",
          details: { targetId: target.targetId },
        };
      }

      // D. Actor hierarchy check: actor cannot target equal or higher role position unless guild owner
      if (
        !actor.isGuildOwner &&
        target.targetRolePosition !== undefined &&
        actor.actorRolePosition !== undefined &&
        target.targetRolePosition >= actor.actorRolePosition
      ) {
        return {
          allowed: false,
          reasonCode: "DENIED_ROLE_HIERARCHY",
          message:
            "Hierarchy violation: actor cannot target a member with an equal or superior role position.",
          details: {
            targetRolePosition: target.targetRolePosition,
            actorRolePosition: actor.actorRolePosition,
          },
        };
      }

      // E. Bot hierarchy check: bot cannot moderate a member with an equal or higher role than the bot
      if (
        target.targetRolePosition !== undefined &&
        botPermissions?.botRolePosition !== undefined &&
        target.targetRolePosition >= botPermissions.botRolePosition
      ) {
        return {
          allowed: false,
          reasonCode: "DENIED_ROLE_HIERARCHY",
          message:
            "Bot hierarchy violation: bot cannot moderate a member with an equal or superior role position to its own highest role.",
          details: {
            targetRolePosition: target.targetRolePosition,
            botRolePosition: botPermissions.botRolePosition,
          },
        };
      }
    }

    // 5. Discord Permissions Verification (Administrator bit or Granular bitset)
    let permCheck: {
      satisfies: boolean;
      hasAdminBit: boolean;
      missingPermissions: import("./manifest.js").DiscordPermissionName[];
    } = { satisfies: true, hasAdminBit: false, missingPermissions: [] };

    if (botPermissions?.rawBitfield !== undefined) {
      permCheck = checkCapabilityPermissions(
        botPermissions.rawBitfield,
        capability,
      );

      if (!permCheck.satisfies) {
        return {
          allowed: false,
          reasonCode: "DENIED_MISSING_DISCORD_PERMISSIONS",
          message: `Bot lacks required Discord permissions for capability '${capability}'`,
          missingDiscordPermissions: permCheck.missingPermissions,
          hasAdminBit: permCheck.hasAdminBit,
        };
      }
    }

    // 6. Bulk Limits Check (unbounded mass-destructive actions forbidden)
    const maxBulkPurge = safetyLimits?.maxBulkPurge ?? 100;
    if (
      operation.bulkCount !== undefined &&
      operation.bulkCount > maxBulkPurge
    ) {
      return {
        allowed: false,
        reasonCode: "DENIED_BULK_LIMIT_EXCEEDED",
        message: `Bulk limit exceeded. Requested: ${operation.bulkCount}, maximum safe limit: ${maxBulkPurge}`,
        details: { requested: operation.bulkCount, maxAllowed: maxBulkPurge },
      };
    }

    // 7. Mass Mentions Policy (@everyone / @here)
    if (operation.mentions?.everyone || operation.mentions?.here) {
      const allowsMassMention =
        capability === GuildCapability.AnnouncementPublish ||
        capability === GuildCapability.ModerationLock;
      if (!allowsMassMention) {
        return {
          allowed: false,
          reasonCode: "DENIED_MASS_MENTION_UNAUTHORIZED",
          message:
            "Mass mentions (@everyone / @here) are strictly suppressed for this operation.",
        };
      }
    }

    // 8. Destructive Actions & High-Impact Confirmation Check
    const manifestReq = CAPABILITY_PERMISSION_MANIFEST[capability];
    const requiresConfirmation =
      operation.isDestructive ||
      operation.riskLevel === "critical" ||
      (manifestReq?.isDestructive && operation.riskLevel !== "low");

    if (requiresConfirmation) {
      const targetFingerprint = operation.target?.targetId ?? targetGuildId;

      if (!confirmationToken) {
        const preview: ActionImpactPreview = {
          operationType: operation.type,
          targetCount: operation.bulkCount ?? (operation.target ? 1 : 0),
          description: `High-impact operation '${operation.type}' requires explicit confirmation.`,
          isDestructive: true,
          requiresConfirmation: true,
        };

        return {
          allowed: false,
          reasonCode: "DENIED_CONFIRMATION_REQUIRED",
          message:
            "This is a high-impact operation requiring explicit user confirmation.",
          hasAdminBit: permCheck.hasAdminBit,
          impactPreview: preview,
        };
      }

      // Verify confirmation token integrity
      const isTokenExpired =
        new Date(confirmationToken.expiresAt).getTime() <= now.getTime();
      const isGuildMatch = confirmationToken.guildId === targetGuildId;
      const isActorMatch = confirmationToken.actorId === actor.actorId;
      const isOperationMatch =
        confirmationToken.operationType === operation.type;
      const isTargetMatch =
        confirmationToken.targetFingerprint === targetFingerprint;

      if (
        isTokenExpired ||
        !isGuildMatch ||
        !isActorMatch ||
        !isOperationMatch ||
        !isTargetMatch
      ) {
        return {
          allowed: false,
          reasonCode: "DENIED_CONFIRMATION_INVALID",
          message:
            "Provided confirmation token is expired, mismatched, or invalid.",
          details: {
            expired: isTokenExpired,
            guildMatch: isGuildMatch,
            actorMatch: isActorMatch,
            opMatch: isOperationMatch,
            targetMatch: isTargetMatch,
          },
        };
      }
    }

    // 9. All safety policies satisfied
    return {
      allowed: true,
      reasonCode: "ALLOWED",
      hasAdminBit: permCheck.hasAdminBit,
    };
  } catch (error) {
    // Fail closed on unexpected exceptions
    return {
      allowed: false,
      reasonCode: "DENIED_FAIL_CLOSED",
      message:
        "An unexpected error occurred during policy evaluation; failing closed.",
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
