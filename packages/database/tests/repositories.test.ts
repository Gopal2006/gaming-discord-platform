import { describe, it, expect } from "vitest";
import {
  InMemoryAnnouncementRepository,
  InMemoryRegistrationRepository,
  InMemoryTournamentRepository,
  InMemoryTicketRepository,
  InMemoryOutboxRepository,
  TenantIsolationViolationError,
  type TenantContext,
} from "../src/index.js";

describe("Repositories - Tenant Scoping & Isolation", () => {
  const tenantA: TenantContext = { guildId: "guild_111111111111111111" };
  const tenantB: TenantContext = { guildId: "guild_222222222222222222" };

  it("prohibits reading another guild announcement by ID", async () => {
    const repo = new InMemoryAnnouncementRepository();

    // Create under tenant A
    const ann = await repo.create(tenantA, {
      id: "ann_1",
      channelId: "chan_1",
      title: "Tournament Starting",
      content: "Join now!",
      status: "draft",
      scheduledFor: null,
      publishedAt: null,
      discordMessageId: null,
      authorUserId: "usr_owner",
    });

    // Tenant A can read it
    const readByA = await repo.getById(tenantA, ann.id);
    expect(readByA).not.toBeNull();
    expect(readByA?.id).toBe("ann_1");

    // Tenant B cannot read it (throws TenantIsolationViolationError)
    await expect(repo.getById(tenantB, ann.id)).rejects.toThrow(
      TenantIsolationViolationError,
    );
  });

  it("filters announcements strictly to the querying tenant", async () => {
    const repo = new InMemoryAnnouncementRepository();

    await repo.create(tenantA, {
      id: "ann_a1",
      channelId: "chan_1",
      title: "Tenant A Announcement",
      content: "Content A",
      status: "published",
      scheduledFor: null,
      publishedAt: new Date(),
      discordMessageId: "msg_1",
      authorUserId: "usr_1",
    });

    await repo.create(tenantB, {
      id: "ann_b1",
      channelId: "chan_2",
      title: "Tenant B Announcement",
      content: "Content B",
      status: "published",
      scheduledFor: null,
      publishedAt: new Date(),
      discordMessageId: "msg_2",
      authorUserId: "usr_2",
    });

    const listA = await repo.list(tenantA);
    expect(listA).toHaveLength(1);
    expect(listA[0]?.id).toBe("ann_a1");

    const listB = await repo.list(tenantB);
    expect(listB).toHaveLength(1);
    expect(listB[0]?.id).toBe("ann_b1");
  });

  it("isolates registration records and counts by tenant", async () => {
    const regRepo = new InMemoryRegistrationRepository();
    const tourneyRepo = new InMemoryTournamentRepository();

    await tourneyRepo.create(tenantA, {
      id: "tourney_a",
      gameProfileId: "game_1",
      title: "Smash Weekly",
      format: "single_elimination",
      status: "registration_open",
      maxEntrants: 16,
      checkInDurationMinutes: 15,
      startsAt: null,
    });

    await regRepo.create(tenantA, {
      id: "reg_a1",
      tournamentId: "tourney_a",
      entrantId: "usr_player1",
      entrantType: "user",
      status: "accepted",
      answersJson: null,
      formVersion: "1.0",
      checkedInAt: null,
    });

    // Tenant A count is 1
    const countA = await regRepo.countAccepted(tenantA, "tourney_a");
    expect(countA).toBe(1);

    // Tenant B count for same tournament query is 0
    const countB = await regRepo.countAccepted(tenantB, "tourney_a");
    expect(countB).toBe(0);
  });

  it("prohibits reading another guild ticket by ID", async () => {
    const ticketRepo = new InMemoryTicketRepository();

    const tkt = await ticketRepo.create(tenantA, {
      id: "tkt_1",
      ticketNumber: 1,
      requesterId: "usr_requester",
      assignedUserId: null,
      channelId: "chan_ticket",
      category: "support",
      status: "open",
      closedAt: null,
      retentionDeadline: null,
    });

    await expect(ticketRepo.getById(tenantB, tkt.id)).rejects.toThrow(
      TenantIsolationViolationError,
    );
  });
});

describe("Repositories - Outbox Durability & Leases", () => {
  it("claims pending events and respects lease durations", async () => {
    const outbox = new InMemoryOutboxRepository();

    await outbox.writeEvent({
      id: "evt_1",
      guildId: "guild_1",
      eventType: "test.event",
      eventVersion: 1,
      aggregateType: "test",
      aggregateId: "agg_1",
      payloadJson: { key: "val1" },
      availableAt: new Date(Date.now() - 1000), // available in past
    });

    await outbox.writeEvent({
      id: "evt_2",
      guildId: "guild_1",
      eventType: "test.event",
      eventVersion: 1,
      aggregateType: "test",
      aggregateId: "agg_2",
      payloadJson: { key: "val2" },
      availableAt: new Date(Date.now() - 1000),
    });

    // Worker 1 claims with 10 second lease
    const claimedByWorker1 = await outbox.claimPending("worker_1", 10, 10000);
    expect(claimedByWorker1).toHaveLength(2);
    expect(claimedByWorker1[0]?.leaseOwner).toBe("worker_1");

    // Worker 2 attempts to claim while lease is active: gets 0 events
    const claimedByWorker2 = await outbox.claimPending("worker_2", 10, 10000);
    expect(claimedByWorker2).toHaveLength(0);

    // After lease expires, recoverExpiredLeases frees them
    const futureTime = new Date(Date.now() + 15000);
    const recovered = await outbox.recoverExpiredLeases(futureTime);
    expect(recovered).toBe(2);

    // Worker 2 can now claim them
    const claimedAfterRecovery = await outbox.claimPending(
      "worker_2",
      10,
      10000,
      futureTime,
    );
    expect(claimedAfterRecovery).toHaveLength(2);
    expect(claimedAfterRecovery[0]?.leaseOwner).toBe("worker_2");
  });

  it("marks acknowledged events as processed and sets status", async () => {
    const outbox = new InMemoryOutboxRepository();
    await outbox.writeEvent({
      id: "evt_ack",
      guildId: "guild_1",
      eventType: "test.ack",
      eventVersion: 1,
      aggregateType: "test",
      aggregateId: "agg_ack",
      payloadJson: {},
      availableAt: new Date(Date.now() - 500),
    });

    await outbox.claimPending("worker_1", 1, 5000);
    await outbox.markAcknowledged("evt_ack");

    // Should no longer be claimable
    const nextClaim = await outbox.claimPending("worker_1", 1, 5000);
    expect(nextClaim).toHaveLength(0);
  });
});
