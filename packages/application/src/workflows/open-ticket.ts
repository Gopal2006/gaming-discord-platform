import type { IUnitOfWork, TicketRecord, TenantContext } from "@nexus/database";
import {
  evaluateAuthorization,
  type ActorContext,
  type PermissionGrant,
} from "@nexus/authorization";
import { GuildCapability, type GuildId } from "@nexus/contracts";
import { UnauthorizedError, PolicyViolationError } from "../errors.js";

export interface OpenTicketRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  category?: string;
  channelId?: string;
  maxActiveTicketsPerUser?: number;
}

export async function openTicketWorkflow(
  uow: IUnitOfWork,
  request: OpenTicketRequest,
): Promise<TicketRecord> {
  const {
    actor,
    grants,
    tenant,
    correlationId,
    category = "general",
    channelId,
    maxActiveTicketsPerUser = 2,
  } = request;

  // 1. Authorize Capability
  const decision = evaluateAuthorization(
    {
      actor,
      capability: GuildCapability.TicketCreate,
      targetRealm: "guild",
      targetGuildId: tenant.guildId,
    },
    grants,
  );

  if (!decision.allowed) {
    throw new UnauthorizedError(decision.reasonCode, {
      capability: GuildCapability.TicketCreate,
      guildId: tenant.guildId,
    });
  }

  // 2. Check Active Ticket Limits per Requester
  const openCount = await uow
    .getRepositories()
    .tickets.countOpenByRequester(tenant, actor.actorId);

  if (openCount >= maxActiveTicketsPerUser) {
    throw new PolicyViolationError(
      "TICKET_LIMIT_EXCEEDED",
      `You already have ${openCount} active ticket(s). Please resolve existing tickets before opening a new one.`,
      {
        requesterId: actor.actorId,
        openCount,
        maxAllowed: maxActiveTicketsPerUser,
      },
    );
  }

  // 3. Persist Ticket, Audit Event, and Outbox Event
  return await uow.runInTransaction(async (repos) => {
    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ticketNumber = Math.floor(Math.random() * 9000) + 1000;

    const created = await repos.tickets.create(tenant, {
      id: ticketId,
      ticketNumber,
      requesterId: actor.actorId,
      assignedUserId: null,
      channelId: channelId ?? null,
      category,
      status: "open",
      closedAt: null,
      retentionDeadline: null,
    });

    await repos.auditEvents.record({
      eventId: `aud_tkt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      realm: "guild",
      guildId: tenant.guildId as GuildId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      action: GuildCapability.TicketCreate,
      resourceType: "ticket",
      resourceId: created.id,
      outcome: "success",
      correlationId,
      details: {
        ticketNumber: created.ticketNumber,
        category: created.category,
      },
      occurredAt: new Date().toISOString(),
    });

    await repos.outbox.writeEvent({
      id: `evt_tkt_created_${created.id}`,
      guildId: tenant.guildId,
      eventType: "ticket.created",
      eventVersion: 1,
      aggregateType: "ticket",
      aggregateId: created.id,
      payloadJson: {
        ticketId: created.id,
        ticketNumber: created.ticketNumber,
        requesterId: created.requesterId,
        category: created.category,
      },
      availableAt: new Date(),
    });

    return created;
  });
}
