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
import { GuildCapability, type GuildId } from "@nexus/contracts";
import { PolicyViolationError, UnauthorizedError } from "../errors.js";

export interface UpdateGuildSettingsRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  patch: Partial<Omit<GuildSettingsRecord, "guildId" | "updatedAt">>;
}

export async function updateGuildSettingsWorkflow(
  uow: IUnitOfWork,
  request: UpdateGuildSettingsRequest,
): Promise<GuildSettingsRecord> {
  const { actor, grants, tenant, correlationId, patch } = request;

  const existing = await uow
    .getRepositories()
    .guildSettings.getSettings(tenant);

  // 1. Authorize Capability & Check Action Policy
  const decision = evaluateActionPolicy({
    actor,
    targetGuildId: tenant.guildId,
    capability: GuildCapability.GuildSettingsEdit,
    operation: {
      type: "settings.update",
      riskLevel: "medium",
      isDestructive: false,
    },
    grants,
    guildState: {
      isEmergencyStopped: existing?.isEmergencyStopped,
      emergencyStopReason: existing?.emergencyStopReason,
    },
  });

  if (!decision.allowed) {
    if (decision.reasonCode === "DENIED_UNAUTHORIZED") {
      throw new UnauthorizedError(
        (decision.details?.authReason as string) ?? "DENIED_UNAUTHORIZED",
        {
          capability: GuildCapability.GuildSettingsEdit,
          guildId: tenant.guildId,
        },
      );
    }
    throw new PolicyViolationError(
      decision.reasonCode,
      decision.message ?? "Settings update denied by policy",
      decision.details,
    );
  }

  // 2. Execute Transactionally: Update settings and persist audit event
  return await uow.runInTransaction(async (repos) => {
    const updated = await repos.guildSettings.updateSettings(tenant, patch);

    await repos.auditEvents.record({
      eventId: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      realm: "guild",
      guildId: tenant.guildId as GuildId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      action: GuildCapability.GuildSettingsEdit,
      resourceType: "guild_settings",
      resourceId: tenant.guildId,
      outcome: "success",
      reason: "Guild settings updated",
      correlationId,
      occurredAt: new Date().toISOString(),
      details: { changedKeys: Object.keys(patch) },
    });

    return updated;
  });
}
