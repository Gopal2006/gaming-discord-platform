import { assertTenantBoundary, type TenantContext } from "../tenant.js";
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

export class InMemoryGuildSettingsRepository implements IGuildSettingsRepository {
  private readonly store = new Map<string, GuildSettingsRecord>();

  async getSettings(
    tenant: TenantContext,
  ): Promise<GuildSettingsRecord | null> {
    return this.store.get(tenant.guildId) ?? null;
  }

  async updateSettings(
    tenant: TenantContext,
    patch: Partial<Omit<GuildSettingsRecord, "guildId" | "updatedAt">>,
  ): Promise<GuildSettingsRecord> {
    const existing = this.store.get(tenant.guildId);
    const updated: GuildSettingsRecord = {
      guildId: tenant.guildId,
      logChannelId: patch.logChannelId ?? existing?.logChannelId ?? null,
      modLogChannelId:
        patch.modLogChannelId ?? existing?.modLogChannelId ?? null,
      welcomeChannelId:
        patch.welcomeChannelId ?? existing?.welcomeChannelId ?? null,
      welcomeMessageTemplate:
        patch.welcomeMessageTemplate ??
        existing?.welcomeMessageTemplate ??
        null,
      leaveChannelId: patch.leaveChannelId ?? existing?.leaveChannelId ?? null,
      leaveMessageTemplate:
        patch.leaveMessageTemplate ?? existing?.leaveMessageTemplate ?? null,
      isEmergencyStopped:
        patch.isEmergencyStopped ?? existing?.isEmergencyStopped ?? false,
      emergencyStoppedAt:
        patch.emergencyStoppedAt !== undefined
          ? patch.emergencyStoppedAt
          : (existing?.emergencyStoppedAt ?? null),
      emergencyStoppedByActorId:
        patch.emergencyStoppedByActorId !== undefined
          ? patch.emergencyStoppedByActorId
          : (existing?.emergencyStoppedByActorId ?? null),
      emergencyStopReason:
        patch.emergencyStopReason !== undefined
          ? patch.emergencyStopReason
          : (existing?.emergencyStopReason ?? null),
      schemaVersion: patch.schemaVersion ?? existing?.schemaVersion ?? "1.0",
      updatedAt: new Date(),
    };
    this.store.set(tenant.guildId, updated);
    return updated;
  }
}

export class InMemoryAnnouncementRepository implements IAnnouncementRepository {
  private readonly store = new Map<string, AnnouncementRecord>();

  async getById(
    tenant: TenantContext,
    id: string,
  ): Promise<AnnouncementRecord | null> {
    const record = this.store.get(id);
    if (!record) return null;
    assertTenantBoundary(tenant, record.guildId);
    return record;
  }

  async list(
    tenant: TenantContext,
    status?: AnnouncementState,
  ): Promise<readonly AnnouncementRecord[]> {
    return Array.from(this.store.values()).filter((r) => {
      if (r.guildId !== tenant.guildId) return false;
      if (status && r.status !== status) return false;
      return true;
    });
  }

  async create(
    tenant: TenantContext,
    record: Omit<AnnouncementRecord, "guildId" | "createdAt" | "updatedAt">,
  ): Promise<AnnouncementRecord> {
    const created: AnnouncementRecord = {
      ...record,
      guildId: tenant.guildId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.set(created.id, created);
    return created;
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    status: AnnouncementState,
    extra?: { publishedAt?: Date; discordMessageId?: string },
  ): Promise<AnnouncementRecord> {
    const existing = await this.getById(tenant, id);
    if (!existing) {
      throw new Error(
        `Announcement ${id} not found in tenant ${tenant.guildId}`,
      );
    }
    const updated: AnnouncementRecord = {
      ...existing,
      status,
      publishedAt: extra?.publishedAt ?? existing.publishedAt,
      discordMessageId: extra?.discordMessageId ?? existing.discordMessageId,
      updatedAt: new Date(),
    };
    this.store.set(id, updated);
    return updated;
  }
}

export class InMemoryRegistrationRepository implements IRegistrationRepository {
  private readonly store = new Map<string, RegistrationRecord>();

