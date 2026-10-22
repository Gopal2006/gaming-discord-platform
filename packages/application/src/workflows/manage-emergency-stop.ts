import type {
  IUnitOfWork,
  GuildSettingsRecord,
  TenantContext,
} from "@nexus/database";
import {
  evaluateActionPolicy,
  type ActorContext,
  type PermissionGrant,
} from "@nexus/authorization";
import {
  GuildCapability,
  type GuildId,
  type ConfirmationTokenPayload,
} from "@nexus/contracts";
import { PolicyViolationError, UnauthorizedError } from "../errors.js";

export interface ManageEmergencyStopRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  action: "stop" | "lift";
  reason?: string;
  confirmationToken?: ConfirmationTokenPayload;
}

export async function manageEmergencyStopWorkflow(
  uow: IUnitOfWork,
  request: ManageEmergencyStopRequest,
): Promise<GuildSettingsRecord> {
  const {
    actor,
    grants,
    tenant,
    correlationId,
    action,
    reason,
    confirmationToken,
  } = request;

  const existing = await uow
    .getRepositories()
    .guildSettings.getSettings(tenant);

  // 1. Evaluate Action Policy
  const policyDecision = evaluateActionPolicy({
    actor,
    targetGuildId: tenant.guildId,
    capability: GuildCapability.GuildSettingsEdit,
    operation: {
      type:
        action === "stop"
          ? "guild.emergency_stop.set"
          : "guild.emergency_stop.lift",
      riskLevel: action === "stop" ? "critical" : "high",
      isDestructive: action === "stop",
    },
    grants,
    guildState: {
      isEmergencyStopped: existing?.isEmergencyStopped,
      emergencyStopReason: existing?.emergencyStopReason,
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
      policyDecision.message ?? "Action disallowed by action policy",
      policyDecision.details,
    );
  }

  // 2. Persist Emergency Stop in transaction with audit event
  return await uow.runInTransaction(async (repos) => {
    const isStop = action === "stop";
    const now = new Date();

    const updated = await repos.guildSettings.updateSettings(tenant, {
      isEmergencyStopped: isStop,
      emergencyStoppedAt: isStop ? now : null,
      emergencyStoppedByActorId: isStop ? actor.actorId : null,
      emergencyStopReason: isStop
        ? (reason ?? "Emergency stop triggered")
        : null,
    });

    await repos.auditEvents.record({
      eventId: `aud_em_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      realm: "guild",
      guildId: tenant.guildId as GuildId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      action: isStop ? "guild.emergency_stop.set" : "guild.emergency_stop.lift",
      resourceType: "guild_settings",
      resourceId: tenant.guildId,
      outcome: "success",
      reason:
        reason ?? (isStop ? "Manual emergency stop" : "Emergency stop lifted"),
      correlationId,
      occurredAt: now.toISOString(),
      details: {
        isEmergencyStopped: isStop,
        triggeredBy: actor.actorId,
      },
    });

    return updated;
  });
}
