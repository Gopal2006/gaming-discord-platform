import { describe, it, expect } from "vitest";
import {
  InMemoryUnitOfWork,
  type TenantContext,
  type IEventTransport,
  type OutboxEventRecord,
} from "@nexus/database";
import { GuildCapability } from "@nexus/contracts";
import type { ActorContext, PermissionGrant } from "@nexus/authorization";
import {
  updateGuildSettingsWorkflow,
  createAnnouncementWorkflow,
  submitRegistrationWorkflow,
  transitionTicketWorkflow,
  dispatchOutboxWorkflow,
  UnauthorizedError,
  ConflictError,
} from "../src/index.js";
import {
  InvalidStateTransitionError,
  InvariantViolationError,
} from "@nexus/domain";

describe("Application Workflow 1 - Update Guild Settings", () => {
  const tenant: TenantContext = { guildId: "123456789012345678" };
  const authorizedActor: ActorContext = {
    actorId: "usr_admin",
    actorType: "user",
    realm: "guild",
    guildId: tenant.guildId,
  };
  const grants: PermissionGrant[] = [
    {
      id: "grant_settings",
      principalType: "user",
      principalId: "usr_admin",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.GuildSettingsEdit,
      effect: "allow",
    },
  ];

  it("updates guild settings and creates an audit event in transaction when authorized", async () => {
    const uow = new InMemoryUnitOfWork();

    const result = await updateGuildSettingsWorkflow(uow, {
      actor: authorizedActor,
      grants,
      tenant,
      correlationId: "req_update_settings_1",
      patch: {
        welcomeChannelId: "chan_welcome",
        welcomeMessageTemplate: "Welcome to the server!",
      },
    });

    expect(result.welcomeChannelId).toBe("chan_welcome");
    expect(result.welcomeMessageTemplate).toBe("Welcome to the server!");

    // Verify audit event was written
    const auditEvents = await uow.getRepositories().auditEvents.list(tenant);
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]?.action).toBe(GuildCapability.GuildSettingsEdit);
    expect(auditEvents[0]?.actorId).toBe("usr_admin");
  });

  it("throws UnauthorizedError and commits no audit event when unauthorized", async () => {
    const uow = new InMemoryUnitOfWork();
    const unauthorizedActor: ActorContext = {
      actorId: "usr_guest",
      actorType: "user",
      realm: "guild",
      guildId: tenant.guildId,
    };

    await expect(
      updateGuildSettingsWorkflow(uow, {
        actor: unauthorizedActor,
        grants: [], // no grants
        tenant,
        correlationId: "req_unauth_1",
        patch: { welcomeChannelId: "chan_hack" },
      }),
    ).rejects.toThrow(UnauthorizedError);

    // Verify no audit event was saved
    const auditEvents = await uow.getRepositories().auditEvents.list(tenant);
    expect(auditEvents).toHaveLength(0);
  });
});

describe("Application Workflow 2 - Create Announcement", () => {
  const tenant: TenantContext = { guildId: "123456789012345678" };
  const actor: ActorContext = {
    actorId: "usr_announcer",
    actorType: "user",
    realm: "guild",
    guildId: tenant.guildId,
  };
  const grants: PermissionGrant[] = [
    {
      id: "grant_ann",
      principalType: "user",
      principalId: "usr_announcer",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.AnnouncementCreate,
      effect: "allow",
    },
  ];

  it("creates announcement, sanitizes mentions, and writes outbox event transactionally", async () => {
    const uow = new InMemoryUnitOfWork();

    const announcement = await createAnnouncementWorkflow(uow, {
      actor,
      grants,
      tenant,
      correlationId: "req_ann_1",
      data: {
        id: "ann_test_1",
        channelId: "chan_news",
        title: "Major Update",
        content: "Check this out @everyone and @here!",
        allowEveryone: false,
        allowHere: false,
      },
    });

    expect(announcement.id).toBe("ann_test_1");
    expect(announcement.content).not.toContain("@everyone");
    expect(announcement.content).toContain("@\u200beveryone");

    // Verify Outbox Event exists
    const claimed = await uow
      .getRepositories()
      .outbox.claimPending("worker_test", 10, 5000);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.eventType).toBe("announcement.created");
    expect(claimed[0]?.aggregateId).toBe("ann_test_1");
  });
});

