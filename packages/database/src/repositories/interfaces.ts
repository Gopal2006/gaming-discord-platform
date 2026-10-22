import type { TenantContext } from "../tenant.js";
import type {
  AnnouncementState,
  TicketState,
  ModerationCaseState,
  RegistrationState,
  TournamentState,
} from "@nexus/domain";
import type { AuditEvent } from "@nexus/contracts";

// --- Domain Entity Records ---

export interface GuildSettingsRecord {
  readonly guildId: string;
  readonly logChannelId: string | null;
  readonly modLogChannelId: string | null;
  readonly welcomeChannelId: string | null;
  readonly welcomeMessageTemplate: string | null;
  readonly leaveChannelId: string | null;
  readonly leaveMessageTemplate: string | null;
  readonly schemaVersion: string;
  readonly updatedAt: Date;
}

export interface AnnouncementRecord {
  readonly id: string;
  readonly guildId: string;
  readonly channelId: string;
  readonly title: string;
  readonly content: string;
  readonly status: AnnouncementState;
  readonly scheduledFor: Date | null;
  readonly publishedAt: Date | null;
  readonly discordMessageId: string | null;
  readonly authorUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface RegistrationRecord {
  readonly id: string;
  readonly tournamentId: string;
  readonly guildId: string;
  readonly entrantId: string;
  readonly entrantType: "user" | "team";
  readonly status: RegistrationState;
  readonly answersJson: Record<string, unknown> | null;
  readonly formVersion: string;
  readonly checkedInAt: Date | null;
  readonly createdAt: Date;
}

export interface TournamentRecord {
  readonly id: string;
  readonly guildId: string;
  readonly gameProfileId: string;
  readonly title: string;
  readonly format: string;
  readonly status: TournamentState;
  readonly maxEntrants: number;
  readonly checkInDurationMinutes: number;
  readonly startsAt: Date | null;
  readonly createdAt: Date;
}

export interface TicketRecord {
  readonly id: string;
  readonly guildId: string;
  readonly ticketNumber: number;
  readonly requesterId: string;
  readonly assignedUserId: string | null;
  readonly channelId: string | null;
  readonly category: string;
  readonly status: TicketState;
  readonly closedAt: Date | null;
  readonly retentionDeadline: Date | null;
  readonly createdAt: Date;
}

export interface ModerationCaseRecord {
  readonly id: string;
  readonly guildId: string;
  readonly caseNumber: number;
  readonly targetUserId: string;
  readonly moderatorId: string;
  readonly action: string;
  readonly reason: string;
  readonly status: ModerationCaseState;
  readonly expiresAt: Date | null;
  readonly createdAt: Date;
}

export interface OutboxEventRecord {
  readonly id: string;
  readonly guildId: string | null;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payloadJson: Record<string, unknown>;
  readonly status:
    "pending" | "dispatched" | "acknowledged" | "retry_wait" | "dead_letter";
  readonly attempts: number;
  readonly lastError: string | null;
  readonly leaseOwner: string | null;
  readonly leaseExpiresAt: Date | null;
  readonly availableAt: Date;
  readonly processedAt: Date | null;
  readonly createdAt: Date;
}

// --- Repository Interfaces ---

export interface IGuildSettingsRepository {
  getSettings(tenant: TenantContext): Promise<GuildSettingsRecord | null>;
  updateSettings(
    tenant: TenantContext,
    patch: Partial<Omit<GuildSettingsRecord, "guildId" | "updatedAt">>,
  ): Promise<GuildSettingsRecord>;
}

export interface IAnnouncementRepository {
  getById(
    tenant: TenantContext,
    id: string,
  ): Promise<AnnouncementRecord | null>;
  list(
    tenant: TenantContext,
    status?: AnnouncementState,
  ): Promise<readonly AnnouncementRecord[]>;
  create(
    tenant: TenantContext,
    record: Omit<AnnouncementRecord, "guildId" | "createdAt" | "updatedAt">,
  ): Promise<AnnouncementRecord>;
  updateStatus(
    tenant: TenantContext,
    id: string,
    status: AnnouncementState,
    extra?: { publishedAt?: Date; discordMessageId?: string },
  ): Promise<AnnouncementRecord>;
}

export interface IRegistrationRepository {
  getById(
    tenant: TenantContext,
    id: string,
  ): Promise<RegistrationRecord | null>;
  countAccepted(tenant: TenantContext, tournamentId: string): Promise<number>;
  create(
    tenant: TenantContext,
    record: Omit<RegistrationRecord, "guildId" | "createdAt">,
  ): Promise<RegistrationRecord>;
  updateStatus(
    tenant: TenantContext,
    id: string,
    status: RegistrationState,
    extra?: { checkedInAt?: Date },
  ): Promise<RegistrationRecord>;
}

export interface ITournamentRepository {
  getById(tenant: TenantContext, id: string): Promise<TournamentRecord | null>;
  create(
    tenant: TenantContext,
    record: Omit<TournamentRecord, "guildId" | "createdAt">,
  ): Promise<TournamentRecord>;
  updateStatus(
    tenant: TenantContext,
    id: string,
    status: TournamentState,
  ): Promise<TournamentRecord>;
}

export interface ITicketRepository {
  getById(tenant: TenantContext, id: string): Promise<TicketRecord | null>;
  create(
    tenant: TenantContext,
    record: Omit<TicketRecord, "guildId" | "createdAt">,
  ): Promise<TicketRecord>;
  updateStatus(
    tenant: TenantContext,
    id: string,
    status: TicketState,
    extra?: { closedAt?: Date; retentionDeadline?: Date },
  ): Promise<TicketRecord>;
}

export interface IModerationCaseRepository {
  getById(
    tenant: TenantContext,
    id: string,
  ): Promise<ModerationCaseRecord | null>;
  create(
    tenant: TenantContext,
    record: Omit<ModerationCaseRecord, "guildId" | "createdAt">,
  ): Promise<ModerationCaseRecord>;
  updateStatus(
    tenant: TenantContext,
    id: string,
    status: ModerationCaseState,
  ): Promise<ModerationCaseRecord>;
}

export interface IAuditEventRepository {
  record(event: AuditEvent): Promise<void>;
  list(tenant: TenantContext, limit?: number): Promise<readonly AuditEvent[]>;
}

export interface IOutboxRepository {
  writeEvent(
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
  ): Promise<OutboxEventRecord>;
  claimPending(
    workerId: string,
    limit: number,
    leaseDurationMs: number,
    now?: Date,
  ): Promise<readonly OutboxEventRecord[]>;
  markAcknowledged(id: string, now?: Date): Promise<void>;
  markFailed(
    id: string,
    error: string,
    retryable: boolean,
    backoffMs?: number,
    now?: Date,
  ): Promise<void>;
  recoverExpiredLeases(now?: Date): Promise<number>;
}