  async getById(
    tenant: TenantContext,
    id: string,
  ): Promise<RegistrationRecord | null> {
    const record = this.store.get(id);
    if (!record) return null;
    assertTenantBoundary(tenant, record.guildId);
    return record;
  }

  async countAccepted(
    tenant: TenantContext,
    tournamentId: string,
  ): Promise<number> {
    return Array.from(this.store.values()).filter(
      (r) =>
        r.guildId === tenant.guildId &&
        r.tournamentId === tournamentId &&
        r.status === "accepted",
    ).length;
  }

  async create(
    tenant: TenantContext,
    record: Omit<RegistrationRecord, "guildId" | "createdAt">,
  ): Promise<RegistrationRecord> {
    const created: RegistrationRecord = {
      ...record,
      guildId: tenant.guildId,
      createdAt: new Date(),
    };
    this.store.set(created.id, created);
    return created;
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    status: RegistrationState,
    extra?: { checkedInAt?: Date },
  ): Promise<RegistrationRecord> {
    const existing = await this.getById(tenant, id);
    if (!existing) {
      throw new Error(
        `Registration ${id} not found in tenant ${tenant.guildId}`,
      );
    }
    const updated: RegistrationRecord = {
      ...existing,
      status,
      checkedInAt: extra?.checkedInAt ?? existing.checkedInAt,
    };
    this.store.set(id, updated);
    return updated;
  }
}

export class InMemoryTournamentRepository implements ITournamentRepository {
  private readonly store = new Map<string, TournamentRecord>();

  async getById(
    tenant: TenantContext,
    id: string,
  ): Promise<TournamentRecord | null> {
    const record = this.store.get(id);
    if (!record) return null;
    assertTenantBoundary(tenant, record.guildId);
    return record;
  }

  async create(
    tenant: TenantContext,
    record: Omit<TournamentRecord, "guildId" | "createdAt">,
  ): Promise<TournamentRecord> {
    const created: TournamentRecord = {
      ...record,
      guildId: tenant.guildId,
      createdAt: new Date(),
    };
    this.store.set(created.id, created);
    return created;
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    status: TournamentState,
  ): Promise<TournamentRecord> {
    const existing = await this.getById(tenant, id);
    if (!existing) {
      throw new Error(`Tournament ${id} not found in tenant ${tenant.guildId}`);
    }
    const updated: TournamentRecord = {
      ...existing,
      status,
    };
    this.store.set(id, updated);
    return updated;
  }
}

export class InMemoryTicketRepository implements ITicketRepository {
  private readonly store = new Map<string, TicketRecord>();

  async getById(
    tenant: TenantContext,
    id: string,
  ): Promise<TicketRecord | null> {
    const record = this.store.get(id);
    if (!record) return null;
    assertTenantBoundary(tenant, record.guildId);
    return record;
  }

  async create(
    tenant: TenantContext,
    record: Omit<TicketRecord, "guildId" | "createdAt">,
  ): Promise<TicketRecord> {
    const created: TicketRecord = {
      ...record,
      guildId: tenant.guildId,
      createdAt: new Date(),
    };
    this.store.set(created.id, created);
    return created;
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    status: TicketState,
    extra?: { closedAt?: Date; retentionDeadline?: Date },
  ): Promise<TicketRecord> {
    const existing = await this.getById(tenant, id);
    if (!existing) {
      throw new Error(`Ticket ${id} not found in tenant ${tenant.guildId}`);
    }
    const updated: TicketRecord = {
      ...existing,
      status,
      closedAt: extra?.closedAt ?? existing.closedAt,
      retentionDeadline: extra?.retentionDeadline ?? existing.retentionDeadline,
    };
    this.store.set(id, updated);
    return updated;
  }
}

export class InMemoryModerationCaseRepository implements IModerationCaseRepository {
  private readonly store = new Map<string, ModerationCaseRecord>();

  async getById(
    tenant: TenantContext,
    id: string,
  ): Promise<ModerationCaseRecord | null> {
    const record = this.store.get(id);
    if (!record) return null;
    assertTenantBoundary(tenant, record.guildId);
    return record;
  }