describe("Application Workflow 3 - Submit Registration", () => {
  const tenant: TenantContext = { guildId: "123456789012345678" };
  const actor: ActorContext = {
    actorId: "usr_player1",
    actorType: "user",
    realm: "guild",
    guildId: tenant.guildId,
  };
  const grants: PermissionGrant[] = [
    {
      id: "grant_reg",
      principalType: "user",
      principalId: "usr_player1",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.RegistrationSubmit,
      effect: "allow",
    },
  ];

  it("rejects registration when tournament is not in registration_open state", async () => {
    const uow = new InMemoryUnitOfWork();

    // Tournament in draft state
    await uow.getRepositories().tournaments.create(tenant, {
      id: "tourney_draft",
      gameProfileId: "game_valorant",
      title: "Valorant Cup",
      format: "single_elimination",
      status: "draft",
      maxEntrants: 8,
      checkInDurationMinutes: 15,
      startsAt: null,
    });

    await expect(
      submitRegistrationWorkflow(uow, {
        actor,
        grants,
        tenant,
        correlationId: "req_reg_draft",
        data: {
          id: "reg_1",
          tournamentId: "tourney_draft",
          entrantId: "usr_player1",
          entrantType: "user",
        },
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("rejects registration when max capacity is reached", async () => {
    const uow = new InMemoryUnitOfWork();

    await uow.getRepositories().tournaments.create(tenant, {
      id: "tourney_full",
      gameProfileId: "game_valorant",
      title: "Valorant Cup",
      format: "single_elimination",
      status: "registration_open",
      maxEntrants: 1, // capacity is 1
      checkInDurationMinutes: 15,
      startsAt: null,
    });

    // Fill capacity
    await uow.getRepositories().registrations.create(tenant, {
      id: "reg_existing",
      tournamentId: "tourney_full",
      entrantId: "usr_player0",
      entrantType: "user",
      status: "accepted",
      answersJson: null,
      formVersion: "1.0",
      checkedInAt: null,
    });

    // Attempt registration over cap
    await expect(
      submitRegistrationWorkflow(uow, {
        actor,
        grants,
        tenant,
        correlationId: "req_reg_full",
        data: {
          id: "reg_2",
          tournamentId: "tourney_full",
          entrantId: "usr_player1",
          entrantType: "user",
        },
      }),
    ).rejects.toThrow(InvariantViolationError);
  });

  it("accepts registration and writes outbox event when within capacity", async () => {
    const uow = new InMemoryUnitOfWork();

    await uow.getRepositories().tournaments.create(tenant, {
      id: "tourney_open",
      gameProfileId: "game_valorant",
      title: "Valorant Cup",
      format: "single_elimination",
      status: "registration_open",
      maxEntrants: 8,
      checkInDurationMinutes: 15,
      startsAt: null,
    });

    const reg = await submitRegistrationWorkflow(uow, {
      actor,
      grants,
      tenant,
      correlationId: "req_reg_success",
      data: {
        id: "reg_success",
        tournamentId: "tourney_open",
        entrantId: "usr_player1",
        entrantType: "user",
      },
    });

    expect(reg.status).toBe("accepted");
    const claimed = await uow
      .getRepositories()
      .outbox.claimPending("worker_reg", 10, 5000);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.eventType).toBe("registration.accepted");
  });
});

describe("Application Workflow 4 - Transition Ticket", () => {
  const tenant: TenantContext = { guildId: "123456789012345678" };
  const staffActor: ActorContext = {
    actorId: "usr_staff",
    actorType: "user",
    realm: "guild",
    guildId: tenant.guildId,
  };
  const grants: PermissionGrant[] = [
    {
      id: "grant_ticket_assign",
      principalType: "user",
      principalId: "usr_staff",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.TicketAssign,
      effect: "allow",
    },
    {
      id: "grant_ticket_close",
      principalType: "user",
      principalId: "usr_staff",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.TicketClose,
      effect: "allow",
    },
  ];

  it("transitions ticket state and writes outbox event", async () => {
    const uow = new InMemoryUnitOfWork();

    await uow.getRepositories().tickets.create(tenant, {
      id: "tkt_demo",
      ticketNumber: 42,
      requesterId: "usr_requester",
      assignedUserId: null,
      channelId: "chan_42",
      category: "support",
      status: "open",
      closedAt: null,
      retentionDeadline: null,
    });

    const updated = await transitionTicketWorkflow(uow, {
      actor: staffActor,
      grants,
      tenant,
      correlationId: "req_tkt_1",
      ticketId: "tkt_demo",
      action: "start_work",
    });

    expect(updated.status).toBe("in_progress");

    const claimed = await uow
      .getRepositories()
      .outbox.claimPending("worker_ticket", 10, 5000);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.eventType).toBe("ticket.status_changed");
    expect(claimed[0]?.payloadJson["newStatus"]).toBe("in_progress");
  });

  it("rejects illegal transitions using pure domain state machine", async () => {
    const uow = new InMemoryUnitOfWork();

    await uow.getRepositories().tickets.create(tenant, {
      id: "tkt_illegal",
      ticketNumber: 43,
      requesterId: "usr_requester",
      assignedUserId: null,
      channelId: "chan_43",
      category: "support",
      status: "open",
      closedAt: null,
      retentionDeadline: null,
    });

    // Directly trying to archive an open ticket is prohibited
    await expect(
      transitionTicketWorkflow(uow, {
        actor: staffActor,
        grants,
        tenant,
        correlationId: "req_tkt_illegal",
        ticketId: "tkt_illegal",
        action: "archive",
      }),
    ).rejects.toThrow(InvalidStateTransitionError);
  });
});

describe("Application Workflow 5 - Outbox Dispatch & Transport", () => {
  it("dispatches pending events to transport and acknowledges them", async () => {
    const uow = new InMemoryUnitOfWork();
    const publishedEvents: OutboxEventRecord[] = [];

    const mockTransport: IEventTransport = {
      async publish(event: OutboxEventRecord): Promise<void> {
        publishedEvents.push(event);
      },
    };

    await uow.getRepositories().outbox.writeEvent({
      id: "evt_disp_1",
      guildId: "guild_1",
      eventType: "user.registered",
      eventVersion: 1,
      aggregateType: "user",
      aggregateId: "usr_1",
      payloadJson: { email: "user@example.com" },
      availableAt: new Date(Date.now() - 1000),
    });

    const result = await dispatchOutboxWorkflow(
      uow.getRepositories().outbox,
      mockTransport,
      {
        workerId: "worker_alpha",
      },
    );

    expect(result.claimedCount).toBe(1);
    expect(result.acknowledgedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]?.id).toBe("evt_disp_1");
  });

  it("handles transport failure with retry backoff and records failure", async () => {
    const uow = new InMemoryUnitOfWork();

    const failingTransport: IEventTransport = {
      async publish(): Promise<void> {
        throw new Error("Connection refused by downstream queue");
      },
    };

    await uow.getRepositories().outbox.writeEvent({
      id: "evt_fail_1",
      guildId: "guild_1",
      eventType: "payment.processed",
      eventVersion: 1,
      aggregateType: "payment",
      aggregateId: "pay_1",
      payloadJson: {},
      availableAt: new Date(Date.now() - 1000),
    });

    const result = await dispatchOutboxWorkflow(
      uow.getRepositories().outbox,
      failingTransport,
      {
        workerId: "worker_beta",
      },
    );

    expect(result.claimedCount).toBe(1);
    expect(result.acknowledgedCount).toBe(0);
    expect(result.failedCount).toBe(1);
  });
});
