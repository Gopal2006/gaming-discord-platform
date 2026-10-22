import type {
  IUnitOfWork,
  GiveawayRecord,
  TenantContext,
} from "@nexus/database";
import {
  evaluateAuthorization,
  type ActorContext,
  type PermissionGrant,
} from "@nexus/authorization";
import { GuildCapability, type GuildId } from "@nexus/contracts";
import {
  UnauthorizedError,
  PolicyViolationError,
  ResourceNotFoundError,
} from "../errors.js";

export interface CreateGiveawayRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  channelId: string;
  prize: string;
  winnerCount?: number;
  durationMinutes: number;
}

export interface EnterGiveawayRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  giveawayId: string;
}

export interface EndGiveawayRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  giveawayId: string;
}

export interface RerollGiveawayRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  giveawayId: string;
}

export async function createGiveawayWorkflow(
  uow: IUnitOfWork,
  request: CreateGiveawayRequest,
): Promise<GiveawayRecord> {
  const {
    actor,
    grants,
    tenant,
    correlationId,
    channelId,
    prize,
    winnerCount = 1,
    durationMinutes,
  } = request;

  const decision = evaluateAuthorization(
    {
      actor,
      capability: GuildCapability.GiveawayCreate,
      targetRealm: "guild",
      targetGuildId: tenant.guildId,
    },
    grants,
  );

  if (!decision.allowed) {
    throw new UnauthorizedError(decision.reasonCode, {
      capability: GuildCapability.GiveawayCreate,
      guildId: tenant.guildId,
    });
  }

  if (winnerCount < 1 || winnerCount > 20) {
    throw new PolicyViolationError(
      "INVALID_WINNER_COUNT",
      "Winner count must be between 1 and 20.",
    );
  }

  return await uow.runInTransaction(async (repos) => {
    const giveawayId = `gw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const giveaway = await repos.giveaways.create(tenant, {
      id: giveawayId,
      channelId,
      messageId: null,
      prize,
      winnerCount,
      status: "active",
      endsAt,
    });

    await repos.auditEvents.record({
      eventId: `aud_gw_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      realm: "guild",
      guildId: tenant.guildId as GuildId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      action: GuildCapability.GiveawayCreate,
      resourceType: "giveaway",
      resourceId: giveaway.id,
      outcome: "success",
      correlationId,
      details: { prize: giveaway.prize, winnerCount: giveaway.winnerCount },
      occurredAt: new Date().toISOString(),
    });

    return giveaway;
  });
}

export async function enterGiveawayWorkflow(
  uow: IUnitOfWork,
  request: EnterGiveawayRequest,
): Promise<{ success: boolean; giveawayId: string }> {
  const { actor, grants, tenant, giveawayId } = request;

  const decision = evaluateAuthorization(
    {
      actor,
      capability: GuildCapability.GiveawayEnter,
      targetRealm: "guild",
      targetGuildId: tenant.guildId,
    },
    grants,
  );

  if (!decision.allowed) {
    throw new UnauthorizedError(decision.reasonCode, {
      capability: GuildCapability.GiveawayEnter,
      guildId: tenant.guildId,
    });
  }

  const giveaway = await uow
    .getRepositories()
    .giveaways.getById(tenant, giveawayId);
  if (!giveaway) {
    throw new ResourceNotFoundError("Giveaway", giveawayId);
  }

  if (giveaway.status !== "active") {
    throw new PolicyViolationError(
      "GIVEAWAY_ENDED",
      "This giveaway has already ended.",
    );
  }

  const entered = await uow
    .getRepositories()
    .giveaways.recordEntry(tenant, giveawayId, actor.actorId);

  if (!entered) {
    throw new PolicyViolationError(
      "DUPLICATE_ENTRY",
      "You have already entered this giveaway.",
    );
  }

  return { success: true, giveawayId };
}

export async function endGiveawayWorkflow(
  uow: IUnitOfWork,
  request: EndGiveawayRequest,
): Promise<{ giveaway: GiveawayRecord; winners: readonly string[] }> {
  const { actor, grants, tenant, correlationId, giveawayId } = request;

  const decision = evaluateAuthorization(
    {
      actor,
      capability: GuildCapability.GiveawayEnd,
      targetRealm: "guild",
      targetGuildId: tenant.guildId,
    },
    grants,
  );

  if (!decision.allowed) {
    throw new UnauthorizedError(decision.reasonCode, {
      capability: GuildCapability.GiveawayEnd,
      guildId: tenant.guildId,
    });
  }

  return await uow.runInTransaction(async (repos) => {
    const existing = await repos.giveaways.getById(tenant, giveawayId);
    if (!existing) {
      throw new ResourceNotFoundError("Giveaway", giveawayId);
    }

    const entries = await repos.giveaways.getEntries(tenant, giveawayId);
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, existing.winnerCount);

    const ended = await repos.giveaways.end(tenant, giveawayId, winners);

    await repos.auditEvents.record({
      eventId: `aud_gw_end_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      realm: "guild",
      guildId: tenant.guildId as GuildId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      action: GuildCapability.GiveawayEnd,
      resourceType: "giveaway",
      resourceId: ended.id,
      outcome: "success",
      correlationId,
      details: { prize: ended.prize, totalEntries: entries.length, winners },
      occurredAt: new Date().toISOString(),
    });

    return { giveaway: ended, winners };
  });
}

export async function rerollGiveawayWorkflow(
  uow: IUnitOfWork,
  request: RerollGiveawayRequest,
): Promise<{ giveaway: GiveawayRecord; newWinners: readonly string[] }> {
  const { actor, grants, tenant, correlationId, giveawayId } = request;

  const decision = evaluateAuthorization(
    {
      actor,
      capability: GuildCapability.GiveawayReroll,
      targetRealm: "guild",
      targetGuildId: tenant.guildId,
    },
    grants,
  );

  if (!decision.allowed) {
    throw new UnauthorizedError(decision.reasonCode, {
      capability: GuildCapability.GiveawayReroll,
      guildId: tenant.guildId,
    });
  }

  return await uow.runInTransaction(async (repos) => {
    const existing = await repos.giveaways.getById(tenant, giveawayId);
    if (!existing) {
      throw new ResourceNotFoundError("Giveaway", giveawayId);
    }

    const entries = await repos.giveaways.getEntries(tenant, giveawayId);
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    const newWinners = shuffled.slice(0, existing.winnerCount);

    const updated = await repos.giveaways.end(tenant, giveawayId, newWinners);

    await repos.auditEvents.record({
      eventId: `aud_gw_reroll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      realm: "guild",
      guildId: tenant.guildId as GuildId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      action: GuildCapability.GiveawayReroll,
      resourceType: "giveaway",
      resourceId: updated.id,
      outcome: "success",
      correlationId,
      details: { prize: updated.prize, newWinners },
      occurredAt: new Date().toISOString(),
    });

    return { giveaway: updated, newWinners };
  });
}
