import type {
  IUnitOfWork,
  AnnouncementRecord,
  TenantContext,
} from "@nexus/database";
import {
  evaluateAuthorization,
  type ActorContext,
  type PermissionGrant,
} from "@nexus/authorization";
import { GuildCapability } from "@nexus/contracts";
import { sanitizeMentions } from "@nexus/domain";
import { UnauthorizedError } from "../errors.js";

export interface CreateAnnouncementRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  data: {
    id: string;
    channelId: string;
    title: string;
    content: string;
    scheduledFor?: Date | null;
    allowEveryone?: boolean;
    allowHere?: boolean;
  };
}

export async function createAnnouncementWorkflow(
  uow: IUnitOfWork,
  request: CreateAnnouncementRequest,
): Promise<AnnouncementRecord> {
  const { actor, grants, tenant, correlationId, data } = request;

  // 1. Authorize Capability
  const decision = evaluateAuthorization(
    {
      actor,
      capability: GuildCapability.AnnouncementCreate,
      targetRealm: "guild",
      targetGuildId: tenant.guildId,
    },
    grants,
  );

  if (!decision.allowed) {
    throw new UnauthorizedError(decision.reasonCode, {
      capability: GuildCapability.AnnouncementCreate,
      guildId: tenant.guildId,
    });
  }

  // 2. Apply Domain Invariant: Sanitize Mentions
  const sanitizedContent = sanitizeMentions(data.content, {
    allowEveryone: data.allowEveryone ?? false,
    allowHere: data.allowHere ?? false,
    allowRoles: true,
  });

  // 3. Execute Transactionally: Write Announcement & Outbox Event
  return await uow.runInTransaction(async (repos) => {
    const created = await repos.announcements.create(tenant, {
      id: data.id,
      channelId: data.channelId,
      title: data.title,
      content: sanitizedContent,
      status: "draft",
      scheduledFor: data.scheduledFor ?? null,
      publishedAt: null,
      discordMessageId: null,
      authorUserId: actor.actorId,
    });

    await repos.outbox.writeEvent({
      id: `evt_ann_${created.id}_${Date.now()}`,
      guildId: tenant.guildId,
      eventType: "announcement.created",
      eventVersion: 1,
      aggregateType: "announcement",
      aggregateId: created.id,
      payloadJson: {
        announcementId: created.id,
        channelId: created.channelId,
        title: created.title,
        scheduledFor: created.scheduledFor?.toISOString() ?? null,
        authorId: actor.actorId,
        correlationId,
      },
      availableAt: new Date(),
    });

    return created;
  });
}
