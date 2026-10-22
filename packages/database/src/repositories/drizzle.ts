import { eq, and, desc, count, lte, or, isNull } from "drizzle-orm";
import type { DatabaseClient } from "../client.js";
import { assertTenantBoundary, type TenantContext } from "../tenant.js";
import * as schema from "../schema/index.js";
import type {
  IGuildSettingsRepository,
  GuildSettingsRecord,
  IAnnouncementRepository,
  AnnouncementRecord,
  IRegistrationRepository,
  RegistrationRecord,
  ITournamentRepository,
  TournamentRecord,
  ITicketRepository,
  TicketRecord,
  IModerationCaseRepository,
  ModerationCaseRecord,
  IAuditEventRepository,
  IOutboxRepository,
  OutboxEventRecord,
} from "./interfaces.js";
import type {
  AnnouncementState,
  TicketState,
  ModerationCaseState,
  RegistrationState,
  TournamentState,
} from "@nexus/domain";
import type { AuditEvent } from "@nexus/contracts";

export class DrizzleGuildSettingsRepository implements IGuildSettingsRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getSettings(
    tenant: TenantContext,
  ): Promise<GuildSettingsRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.guildSettings)
      .where(eq(schema.guildSettings.guildId, tenant.guildId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      guildId: row.guildId,
      logChannelId: row.logChannelId,
      modLogChannelId: row.modLogChannelId,
      welcomeChannelId: row.welcomeChannelId,
      welcomeMessageTemplate: row.welcomeMessageTemplate,
      leaveChannelId: row.leaveChannelId,
      leaveMessageTemplate: row.leaveMessageTemplate,
      isEmergencyStopped: row.isEmergencyStopped ?? false,
      emergencyStoppedAt: row.emergencyStoppedAt,
      emergencyStoppedByActorId: row.emergencyStoppedByActorId,
      emergencyStopReason: row.emergencyStopReason,
      schemaVersion: row.schemaVersion,
      updatedAt: row.updatedAt,
    };
  }

  async updateSettings(
    tenant: TenantContext,
    patch: Partial<Omit<GuildSettingsRecord, "guildId" | "updatedAt">>,
  ): Promise<GuildSettingsRecord> {
    const existing = await this.getSettings(tenant);
    const now = new Date();

    if (!existing) {
      const inserted = await this.db
        .insert(schema.guildSettings)
        .values({
          guildId: tenant.guildId,
          ...patch,
          updatedAt: now,
        })
        .returning();

      const row = inserted[0]!;
      return {
        guildId: row.guildId,
        logChannelId: row.logChannelId,
        modLogChannelId: row.modLogChannelId,
        welcomeChannelId: row.welcomeChannelId,
        welcomeMessageTemplate: row.welcomeMessageTemplate,
        leaveChannelId: row.leaveChannelId,
        leaveMessageTemplate: row.leaveMessageTemplate,
        isEmergencyStopped: row.isEmergencyStopped ?? false,
        emergencyStoppedAt: row.emergencyStoppedAt,
        emergencyStoppedByActorId: row.emergencyStoppedByActorId,
        emergencyStopReason: row.emergencyStopReason,
        schemaVersion: row.schemaVersion,
        updatedAt: row.updatedAt,
      };
    }

    const updated = await this.db
      .update(schema.guildSettings)
      .set({
        ...patch,
        updatedAt: now,
      })
      .where(eq(schema.guildSettings.guildId, tenant.guildId))
      .returning();

    const row = updated[0]!;
    return {
      guildId: row.guildId,
      logChannelId: row.logChannelId,
      modLogChannelId: row.modLogChannelId,
      welcomeChannelId: row.welcomeChannelId,
      welcomeMessageTemplate: row.welcomeMessageTemplate,
      leaveChannelId: row.leaveChannelId,
      leaveMessageTemplate: row.leaveMessageTemplate,
      isEmergencyStopped: row.isEmergencyStopped ?? false,
      emergencyStoppedAt: row.emergencyStoppedAt,
      emergencyStoppedByActorId: row.emergencyStoppedByActorId,
      emergencyStopReason: row.emergencyStopReason,
      schemaVersion: row.schemaVersion,
      updatedAt: row.updatedAt,
    };
  }
}

