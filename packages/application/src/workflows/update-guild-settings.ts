import type {
  IUnitOfWork,
  GuildSettingsRecord,
  TenantContext,
} from "@nexus/database";
import {
  evaluateAuthorization,
  type ActorContext,
  type PermissionGrant,
} from "@nexus/authorization";
import { GuildCapability, type GuildId } from "@nexus/contracts";
import { UnauthorizedError } from "../errors.js";

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

  // 1. Authorize Capability
  const decision = evaluateAuthorization(
    {
      actor,
      capability: GuildCapability.GuildSettingsEdit,
      targetRealm: "guild",
      targetGuildId: tenant.guildId,
    },
    grants,
  );

  if (!decision.allowed) {
    throw new UnauthorizedError(decision.reasonCode, {
      capability: GuildCapability.GuildSettingsEdit,
      guildId: tenant.guildId,
    });
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
