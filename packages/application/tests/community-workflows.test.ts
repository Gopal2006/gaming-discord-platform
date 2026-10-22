import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryUnitOfWork, type TenantContext } from "@nexus/database";
import { GuildCapability } from "@nexus/contracts";
import type { ActorContext, PermissionGrant } from "@nexus/authorization";
import {
  openTicketWorkflow,
  createPollWorkflow,
  votePollWorkflow,
  closePollWorkflow,
  createGiveawayWorkflow,
  enterGiveawayWorkflow,
  endGiveawayWorkflow,
  rerollGiveawayWorkflow,
  UnauthorizedError,
  PolicyViolationError,
} from "../src/index.js";

describe("Community Operations Workflows", () => {
  let uow: InMemoryUnitOfWork;
  const tenant: TenantContext = { guildId: "guild_apex_01" };

  const adminActor: ActorContext = {
    actorId: "usr_admin_1",
    actorType: "user",
    realm: "guild",
    guildId: "guild_apex_01",
  };

  const memberActor: ActorContext = {
    actorId: "usr_member_1",
    actorType: "user",
    realm: "guild",
    guildId: "guild_apex_01",
  };

  const adminGrants: PermissionGrant[] = [
    {
      id: "g1",
      principalType: "user",
      principalId: "usr_admin_1",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.TicketCreate,
      effect: "allow",
    },
    {
      id: "g2",
      principalType: "user",
      principalId: "usr_admin_1",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.PollCreate,
      effect: "allow",
    },
    {
      id: "g3",
      principalType: "user",
      principalId: "usr_admin_1",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.PollClose,
      effect: "allow",
    },
    {
      id: "g4",
      principalType: "user",
      principalId: "usr_admin_1",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.GiveawayCreate,
      effect: "allow",
    },
    {
      id: "g5",
      principalType: "user",
      principalId: "usr_admin_1",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.GiveawayEnd,
      effect: "allow",
    },
    {
      id: "g6",
      principalType: "user",
      principalId: "usr_admin_1",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.GiveawayReroll,
      effect: "allow",
    },
  ];

  const memberGrants: PermissionGrant[] = [
    {
      id: "gm1",
      principalType: "user",
      principalId: "usr_member_1",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.TicketCreate,
      effect: "allow",
    },
    {
      id: "gm2",
      principalType: "user",
      principalId: "usr_member_1",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.PollVote,
      effect: "allow",
    },
    {
      id: "gm3",
      principalType: "user",
      principalId: "usr_member_1",
      realm: "guild",
      guildId: tenant.guildId,
      capability: GuildCapability.GiveawayEnter,
      effect: "allow",
    },
  ];

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
  });

  describe("Ticket Workflow", () => {
    it("creates an open ticket and records audit event", async () => {
      const ticket = await openTicketWorkflow(uow, {
        actor: memberActor,
        grants: memberGrants,
        tenant,
        correlationId: "corr_tkt_1",
        category: "support",
      });

      expect(ticket.status).toBe("open");
      expect(ticket.requesterId).toBe("usr_member_1");

      const audits = await uow.getRepositories().auditEvents.list(tenant);
      expect(
        audits.some((a) => a.action === GuildCapability.TicketCreate),
      ).toBe(true);
    });

    it("enforces max active tickets limit per user", async () => {
      await openTicketWorkflow(uow, {
        actor: memberActor,
        grants: memberGrants,
        tenant,
        correlationId: "corr_tkt_1",
        maxActiveTicketsPerUser: 1,
      });

      await expect(
        openTicketWorkflow(uow, {
          actor: memberActor,
          grants: memberGrants,
          tenant,
          correlationId: "corr_tkt_2",
          maxActiveTicketsPerUser: 1,
        }),
      ).rejects.toThrow(PolicyViolationError);
    });

    it("rejects unauthorized actor without TicketCreate grant", async () => {
      await expect(
        openTicketWorkflow(uow, {
          actor: memberActor,
          grants: [], // no grants
          tenant,
          correlationId: "corr_tkt_3",
        }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("Poll Workflow", () => {
    it("creates poll, records unique votes, and tallies results upon closure", async () => {
      const poll = await createPollWorkflow(uow, {
        actor: adminActor,
        grants: adminGrants,
        tenant,
        correlationId: "corr_poll_1",
        channelId: "ch_polls_1",
        question: "Favorite Map?",
        options: ["Kings Canyon", "Worlds Edge", "Olympus"],
      });

      expect(poll.question).toBe("Favorite Map?");
      expect(poll.status).toBe("active");

      // Member votes
      const voteRes = await votePollWorkflow(uow, {
        actor: memberActor,
        grants: memberGrants,
        tenant,
        correlationId: "corr_poll_2",
        pollId: poll.id,
        optionIndex: 1,
      });
      expect(voteRes.success).toBe(true);

      // Duplicate vote is rejected
      await expect(
        votePollWorkflow(uow, {
          actor: memberActor,
          grants: memberGrants,
          tenant,
          correlationId: "corr_poll_3",
          pollId: poll.id,
          optionIndex: 0,
        }),
      ).rejects.toThrow(PolicyViolationError);

      // Close poll
      const { poll: closedPoll, tally } = await closePollWorkflow(uow, {
        actor: adminActor,
        grants: adminGrants,
        tenant,
        correlationId: "corr_poll_4",
        pollId: poll.id,
      });

      expect(closedPoll.status).toBe("closed");
      expect(tally[1]).toBe(1);
      expect(tally[0]).toBe(0);
    });

    it("rejects unauthorized vote without PollVote capability", async () => {
      const poll = await createPollWorkflow(uow, {
        actor: adminActor,
        grants: adminGrants,
        tenant,
        correlationId: "corr_poll_1",
        channelId: "ch_polls_1",
        question: "Test?",
        options: ["A", "B"],
      });

      await expect(
        votePollWorkflow(uow, {
          actor: memberActor,
          grants: [], // no grants
          tenant,
          correlationId: "corr_poll_2",
          pollId: poll.id,
          optionIndex: 0,
        }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("Giveaway Workflow", () => {
    it("creates giveaway, allows unique entries, and selects winner", async () => {
      const giveaway = await createGiveawayWorkflow(uow, {
        actor: adminActor,
        grants: adminGrants,
        tenant,
        correlationId: "corr_gw_1",
        channelId: "ch_gw_1",
        prize: "1000 Apex Coins",
        winnerCount: 1,
        durationMinutes: 60,
      });

      expect(giveaway.status).toBe("active");
      expect(giveaway.prize).toBe("1000 Apex Coins");

      // Enter giveaway
      const enterRes = await enterGiveawayWorkflow(uow, {
        actor: memberActor,
        grants: memberGrants,
        tenant,
        giveawayId: giveaway.id,
      });
      expect(enterRes.success).toBe(true);

      // Duplicate entry rejected
      await expect(
        enterGiveawayWorkflow(uow, {
          actor: memberActor,
          grants: memberGrants,
          tenant,
          giveawayId: giveaway.id,
        }),
      ).rejects.toThrow(PolicyViolationError);

      // End giveaway
      const { giveaway: ended, winners } = await endGiveawayWorkflow(uow, {
        actor: adminActor,
        grants: adminGrants,
        tenant,
        correlationId: "corr_gw_2",
        giveawayId: giveaway.id,
      });

      expect(ended.status).toBe("ended");
      expect(winners).toContain("usr_member_1");

      // Reroll giveaway
      const { newWinners } = await rerollGiveawayWorkflow(uow, {
        actor: adminActor,
        grants: adminGrants,
        tenant,
        correlationId: "corr_gw_3",
        giveawayId: giveaway.id,
      });
      expect(newWinners).toContain("usr_member_1");
    });
  });
});