export class DrizzleAnnouncementRepository implements IAnnouncementRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getById(
    tenant: TenantContext,
    id: string,
  ): Promise<AnnouncementRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.announcements)
      .where(
        and(
          eq(schema.announcements.id, id),
          eq(schema.announcements.guildId, tenant.guildId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    assertTenantBoundary(tenant, row.guildId);

    return {
      id: row.id,
      guildId: row.guildId,
      channelId: row.channelId,
      title: row.title,
      content: row.content,
      status: row.status as AnnouncementState,
      scheduledFor: row.scheduledFor,
      publishedAt: row.publishedAt,
      discordMessageId: row.discordMessageId,
      authorUserId: row.authorUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async list(
    tenant: TenantContext,
    status?: AnnouncementState,
  ): Promise<readonly AnnouncementRecord[]> {
    const conditions = [eq(schema.announcements.guildId, tenant.guildId)];
    if (status) {
      conditions.push(eq(schema.announcements.status, status));
    }

    const rows = await this.db
      .select()
      .from(schema.announcements)
      .where(and(...conditions))
      .orderBy(desc(schema.announcements.createdAt));

    return rows.map((row) => ({
      id: row.id,
      guildId: row.guildId,
      channelId: row.channelId,
      title: row.title,
      content: row.content,
      status: row.status as AnnouncementState,
      scheduledFor: row.scheduledFor,
      publishedAt: row.publishedAt,
      discordMessageId: row.discordMessageId,
      authorUserId: row.authorUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async create(
    tenant: TenantContext,
    record: Omit<AnnouncementRecord, "guildId" | "createdAt" | "updatedAt">,
  ): Promise<AnnouncementRecord> {
    const inserted = await this.db
      .insert(schema.announcements)
      .values({
        id: record.id,
        guildId: tenant.guildId,
        channelId: record.channelId,
        title: record.title,
        content: record.content,
        status: record.status,
        scheduledFor: record.scheduledFor,
        publishedAt: record.publishedAt,
        discordMessageId: record.discordMessageId,
        authorUserId: record.authorUserId,
      })
      .returning();

    const row = inserted[0]!;
    return {
      id: row.id,
      guildId: row.guildId,
      channelId: row.channelId,
      title: row.title,
      content: row.content,
      status: row.status as AnnouncementState,
      scheduledFor: row.scheduledFor,
      publishedAt: row.publishedAt,
      discordMessageId: row.discordMessageId,
      authorUserId: row.authorUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    status: AnnouncementState,
    extra?: { publishedAt?: Date; discordMessageId?: string },
  ): Promise<AnnouncementRecord> {
    const updated = await this.db
      .update(schema.announcements)
      .set({
        status,
        publishedAt: extra?.publishedAt,
        discordMessageId: extra?.discordMessageId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.announcements.id, id),
          eq(schema.announcements.guildId, tenant.guildId),
        ),
      )
      .returning();

    const row = updated[0];
    if (!row) {
      throw new Error(
        `Announcement ${id} not found in tenant ${tenant.guildId}`,
      );
    }

    return {
      id: row.id,
      guildId: row.guildId,
      channelId: row.channelId,
      title: row.title,
      content: row.content,
      status: row.status as AnnouncementState,
      scheduledFor: row.scheduledFor,
      publishedAt: row.publishedAt,
      discordMessageId: row.discordMessageId,
      authorUserId: row.authorUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export class DrizzleRegistrationRepository implements IRegistrationRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getById(
    tenant: TenantContext,
    id: string,
  ): Promise<RegistrationRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.id, id),
          eq(schema.registrations.guildId, tenant.guildId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    assertTenantBoundary(tenant, row.guildId);

    return {
      id: row.id,
      tournamentId: row.tournamentId,
      guildId: row.guildId,
      entrantId: row.entrantId,
      entrantType: row.entrantType as "user" | "team",
      status: row.status as RegistrationState,
      answersJson: row.answersJson as Record<string, unknown> | null,
      formVersion: row.formVersion,
      checkedInAt: row.checkedInAt,
      createdAt: row.createdAt,
    };
  }

  async countAccepted(
    tenant: TenantContext,
    tournamentId: string,
  ): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.guildId, tenant.guildId),
          eq(schema.registrations.tournamentId, tournamentId),
          eq(schema.registrations.status, "accepted"),
        ),
      );

    return result[0]?.count ?? 0;
  }

  async create(
    tenant: TenantContext,
    record: Omit<RegistrationRecord, "guildId" | "createdAt">,
  ): Promise<RegistrationRecord> {
    const inserted = await this.db
      .insert(schema.registrations)
      .values({
        id: record.id,
        tournamentId: record.tournamentId,
        guildId: tenant.guildId,
        entrantId: record.entrantId,
        entrantType: record.entrantType,
        status: record.status,
        answersJson: record.answersJson,
        formVersion: record.formVersion,
        checkedInAt: record.checkedInAt,
      })
      .returning();

    const row = inserted[0]!;
    return {
      id: row.id,
      tournamentId: row.tournamentId,
      guildId: row.guildId,
      entrantId: row.entrantId,
      entrantType: row.entrantType as "user" | "team",
      status: row.status as RegistrationState,
      answersJson: row.answersJson as Record<string, unknown> | null,
      formVersion: row.formVersion,
      checkedInAt: row.checkedInAt,
      createdAt: row.createdAt,
    };
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    status: RegistrationState,
    extra?: { checkedInAt?: Date },
  ): Promise<RegistrationRecord> {
    const updated = await this.db
      .update(schema.registrations)
      .set({
        status,
        checkedInAt: extra?.checkedInAt,
      })
      .where(
        and(
          eq(schema.registrations.id, id),
          eq(schema.registrations.guildId, tenant.guildId),
        ),
      )
      .returning();

    const row = updated[0];
    if (!row) {
      throw new Error(
        `Registration ${id} not found in tenant ${tenant.guildId}`,
      );
    }

    return {
      id: row.id,
      tournamentId: row.tournamentId,
      guildId: row.guildId,
      entrantId: row.entrantId,
      entrantType: row.entrantType as "user" | "team",
      status: row.status as RegistrationState,
      answersJson: row.answersJson as Record<string, unknown> | null,
      formVersion: row.formVersion,
      checkedInAt: row.checkedInAt,
      createdAt: row.createdAt,
    };
  }
}

export class DrizzleTournamentRepository implements ITournamentRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getById(
    tenant: TenantContext,
    id: string,
  ): Promise<TournamentRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.tournaments)
      .where(
        and(
          eq(schema.tournaments.id, id),
          eq(schema.tournaments.guildId, tenant.guildId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    assertTenantBoundary(tenant, row.guildId);

    return {
      id: row.id,
      guildId: row.guildId,
      gameProfileId: row.gameProfileId,
      title: row.title,
      format: row.format,
      status: row.status as TournamentState,
      maxEntrants: row.maxEntrants,
      checkInDurationMinutes: row.checkInDurationMinutes,
      startsAt: row.startsAt,
      createdAt: row.createdAt,
    };
  }

  async create(
    tenant: TenantContext,
    record: Omit<TournamentRecord, "guildId" | "createdAt">,
  ): Promise<TournamentRecord> {
    const inserted = await this.db
      .insert(schema.tournaments)
      .values({
        id: record.id,
        guildId: tenant.guildId,
        gameProfileId: record.gameProfileId,
        title: record.title,
        format: record.format,
        status: record.status,
        maxEntrants: record.maxEntrants,
        checkInDurationMinutes: record.checkInDurationMinutes,
        startsAt: record.startsAt,
      })
      .returning();

    const row = inserted[0]!;
    return {
      id: row.id,
      guildId: row.guildId,
      gameProfileId: row.gameProfileId,
      title: row.title,
      format: row.format,
      status: row.status as TournamentState,
      maxEntrants: row.maxEntrants,
      checkInDurationMinutes: row.checkInDurationMinutes,
      startsAt: row.startsAt,
      createdAt: row.createdAt,
    };
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    status: TournamentState,
  ): Promise<TournamentRecord> {
    const updated = await this.db
      .update(schema.tournaments)
      .set({ status })
      .where(
        and(
          eq(schema.tournaments.id, id),
          eq(schema.tournaments.guildId, tenant.guildId),
        ),
      )
      .returning();

    const row = updated[0];
    if (!row)
      throw new Error(`Tournament ${id} not found in tenant ${tenant.guildId}`);

    return {
      id: row.id,
      guildId: row.guildId,
      gameProfileId: row.gameProfileId,
      title: row.title,
      format: row.format,
      status: row.status as TournamentState,
      maxEntrants: row.maxEntrants,
      checkInDurationMinutes: row.checkInDurationMinutes,
      startsAt: row.startsAt,
      createdAt: row.createdAt,
    };
  }
}

export class DrizzleTicketRepository implements ITicketRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getById(
    tenant: TenantContext,
    id: string,
  ): Promise<TicketRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.tickets)
      .where(
        and(
          eq(schema.tickets.id, id),
          eq(schema.tickets.guildId, tenant.guildId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    assertTenantBoundary(tenant, row.guildId);

    return {
      id: row.id,
      guildId: row.guildId,
      ticketNumber: row.ticketNumber,
      requesterId: row.requesterId,
      assignedUserId: row.assignedUserId,
      channelId: row.channelId,
      category: row.category,
      status: row.status as TicketState,
      closedAt: row.closedAt,
      retentionDeadline: row.retentionDeadline,
      createdAt: row.createdAt,
    };
  }

  async create(
    tenant: TenantContext,
    record: Omit<TicketRecord, "guildId" | "createdAt">,
  ): Promise<TicketRecord> {
    const inserted = await this.db
      .insert(schema.tickets)
      .values({
        id: record.id,
        guildId: tenant.guildId,
        ticketNumber: record.ticketNumber,
        requesterId: record.requesterId,
        assignedUserId: record.assignedUserId,
        channelId: record.channelId,
        category: record.category,
        status: record.status,
        closedAt: record.closedAt,
        retentionDeadline: record.retentionDeadline,
      })
      .returning();

    const row = inserted[0]!;
    return {
      id: row.id,
      guildId: row.guildId,
      ticketNumber: row.ticketNumber,
      requesterId: row.requesterId,
      assignedUserId: row.assignedUserId,
      channelId: row.channelId,
      category: row.category,
      status: row.status as TicketState,
      closedAt: row.closedAt,
      retentionDeadline: row.retentionDeadline,
      createdAt: row.createdAt,
    };
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    status: TicketState,
    extra?: { closedAt?: Date; retentionDeadline?: Date },
  ): Promise<TicketRecord> {
    const updated = await this.db
      .update(schema.tickets)
      .set({
        status,
        closedAt: extra?.closedAt,
        retentionDeadline: extra?.retentionDeadline,
      })
      .where(
        and(
          eq(schema.tickets.id, id),
          eq(schema.tickets.guildId, tenant.guildId),
        ),
      )
      .returning();

    const row = updated[0];
    if (!row)
      throw new Error(`Ticket ${id} not found in tenant ${tenant.guildId}`);

    return {
      id: row.id,
      guildId: row.guildId,
      ticketNumber: row.ticketNumber,
      requesterId: row.requesterId,
      assignedUserId: row.assignedUserId,
      channelId: row.channelId,
      category: row.category,
      status: row.status as TicketState,
      closedAt: row.closedAt,
      retentionDeadline: row.retentionDeadline,
      createdAt: row.createdAt,
    };
  }
}

export class DrizzleModerationCaseRepository implements IModerationCaseRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getById(
    tenant: TenantContext,
    id: string,
  ): Promise<ModerationCaseRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.moderationCases)
      .where(
        and(
          eq(schema.moderationCases.id, id),
          eq(schema.moderationCases.guildId, tenant.guildId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    assertTenantBoundary(tenant, row.guildId);

    return {
      id: row.id,
      guildId: row.guildId,
      caseNumber: row.caseNumber,
      targetUserId: row.targetUserId,
      moderatorId: row.moderatorId,
      action: row.action,
      reason: row.reason,
      status: row.status as ModerationCaseState,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }

  async create(
    tenant: TenantContext,
    record: Omit<ModerationCaseRecord, "guildId" | "createdAt">,
  ): Promise<ModerationCaseRecord> {
    const inserted = await this.db
      .insert(schema.moderationCases)
      .values({
        id: record.id,
        guildId: tenant.guildId,
        caseNumber: record.caseNumber,
        targetUserId: record.targetUserId,
        moderatorId: record.moderatorId,
        action: record.action,
        reason: record.reason,
        status: record.status,
        expiresAt: record.expiresAt,
      })
      .returning();

    const row = inserted[0]!;
    return {
      id: row.id,
      guildId: row.guildId,
      caseNumber: row.caseNumber,
      targetUserId: row.targetUserId,
      moderatorId: row.moderatorId,
      action: row.action,
      reason: row.reason,
      status: row.status as ModerationCaseState,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    status: ModerationCaseState,
  ): Promise<ModerationCaseRecord> {
    const updated = await this.db
      .update(schema.moderationCases)
      .set({ status })
      .where(
        and(
          eq(schema.moderationCases.id, id),
          eq(schema.moderationCases.guildId, tenant.guildId),
        ),
      )
      .returning();

    const row = updated[0];
    if (!row)
      throw new Error(
        `Moderation case ${id} not found in tenant ${tenant.guildId}`,
      );

    return {
      id: row.id,
      guildId: row.guildId,
      caseNumber: row.caseNumber,
      targetUserId: row.targetUserId,
      moderatorId: row.moderatorId,
      action: row.action,
      reason: row.reason,
      status: row.status as ModerationCaseState,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }
}

export class DrizzleAuditEventRepository implements IAuditEventRepository {
  constructor(private readonly db: DatabaseClient) {}

  async record(event: AuditEvent): Promise<void> {
    await this.db.insert(schema.auditEvents).values({
      id: event.eventId,
      realm: event.realm,
      guildId: event.guildId,
      actorId: event.actorId,
      actorType: event.actorType,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      outcome: event.outcome,
      reason: event.reason,
      correlationId: event.correlationId,
      detailsJson: event.details,
      createdAt: new Date(event.occurredAt),
    });
  }

  async list(
    tenant: TenantContext,
    limit = 50,
  ): Promise<readonly AuditEvent[]> {
    const rows = await this.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.guildId, tenant.guildId))
      .orderBy(desc(schema.auditEvents.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      eventId: row.id,
      realm: row.realm as "guild" | "platform",
      guildId: (row.guildId ?? null) as AuditEvent["guildId"],
      actorId: row.actorId,
      actorType: row.actorType as AuditEvent["actorType"],
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      outcome: row.outcome as "success" | "denied" | "failed",
      reason: row.reason,
      correlationId: row.correlationId,
      occurredAt: row.createdAt.toISOString(),
      details: row.detailsJson as Record<string, unknown> | undefined,
    }));
  }
}

export class DrizzleOutboxRepository implements IOutboxRepository {
  constructor(private readonly db: DatabaseClient) {}

  async writeEvent(
    event: Omit<
      OutboxEventRecord,
      | "status"
      | "attempts"
      | "lastError"
      | "leaseOwner"
      | "leaseExpiresAt"
      | "processedAt"
      | "createdAt"
    >,
  ): Promise<OutboxEventRecord> {
    const inserted = await this.db
      .insert(schema.outboxEvents)
      .values({
        id: event.id,
        guildId: event.guildId,
        eventType: event.eventType,
        eventVersion: event.eventVersion,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payloadJson: event.payloadJson,
        availableAt: event.availableAt,
      })
      .returning();

    const row = inserted[0]!;
    return {
      id: row.id,
      guildId: row.guildId,
      eventType: row.eventType,
      eventVersion: row.eventVersion,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      payloadJson: row.payloadJson as Record<string, unknown>,
      status: row.status as OutboxEventRecord["status"],
      attempts: row.attempts,
      lastError: row.lastError,
      leaseOwner: row.leaseOwner,
      leaseExpiresAt: row.leaseExpiresAt,
      availableAt: row.availableAt,
      processedAt: row.processedAt,
      createdAt: row.createdAt,
    };
  }

  async claimPending(
    workerId: string,
    limit: number,
    leaseDurationMs: number,
    now: Date = new Date(),
  ): Promise<readonly OutboxEventRecord[]> {
    const leaseExpires = new Date(now.getTime() + leaseDurationMs);

    // Atomically claim eligible records: status in ('pending', 'retry_wait') and availableAt <= now
    // and (leaseExpiresAt is null or leaseExpiresAt <= now)
    const claimed = await this.db
      .update(schema.outboxEvents)
      .set({
        leaseOwner: workerId,
        leaseExpiresAt: leaseExpires,
      })
      .where(
        and(
          or(
            eq(schema.outboxEvents.status, "pending"),
            eq(schema.outboxEvents.status, "retry_wait"),
          ),
          lte(schema.outboxEvents.availableAt, now),
          or(
            isNull(schema.outboxEvents.leaseExpiresAt),
            lte(schema.outboxEvents.leaseExpiresAt, now),
          ),
        ),
      )
      .returning();

    return claimed.slice(0, limit).map((row) => ({
      id: row.id,
      guildId: row.guildId,
      eventType: row.eventType,
      eventVersion: row.eventVersion,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      payloadJson: row.payloadJson as Record<string, unknown>,
      status: row.status as OutboxEventRecord["status"],
      attempts: row.attempts,
      lastError: row.lastError,
      leaseOwner: row.leaseOwner,
      leaseExpiresAt: row.leaseExpiresAt,
      availableAt: row.availableAt,
      processedAt: row.processedAt,
      createdAt: row.createdAt,
    }));
  }

  async markAcknowledged(id: string, now: Date = new Date()): Promise<void> {
    await this.db
      .update(schema.outboxEvents)
      .set({
        status: "acknowledged",
        leaseOwner: null,
        leaseExpiresAt: null,
        processedAt: now,
      })
      .where(eq(schema.outboxEvents.id, id));
  }

  async markFailed(
    id: string,
    error: string,
    retryable: boolean,
    backoffMs = 5000,
    now: Date = new Date(),
  ): Promise<void> {
    const nextAvailableAt = retryable
      ? new Date(now.getTime() + backoffMs)
      : now;
    const nextStatus = retryable ? "retry_wait" : "dead_letter";

    await this.db
      .update(schema.outboxEvents)
      .set({
        status: nextStatus,
        lastError: error,
        leaseOwner: null,
        leaseExpiresAt: null,
        availableAt: nextAvailableAt,
      })
      .where(eq(schema.outboxEvents.id, id));
  }

  async recoverExpiredLeases(now: Date = new Date()): Promise<number> {
    const recovered = await this.db
      .update(schema.outboxEvents)
      .set({
        leaseOwner: null,
        leaseExpiresAt: null,
      })
      .where(
        and(
          or(
            eq(schema.outboxEvents.status, "pending"),
            eq(schema.outboxEvents.status, "retry_wait"),
          ),
          lte(schema.outboxEvents.leaseExpiresAt, now),
        ),
      )
      .returning();

    return recovered.length;
  }
}
