import type {
  IUnitOfWork,
  TenantContext,
  ModerationCaseRecord,
} from "@nexus/database";
import {
  evaluateActionPolicy,
  type ActorContext,
  type PermissionGrant,
  type BotPermissionsContext,
} from "@nexus/authorization";
import {
  GuildCapability,
  type GuildCapabilityType,
  type GuildId,
  type ConfirmationTokenPayload,
  type ActionRiskLevel,
} from "@nexus/contracts";
import { PolicyViolationError, UnauthorizedError } from "../errors.js";

export type ModerationActionType =
  "warn" | "timeout" | "kick" | "ban" | "unban" | "purge";

export interface ExecuteModerationRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  action: ModerationActionType;
  target: {
    targetId: string;
    isGuildOwner?: boolean;
    isBotSelf?: boolean;
    targetRolePosition?: number;
  };
  reason: string;
  bulkCount?: number;
  durationSeconds?: number;
  botPermissions?: BotPermissionsContext;
  confirmationToken?: ConfirmationTokenPayload;
}

export interface ModerationResult {
  caseRecord?: ModerationCaseRecord;
  status: "applied" | "queued";
  action: ModerationActionType;
  targetId: string;
  hasAdminBit?: boolean;
}

function mapActionToCapability(action: ModerationActionType): {
  capability: GuildCapabilityType;
  isDestructive: boolean;
  riskLevel: ActionRiskLevel;
} {
  switch (action) {
    case "warn":
      return {
        capability: GuildCapability.ModerationWarn,
        isDestructive: false,
        riskLevel: "low",
      };
    case "timeout":
      return {
        capability: GuildCapability.ModerationTimeout,
        isDestructive: true,
        riskLevel: "medium",
      };
    case "kick":
      return {
        capability: GuildCapability.ModerationKick,
        isDestructive: true,
        riskLevel: "high",
      };
    case "ban":
      return {
        capability: GuildCapability.ModerationBan,
        isDestructive: true,
        riskLevel: "critical",
      };
    case "unban":
      return {
        capability: GuildCapability.ModerationUnban,
        isDestructive: false,
        riskLevel: "medium",
      };
    case "purge":
      return {
        capability: GuildCapability.ModerationPurge,
        isDestructive: true,
        riskLevel: "high",
      };
  }
}

export async function executeModerationWorkflow(
  uow: IUnitOfWork,
  request: ExecuteModerationRequest,
): Promise<ModerationResult> {
  const {
    actor,
    grants,
    tenant,
    correlationId,
    action,
    target,
    reason,
    bulkCount,
    durationSeconds,
    botPermissions,
    confirmationToken,
  } = request;

  const existingSettings = await uow
    .getRepositories()
    .guildSettings.getSettings(tenant);

  const { capability, isDestructive, riskLevel } =
    mapActionToCapability(action);

  // 1. Evaluate Action Policy
  const policyDecision = evaluateActionPolicy({
    actor,
    targetGuildId: tenant.guildId,
    capability,
    operation: {
      type: `moderation.${action}`,
      riskLevel,
      isDestructive,
      bulkCount,
      target: {
        targetType: action === "purge" ? "channel" : "user",
        targetId: target.targetId,
        targetRolePosition: target.targetRolePosition,
        isGuildOwner: target.isGuildOwner,
        isBotSelf: target.isBotSelf,
      },
    },
    grants,
    botPermissions,
    guildState: {
      isEmergencyStopped: existingSettings?.isEmergencyStopped,
      emergencyStopReason: existingSettings?.emergencyStopReason,
    },
    confirmationToken,
  });

  if (!policyDecision.allowed) {
    if (policyDecision.reasonCode === "DENIED_UNAUTHORIZED") {
      throw new UnauthorizedError(
        (policyDecision.details?.authReason as string) ?? "DENIED_UNAUTHORIZED",
        policyDecision.details,
      );
    }
    throw new PolicyViolationError(
      policyDecision.reasonCode,
      policyDecision.message ??
        `Moderation action '${action}' denied by policy`,
      {
        ...policyDecision.details,
        missingPermissions: policyDecision.missingDiscordPermissions,
        impactPreview: policyDecision.impactPreview,
      },
    );
  }

  // 2. Persist Moderation Case, Audit Event, and Outbox Event Transactionally
  return await uow.runInTransaction(async (repos) => {
    const caseId = `case_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt =
      durationSeconds && durationSeconds > 0
        ? new Date(Date.now() + durationSeconds * 1000)
        : null;

    let caseRecord: ModerationCaseRecord | undefined;

    if (action !== "purge") {
      caseRecord = await repos.moderationCases.create(tenant, {
        id: caseId,
        caseNumber: Math.floor(Math.random() * 100000) + 1,
        targetUserId: target.targetId,
        moderatorId: actor.actorId,
        action,
        reason,
        status: "applied",
        expiresAt,
      });
    }

    // Record immutable audit event
    await repos.auditEvents.record({
      eventId: `aud_mod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      realm: "guild",
      guildId: tenant.guildId as GuildId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      action: capability,
      resourceType: action === "purge" ? "channel" : "member",
      resourceId: target.targetId,
      outcome: "success",
      reason,
      correlationId,
      occurredAt: new Date().toISOString(),
      details: {
        action,
        targetId: target.targetId,
        bulkCount,
        hasAdminBit: policyDecision.hasAdminBit,
      },
    });

    // Write Outbox Event for Discord REST Worker Dispatch
    await repos.outbox.writeEvent({
      id: `evt_mod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      guildId: tenant.guildId,
      eventType: `discord.action.${action}`,
      eventVersion: 1,
      aggregateType: "moderation",
      aggregateId: target.targetId,
      payloadJson: {
        action,
        targetId: target.targetId,
        reason,
        durationSeconds,
        bulkCount,
        correlationId,
      },
      availableAt: new Date(),
    });

    return {
      caseRecord,
      status: "applied",
      action,
      targetId: target.targetId,
      hasAdminBit: policyDecision.hasAdminBit,
    };
  });
}
