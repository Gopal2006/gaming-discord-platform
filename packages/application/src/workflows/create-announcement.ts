import type {
  IUnitOfWork,
  AnnouncementRecord,
  TenantContext,
} from "@nexus/database";
import {
  evaluateActionPolicy,
  type ActorContext,
  type PermissionGrant,
} from "@nexus/authorization";
import { GuildCapability } from "@nexus/contracts";
import { sanitizeMentions } from "@nexus/domain";
import { PolicyViolationError, UnauthorizedError } from "../errors.js";

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

  const existingSettings = await uow
    .getRepositories()
    .guildSettings.getSettings(tenant);

  // 1. Authorize Capability & Check Action Policy
  const decision = evaluateActionPolicy({
    actor,
    targetGuildId: tenant.guildId,
    capability: GuildCapability.AnnouncementCreate,
    operation: {
      type: "announcement.create",
      riskLevel: data.allowEveryone || data.allowHere ? "medium" : "low",
      isDestructive: false,
      mentions: {
        everyone: data.allowEveryone ?? false,
        here: data.allowHere ?? false,
        roles: [],
      },
    },
    grants,
    guildState: {
      isEmergencyStopped: existingSettings?.isEmergencyStopped,
      emergencyStopReason: existingSettings?.emergencyStopReason,
    },
  });

  if (!decision.allowed) {
    if (decision.reasonCode === "DENIED_UNAUTHORIZED") {
      throw new UnauthorizedError(
        (decision.details?.authReason as string) ?? "DENIED_UNAUTHORIZED",
        {
          capability: GuildCapability.AnnouncementCreate,
          guildId: tenant.guildId,
        },
      );
    }
    throw new PolicyViolationError(
      decision.reasonCode,
      decision.message ?? "Announcement creation denied by policy",
      decision.details,
    );
  }

  // 2. Apply Domain Invariant: Sanitize Mentions
  const sanitizedContent = sanitizeMentions(data.content, {
    allowEveryone: data.allowEveryone ?? false,
    allowHere: data.allowHere ?? false,
    allowRoles: true,
  });

  // 3. Persist Transactionally
  return await uow.runInTransaction(async (repos) => {
    const announcement = await repos.announcements.create(tenant, {
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

    // Write Outbox Event
    await repos.outbox.writeEvent({
      id: `evt_ann_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      guildId: tenant.guildId,
      eventType: "announcement.created",
      eventVersion: 1,
      aggregateType: "announcement",
      aggregateId: announcement.id,
      payloadJson: {
        announcementId: announcement.id,
        channelId: announcement.channelId,
        title: announcement.title,
        status: announcement.status,
        correlationId,
      },
      availableAt: new Date(),
    });

    return announcement;
  });
}