  async create(
    tenant: TenantContext,
    record: Omit<ModerationCaseRecord, "guildId" | "createdAt">,
  ): Promise<ModerationCaseRecord> {
    const created: ModerationCaseRecord = {
      ...record,
      guildId: tenant.guildId,
      createdAt: new Date(),
    };
    this.store.set(created.id, created);
    return created;
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    status: ModerationCaseState,
  ): Promise<ModerationCaseRecord> {
    const existing = await this.getById(tenant, id);
    if (!existing) {
      throw new Error(
        `Moderation case ${id} not found in tenant ${tenant.guildId}`,
      );
    }
    const updated: ModerationCaseRecord = {
      ...existing,
      status,
    };
    this.store.set(id, updated);
    return updated;
  }
}

export class InMemoryAuditEventRepository implements IAuditEventRepository {
  private readonly store: AuditEvent[] = [];

  async record(event: AuditEvent): Promise<void> {
    this.store.push(event);
  }

  async list(
    tenant: TenantContext,
    limit = 50,
  ): Promise<readonly AuditEvent[]> {
    return this.store
      .filter((e) => e.guildId === tenant.guildId)
      .slice(-limit)
      .reverse();
  }
}

export class InMemoryOutboxRepository implements IOutboxRepository {
  private readonly store = new Map<string, OutboxEventRecord>();

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
    const created: OutboxEventRecord = {
      ...event,
      status: "pending",
      attempts: 0,
      lastError: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      processedAt: null,
      createdAt: new Date(),
    };
    this.store.set(created.id, created);
    return created;
  }

  async claimPending(
    workerId: string,
    limit: number,
    leaseDurationMs: number,
    now: Date = new Date(),
  ): Promise<readonly OutboxEventRecord[]> {
    const eligible: OutboxEventRecord[] = [];
    const leaseExpires = new Date(now.getTime() + leaseDurationMs);

    for (const [id, event] of this.store.entries()) {
      if (
        (event.status === "pending" || event.status === "retry_wait") &&
        event.availableAt.getTime() <= now.getTime() &&
        (!event.leaseExpiresAt ||
          event.leaseExpiresAt.getTime() <= now.getTime())
      ) {
        const claimed: OutboxEventRecord = {
          ...event,
          leaseOwner: workerId,
          leaseExpiresAt: leaseExpires,
          attempts: event.attempts + 1,
        };
        this.store.set(id, claimed);
        eligible.push(claimed);
        if (eligible.length >= limit) break;
      }
    }

    return eligible;
  }

  async markAcknowledged(id: string, now: Date = new Date()): Promise<void> {
    const event = this.store.get(id);
    if (event) {
      this.store.set(id, {
        ...event,
        status: "acknowledged",
        leaseOwner: null,
        leaseExpiresAt: null,
        processedAt: now,
      });
    }
  }

  async markFailed(
    id: string,
    error: string,
    retryable: boolean,
    backoffMs = 5000,
    now: Date = new Date(),
  ): Promise<void> {
    const event = this.store.get(id);
    if (event) {
      const nextAvailableAt = retryable
        ? new Date(now.getTime() + backoffMs)
        : now;
      const nextStatus = retryable ? "retry_wait" : "dead_letter";

      this.store.set(id, {
        ...event,
        status: nextStatus,
        lastError: error,
        leaseOwner: null,
        leaseExpiresAt: null,
        availableAt: nextAvailableAt,
      });
    }
  }

  async recoverExpiredLeases(now: Date = new Date()): Promise<number> {
    let recoveredCount = 0;
    for (const [id, event] of this.store.entries()) {
      if (
        (event.status === "pending" || event.status === "retry_wait") &&
        event.leaseExpiresAt &&
        event.leaseExpiresAt.getTime() <= now.getTime()
      ) {
        this.store.set(id, {
          ...event,
          leaseOwner: null,
          leaseExpiresAt: null,
        });
        recoveredCount++;
      }
    }
    return recoveredCount;
  }
}
