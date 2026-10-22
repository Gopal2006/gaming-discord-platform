import type {
  IGuildSettingsRepository,
  IAnnouncementRepository,
  IRegistrationRepository,
  ITournamentRepository,
  ITicketRepository,
  IModerationCaseRepository,
  IAuditEventRepository,
  IOutboxRepository,
} from "../repositories/interfaces.js";
import type { DatabaseClient } from "../client.js";
import {
  DrizzleGuildSettingsRepository,
  DrizzleAnnouncementRepository,
  DrizzleRegistrationRepository,
  DrizzleTournamentRepository,
  DrizzleTicketRepository,
  DrizzleModerationCaseRepository,
  DrizzleAuditEventRepository,
  DrizzleOutboxRepository,
} from "../repositories/drizzle.js";
import {
  InMemoryGuildSettingsRepository,
  InMemoryAnnouncementRepository,
  InMemoryRegistrationRepository,
  InMemoryTournamentRepository,
  InMemoryTicketRepository,
  InMemoryModerationCaseRepository,
  InMemoryAuditEventRepository,
  InMemoryOutboxRepository,
} from "../repositories/in-memory.js";

export interface Repositories {
  readonly guildSettings: IGuildSettingsRepository;
  readonly announcements: IAnnouncementRepository;
  readonly registrations: IRegistrationRepository;
  readonly tournaments: ITournamentRepository;
  readonly tickets: ITicketRepository;
  readonly moderationCases: IModerationCaseRepository;
  readonly auditEvents: IAuditEventRepository;
  readonly outbox: IOutboxRepository;
}

export interface IUnitOfWork {
  runInTransaction<T>(fn: (repos: Repositories) => Promise<T>): Promise<T>;
  getRepositories(): Repositories;
}

export class DrizzleUnitOfWork implements IUnitOfWork {
  private readonly rootRepos: Repositories;

  constructor(private readonly db: DatabaseClient) {
    this.rootRepos = {
      guildSettings: new DrizzleGuildSettingsRepository(db),
      announcements: new DrizzleAnnouncementRepository(db),
      registrations: new DrizzleRegistrationRepository(db),
      tournaments: new DrizzleTournamentRepository(db),
      tickets: new DrizzleTicketRepository(db),
      moderationCases: new DrizzleModerationCaseRepository(db),
      auditEvents: new DrizzleAuditEventRepository(db),
      outbox: new DrizzleOutboxRepository(db),
    };
  }

  getRepositories(): Repositories {
    return this.rootRepos;
  }

  async runInTransaction<T>(
    fn: (repos: Repositories) => Promise<T>,
  ): Promise<T> {
    return await this.db.transaction(async (tx) => {
      // Create transaction-scoped repositories bound to the active transaction client
      const txRepos: Repositories = {
        guildSettings: new DrizzleGuildSettingsRepository(
          tx as unknown as DatabaseClient,
        ),
        announcements: new DrizzleAnnouncementRepository(
          tx as unknown as DatabaseClient,
        ),
        registrations: new DrizzleRegistrationRepository(
          tx as unknown as DatabaseClient,
        ),
        tournaments: new DrizzleTournamentRepository(
          tx as unknown as DatabaseClient,
        ),
        tickets: new DrizzleTicketRepository(tx as unknown as DatabaseClient),
        moderationCases: new DrizzleModerationCaseRepository(
          tx as unknown as DatabaseClient,
        ),
        auditEvents: new DrizzleAuditEventRepository(
          tx as unknown as DatabaseClient,
        ),
        outbox: new DrizzleOutboxRepository(tx as unknown as DatabaseClient),
      };

      return await fn(txRepos);
    });
  }
}

export class InMemoryUnitOfWork implements IUnitOfWork {
  public readonly repos: Repositories;

  constructor() {
    this.repos = {
      guildSettings: new InMemoryGuildSettingsRepository(),
      announcements: new InMemoryAnnouncementRepository(),
      registrations: new InMemoryRegistrationRepository(),
      tournaments: new InMemoryTournamentRepository(),
      tickets: new InMemoryTicketRepository(),
      moderationCases: new InMemoryModerationCaseRepository(),
      auditEvents: new InMemoryAuditEventRepository(),
      outbox: new InMemoryOutboxRepository(),
    };
  }

  getRepositories(): Repositories {
    return this.repos;
  }

  async runInTransaction<T>(
    fn: (repos: Repositories) => Promise<T>,
  ): Promise<T> {
    // In-memory simulation: executes function, if an exception occurs, bubble it up.
    return await fn(this.repos);
  }
}
