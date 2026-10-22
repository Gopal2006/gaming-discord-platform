import type { IUnitOfWork, TicketRecord, TenantContext } from "@nexus/database";
import {
  evaluateAuthorization,
  type ActorContext,
  type PermissionGrant,
} from "@nexus/authorization";
import { GuildCapability } from "@nexus/contracts";
import { transitionTicket, type TicketAction } from "@nexus/domain";
import { UnauthorizedError, ResourceNotFoundError } from "../errors.js";

export interface TransitionTicketRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  ticketId: string;
  action: TicketAction;
}

export async function transitionTicketWorkflow(
  uow: IUnitOfWork,
  request: TransitionTicketRequest,
): Promise<TicketRecord> {
  const { actor, grants, tenant, correlationId, ticketId, action } = request;

  // 1. Authorize Capability
  const capability =
    action === "resolve" || action === "archive"
      ? GuildCapability.TicketClose
      : GuildCapability.TicketAssign;

  const decision = evaluateAuthorization(
    {
      actor,
      capability,
      targetRealm: "guild",
      targetGuildId: tenant.guildId,
    },
    grants,
  );

  if (!decision.allowed) {
    throw new UnauthorizedError(decision.reasonCode, {
      capability,
      guildId: tenant.guildId,
    });
  }

  // 2. Execute Transactionally
  return await uow.runInTransaction(async (repos) => {
    const existing = await repos.tickets.getById(tenant, ticketId);
    if (!existing) {
      throw new ResourceNotFoundError("Ticket", ticketId);
    }

    // 2a. Apply Pure Domain State Machine
    const nextStatus = transitionTicket(existing.status, action);

    // 2b. Update Persisted State
    const now = new Date();
    const closedAt =
      nextStatus === "resolved" || nextStatus === "archived" ? now : undefined;
    const updated = await repos.tickets.updateStatus(
      tenant,
      ticketId,
      nextStatus,
      { closedAt },
    );

    // 2c. Persist Outbox Event
    await repos.outbox.writeEvent({
      id: `evt_tkt_${updated.id}_${Date.now()}`,
      guildId: tenant.guildId,
      eventType: "ticket.status_changed",
      eventVersion: 1,
      aggregateType: "ticket",
      aggregateId: updated.id,
      payloadJson: {
        ticketId: updated.id,
        previousStatus: existing.status,
        newStatus: nextStatus,
        action,
        actorId: actor.actorId,
        correlationId,
      },
      availableAt: now,
    });

    return updated;
  });
}
