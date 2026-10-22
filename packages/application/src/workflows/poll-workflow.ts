import type { IUnitOfWork, PollRecord, TenantContext } from "@nexus/database";
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

export interface CreatePollRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  channelId: string;
  question: string;
  options: readonly string[];
  durationMinutes?: number;
}

export interface VotePollRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  pollId: string;
  optionIndex: number;
}

export interface ClosePollRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  pollId: string;
}

export async function createPollWorkflow(
  uow: IUnitOfWork,
  request: CreatePollRequest,
): Promise<PollRecord> {
  const {
    actor,
    grants,
    tenant,
    correlationId,
    channelId,
    question,
    options,
    durationMinutes,
  } = request;

  const decision = evaluateAuthorization(
    {
      actor,
      capability: GuildCapability.PollCreate,
      targetRealm: "guild",
      targetGuildId: tenant.guildId,
    },
    grants,
  );

  if (!decision.allowed) {
    throw new UnauthorizedError(decision.reasonCode, {
      capability: GuildCapability.PollCreate,
      guildId: tenant.guildId,
    });
  }

  if (options.length < 2 || options.length > 10) {
    throw new PolicyViolationError(
      "INVALID_POLL_OPTIONS",
      "Polls must have between 2 and 10 options.",
      { optionCount: options.length },
    );
  }

  return await uow.runInTransaction(async (repos) => {
    const pollId = `poll_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const closesAt = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60 * 1000)
      : null;

    const poll = await repos.polls.create(tenant, {
      id: pollId,
      channelId,
      messageId: null,
      question,
      options,
      status: "active",
      closesAt,
    });

    await repos.auditEvents.record({
      eventId: `aud_poll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      realm: "guild",
      guildId: tenant.guildId as GuildId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      action: GuildCapability.PollCreate,
      resourceType: "poll",
      resourceId: poll.id,
      outcome: "success",
      correlationId,
      details: { question: poll.question, optionsCount: poll.options.length },
      occurredAt: new Date().toISOString(),
    });

    await repos.outbox.writeEvent({
      id: `evt_poll_created_${poll.id}`,
      guildId: tenant.guildId,
      eventType: "poll.created",
      eventVersion: 1,
      aggregateType: "poll",
      aggregateId: poll.id,
      payloadJson: {
        pollId: poll.id,
        question: poll.question,
        options: poll.options,
      },
      availableAt: new Date(),
    });

    return poll;
  });
}

export async function votePollWorkflow(
  uow: IUnitOfWork,
  request: VotePollRequest,
): Promise<{ success: boolean; pollId: string; optionIndex: number }> {
  const { actor, grants, tenant, pollId, optionIndex } = request;

  const decision = evaluateAuthorization(
    {
      actor,
      capability: GuildCapability.PollVote,
      targetRealm: "guild",
      targetGuildId: tenant.guildId,
    },
    grants,
  );

  if (!decision.allowed) {
    throw new UnauthorizedError(decision.reasonCode, {
      capability: GuildCapability.PollVote,
      guildId: tenant.guildId,
    });
  }

  const poll = await uow.getRepositories().polls.getById(tenant, pollId);
  if (!poll) {
    throw new ResourceNotFoundError("Poll", pollId);
  }

  if (poll.status !== "active") {
    throw new PolicyViolationError(
      "POLL_CLOSED",
      "This poll is no longer active.",
    );
  }

  const recorded = await uow
    .getRepositories()
    .polls.recordVote(tenant, pollId, actor.actorId, optionIndex);

  if (!recorded) {
    throw new PolicyViolationError(
      "DUPLICATE_VOTE",
      "You have already voted on this poll or the selected option is invalid.",
    );
  }

  return { success: true, pollId, optionIndex };
}

export async function closePollWorkflow(
  uow: IUnitOfWork,
  request: ClosePollRequest,
): Promise<{ poll: PollRecord; tally: Record<number, number> }> {
  const { actor, grants, tenant, correlationId, pollId } = request;

  const decision = evaluateAuthorization(
    {
      actor,
      capability: GuildCapability.PollClose,
      targetRealm: "guild",
      targetGuildId: tenant.guildId,
    },
    grants,
  );

  if (!decision.allowed) {
    throw new UnauthorizedError(decision.reasonCode, {
      capability: GuildCapability.PollClose,
      guildId: tenant.guildId,
    });
  }

  return await uow.runInTransaction(async (repos) => {
    const closed = await repos.polls.close(tenant, pollId);
    const tally = await repos.polls.getVotes(tenant, pollId);

    await repos.auditEvents.record({
      eventId: `aud_poll_close_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      realm: "guild",
      guildId: tenant.guildId as GuildId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      action: GuildCapability.PollClose,
      resourceType: "poll",
      resourceId: closed.id,
      outcome: "success",
      correlationId,
      details: { tally },
      occurredAt: new Date().toISOString(),
    });

    return { poll: closed, tally };
  });
}
