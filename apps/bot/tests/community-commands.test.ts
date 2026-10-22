import { describe, it, expect, beforeEach } from "vitest";
import {
  CommandRouter,
  ModerationCommand,
  TicketCommand,
  PollCommand,
  GiveawayCommand,
  AnnouncementCommand,
  type CommandContext,
} from "../src/index.js";
import { FakeDiscordClient } from "@nexus/discord-adapter";
import { InMemoryUnitOfWork } from "@nexus/database";
import {
  DiscordPermissions,
  type ActorContext,
  type PermissionGrant,
} from "@nexus/authorization";
import { GuildCapability } from "@nexus/contracts";

describe("Nexus Bot - Community Operations Commands", () => {
  let uow: InMemoryUnitOfWork;
  let discordClient: FakeDiscordClient;
  let router: CommandRouter;

  const guildId = "guild_apex_01";
  const channelId = "chan_general_01";

  const ownerActor: ActorContext = {
    actorId: "usr_owner_1",
    actorType: "user",
    realm: "guild",
    guildId,
    isGuildOwner: true,
    actorRolePosition: 100,
  };

  const modActor: ActorContext = {
    actorId: "usr_mod_1",
    actorType: "user",
    realm: "guild",
    guildId,
    roleIds: ["role_mod"],
    actorRolePosition: 50,
  };

  const memberActor: ActorContext = {
    actorId: "usr_member_1",
    actorType: "user",
    realm: "guild",
    guildId,
    roleIds: ["role_member"],
    actorRolePosition: 10,
  };

  const modGrants: PermissionGrant[] = [
    {
      id: "grant_mod_warn",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.ModerationWarn,
      effect: "allow",
    },
    {
      id: "grant_mod_timeout",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.ModerationTimeout,
      effect: "allow",
    },
    {
      id: "grant_mod_kick",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.ModerationKick,
      effect: "allow",
    },
    {
      id: "grant_mod_ban",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.ModerationBan,
      effect: "allow",
    },
    {
      id: "grant_mod_unban",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.ModerationUnban,
      effect: "allow",
    },
    {
      id: "grant_mod_purge",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.ModerationPurge,
      effect: "allow",
    },
    {
      id: "grant_mod_lock",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.ModerationLock,
      effect: "allow",
    },
    {
      id: "grant_mod_view",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.ModerationCaseView,
      effect: "allow",
    },
    {
      id: "grant_ticket_manage",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.TicketClose,
      effect: "allow",
    },
    {
      id: "grant_ticket_assign",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.TicketAssign,
      effect: "allow",
    },
    {
      id: "grant_ticket_view",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.TicketView,
      effect: "allow",
    },
    {
      id: "grant_poll_create",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.PollCreate,
      effect: "allow",
    },
    {
      id: "grant_poll_close",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.PollClose,
      effect: "allow",
    },
    {
      id: "grant_gw_create",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.GiveawayCreate,
      effect: "allow",
    },
    {
      id: "grant_gw_end",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.GiveawayEnd,
      effect: "allow",
    },
    {
      id: "grant_gw_reroll",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.GiveawayReroll,
      effect: "allow",
    },
    {
      id: "grant_ann_publish",
      principalType: "role",
      principalId: "role_mod",
      realm: "guild",
      guildId,
      capability: GuildCapability.AnnouncementCreate,
      effect: "allow",
    },
  ];

  const memberGrants: PermissionGrant[] = [
    {
      id: "grant_mbr_ticket_create",
      principalType: "user",
      principalId: "usr_member_1",
      realm: "guild",
      guildId,
      capability: GuildCapability.TicketCreate,
      effect: "allow",
    },
    {
      id: "grant_mbr_poll_vote",
      principalType: "user",
      principalId: "usr_member_1",
      realm: "guild",
      guildId,
      capability: GuildCapability.PollVote,
      effect: "allow",
    },
    {
      id: "grant_mbr_gw_enter",
      principalType: "user",
      principalId: "usr_member_1",
      realm: "guild",
      guildId,
      capability: GuildCapability.GiveawayEnter,
      effect: "allow",
    },
  ];

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    discordClient = new FakeDiscordClient();
    router = new CommandRouter();

    router.register(new ModerationCommand());
    router.register(new TicketCommand());
    router.register(new PollCommand());
    router.register(new GiveawayCommand());
    router.register(new AnnouncementCommand());

    discordClient.addGuild({
      id: guildId,
      name: "Apex Esports League",
      ownerId: "usr_owner_1",
      channels: [{ id: channelId, name: "general", type: 0 }],
      roles: [],
      botPermissions: DiscordPermissions.ADMINISTRATOR,
      botRolePosition: 99,
    });
  });

  function createContext(
    actor: ActorContext,
    grants: readonly PermissionGrant[],
    options: Record<string, unknown> = {},
    subcommand?: string,
  ): CommandContext {
    return {
      guildId,
      channelId,
      actor,
      tenant: { guildId },
      grants,
      botPermissions: DiscordPermissions.ADMINISTRATOR,
      botRolePosition: 99,
      correlationId: `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      uow,
      discordClient,
      options,
      subcommand,
    };
  }

  describe("/mod moderation commands", () => {
    it("/mod timeout applies timeout to member, persists case record, and calls discordClient", async () => {
      const ctx = createContext(
        modActor,
        modGrants,
        {
          target: "usr_target_bad",
          duration_minutes: 30,
          reason: "Spamming offensive links",
          target_role_position: 10,
        },
        "timeout",
      );

      const result = await router.dispatch("mod", ctx);
      expect(result.ephemeral).toBe(false);
      expect(result.embeds![0]!.title).toContain("TIMEOUT");

      // Verify DB case record
      const cases = await uow
        .getRepositories()
        .moderationCases.listByTarget({ guildId }, "usr_target_bad");
      expect(cases).toHaveLength(1);
      expect(cases[0]!.action).toBe("timeout");
      expect(cases[0]!.moderatorId).toBe("usr_mod_1");
    });

    it("/mod kick and /mod ban enforce role hierarchy guards", async () => {
      // Moderator (position 50) tries to kick a user with role position 80 -> should fail hierarchy check
      const ctx = createContext(
        modActor,
        modGrants,
        {
          target: "usr_senior_admin",
          reason: "Disrespect",
          target_role_position: 80,
        },
        "kick",
      );

      const result = await router.dispatch("mod", ctx);
      expect(result.ephemeral).toBe(true);
      expect(result.embeds![0]!.title).toBe("Moderation Failed");
      expect(result.embeds![0]!.description).toContain("Hierarchy violation");
    });

    it("/mod unban successfully revokes ban", async () => {
      const ctx = createContext(
        modActor,
        modGrants,
        {
          user_id: "usr_banned_1",
          reason: "Appeal accepted",
        },
        "unban",
      );

      const result = await router.dispatch("mod", ctx);
      expect(result.ephemeral).toBe(false);
      expect(result.embeds![0]!.title).toContain("UNBAN");
    });

    it("/mod purge performs bulk delete and records audit event", async () => {
      const ctx = createContext(modActor, modGrants, { amount: 25 }, "purge");

      const result = await router.dispatch("mod", ctx);
      expect(result.ephemeral).toBe(true);
      expect(result.embeds![0]!.title).toBe("Safe Purge Executed");
      expect(result.embeds![0]!.description).toContain(
        "purged **25** messages",
      );
    });

    it("/mod slowmode sets rate limit per user", async () => {
      const ctx = createContext(
        modActor,
        modGrants,
        { seconds: 15 },
        "slowmode",
      );

      const result = await router.dispatch("mod", ctx);
      expect(result.ephemeral).toBe(false);
      expect(result.embeds![0]!.description).toContain("set to **15** seconds");
    });

    it("/mod lock and /mod unlock manage channel lockdown state", async () => {
      const lockCtx = createContext(
        modActor,
        modGrants,
        { reason: "Raid incoming" },
        "lock",
      );
      const lockRes = await router.dispatch("mod", lockCtx);
      expect(lockRes.embeds![0]!.title).toBe("Channel Locked");

      const unlockCtx = createContext(
        modActor,
        modGrants,
        { reason: "Raid resolved" },
        "unlock",
      );
      const unlockRes = await router.dispatch("mod", unlockCtx);
      expect(unlockRes.embeds![0]!.title).toBe("Channel Unlocked");
    });

    it("Rejects unauthorized member attempting /mod commands", async () => {
      const ctx = createContext(
        memberActor,
        memberGrants, // lacks moderation capabilities
        { target: "usr_other", reason: "Test" },
        "kick",
      );

      const result = await router.dispatch("mod", ctx);
      expect(result.ephemeral).toBe(true);
      expect(result.embeds![0]!.title).toBe("Moderation Failed");
    });
  });

  describe("/ticket ticketing system", () => {
    it("/ticket open creates ticket record and dedicated discord channel", async () => {
      const ctx = createContext(
        memberActor,
        memberGrants,
        { category: "dispute", subject: "Match 42 dispute" },
        "open",
      );

      const result = await router.dispatch("ticket", ctx);
      expect(result.ephemeral).toBe(true);
      expect(result.embeds![0]!.title).toBe("Support Ticket Created");

      const tickets = await uow.getRepositories().tickets.list({ guildId });
      expect(tickets).toHaveLength(1);
      expect(tickets[0]!.requesterId).toBe("usr_member_1");
      expect(tickets[0]!.status).toBe("open");
    });

    it("/ticket claim and /ticket close transition ticket through state machine", async () => {
      // 1. Open ticket
      const openCtx = createContext(
        memberActor,
        memberGrants,
        { category: "support" },
        "open",
      );
      await router.dispatch("ticket", openCtx);
      const tickets = await uow.getRepositories().tickets.list({ guildId });
      const ticketId = tickets[0]!.id;

      // 2. Mod claims ticket
      const claimCtx = createContext(
        modActor,
        modGrants,
        { ticket_id: ticketId },
        "claim",
      );
      const claimRes = await router.dispatch("ticket", claimCtx);
      expect(claimRes.embeds![0]!.title).toBe("Ticket Claimed");

      const claimedTicket = await uow
        .getRepositories()
        .tickets.getById({ guildId }, ticketId);
      expect(claimedTicket?.assignedUserId).toBe("usr_mod_1");

      // 3. Mod closes ticket
      const closeCtx = createContext(
        modActor,
        modGrants,
        { ticket_id: ticketId, reason: "Resolved issue" },
        "close",
      );
      const closeRes = await router.dispatch("ticket", closeCtx);
      expect(closeRes.embeds![0]!.title).toBe("Ticket Resolved & Closed");

      const closedTicket = await uow
        .getRepositories()
        .tickets.getById({ guildId }, ticketId);
      expect(closedTicket?.status).toBe("resolved");
    });
  });

  describe("/poll polling system", () => {
    it("/poll create, vote, and close with atomic tallies", async () => {
      // 1. Create poll
      const createCtx = createContext(
        modActor,
        modGrants,
        {
          question: "Best FPS map?",
          options: "Dust 2; Mirage; Inferno",
          duration_minutes: 60,
        },
        "create",
      );
      const createRes = await router.dispatch("poll", createCtx);
      expect(createRes.embeds![0]!.title).toContain("Best FPS map?");

      const polls = await uow.getRepositories().polls.list({ guildId });
      expect(polls).toHaveLength(1);
      const pollId = polls[0]!.id;

      // 2. Member votes for option 1
      const voteCtx = createContext(
        memberActor,
        memberGrants,
        { poll_id: pollId, option_index: 1 },
        "vote",
      );
      const voteRes = await router.dispatch("poll", voteCtx);
      expect(voteRes.embeds![0]!.title).toBe("Vote Cast");

      // 3. Duplicate vote fails
      const dupVoteRes = await router.dispatch("poll", voteCtx);
      expect(dupVoteRes.embeds![0]!.title).toBe("Could Not Cast Vote");

      // 4. Mod closes poll
      const closeCtx = createContext(
        modActor,
        modGrants,
        { poll_id: pollId },
        "close",
      );
      const closeRes = await router.dispatch("poll", closeCtx);
      expect(closeRes.embeds![0]!.title).toContain("Poll Closed");
      expect(closeRes.embeds![0]!.description).toContain("Total Votes: **1**");
    });
  });

  describe("/giveaway giveaway system", () => {
    it("/giveaway create, enter, end, and reroll", async () => {
      // 1. Create giveaway
      const createCtx = createContext(
        modActor,
        modGrants,
        {
          prize: "10,000 Apex Coins",
          winner_count: 1,
          duration_minutes: 120,
        },
        "create",
      );
      const createRes = await router.dispatch("giveaway", createCtx);
      expect(createRes.embeds![0]!.title).toContain("10,000 Apex Coins");

      const giveaways = await uow.getRepositories().giveaways.list({ guildId });
      expect(giveaways).toHaveLength(1);
      const giveawayId = giveaways[0]!.id;

      // 2. Member enters giveaway
      const enterCtx = createContext(
        memberActor,
        memberGrants,
        { giveaway_id: giveawayId },
        "enter",
      );
      const enterRes = await router.dispatch("giveaway", enterCtx);
      expect(enterRes.embeds![0]!.title).toContain("Entry Confirmed");

      // 3. Duplicate entry rejected
      const dupEnterRes = await router.dispatch("giveaway", enterCtx);
      expect(dupEnterRes.embeds![0]!.title).toBe("Could Not Enter Giveaway");

      // 4. End giveaway
      const endCtx = createContext(
        modActor,
        modGrants,
        { giveaway_id: giveawayId },
        "end",
      );
      const endRes = await router.dispatch("giveaway", endCtx);
      expect(endRes.embeds![0]!.title).toContain("Giveaway Ended");
      expect(endRes.embeds![0]!.description).toContain("<@usr_member_1>");

      // 5. Reroll giveaway
      const rerollCtx = createContext(
        modActor,
        modGrants,
        { giveaway_id: giveawayId },
        "reroll",
      );
      const rerollRes = await router.dispatch("giveaway", rerollCtx);
      expect(rerollRes.embeds![0]!.title).toContain("Giveaway Rerolled");
    });
  });

  describe("/announce announcement system", () => {
    it("/announce publishes verified announcement and records audit event", async () => {
      const ctx = createContext(modActor, modGrants, {
        title: "Championship Finals This Weekend!",
        content: "Tune in at 6 PM UTC for the grand finals.",
        channel: channelId,
        mention: "none",
      });

      const result = await router.dispatch("announce", ctx);
      expect(result.embeds![0]!.title).toBe("Announcement Published");

      const announcements = await uow
        .getRepositories()
        .announcements.list({ guildId });
      expect(announcements).toHaveLength(1);
      expect(announcements[0]!.title).toBe("Championship Finals This Weekend!");
    });

    it("/announce rejects unauthorized user", async () => {
      const ctx = createContext(memberActor, memberGrants, {
        title: "Hacked",
        content: "Bad message",
      });

      const result = await router.dispatch("announce", ctx);
      expect(result.ephemeral).toBe(true);
      expect(result.embeds![0]!.title).toBe("Announcement Denied");
    });
  });
});
