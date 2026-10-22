import { describe, it, expect } from "vitest";
import {
  generateInviteUrl,
  calculateGranularBitfield,
  runGuildDiagnostics,
  FakeDiscordClient,
  GuildSetupService,
} from "../src/index.js";
import { DiscordPermissions } from "@nexus/authorization";
import { InMemoryUnitOfWork } from "@nexus/database";

describe("Discord Adapter - Invites, Diagnostics, and Setup Service", () => {
  it("Generates dual installation invite links for Administrator and Granular modes", () => {
    // 1. Administrator mode
    const adminInvite = generateInviteUrl({
      clientId: "123456789012345678",
      mode: "administrator",
    });

    expect(adminInvite.permissionsBitfield).toBe(
      DiscordPermissions.ADMINISTRATOR,
    ); // 8n
    expect(adminInvite.url).toContain("permissions=8");
    expect(adminInvite.url).toContain("client_id=123456789012345678");
    expect(adminInvite.url).toContain("scope=bot+applications.commands");

    // 2. Granular mode
    const granularInvite = generateInviteUrl({
      clientId: "123456789012345678",
      mode: "granular",
      guildId: "guild_target_123",
    });

    const expectedGranularBitfield = calculateGranularBitfield();
    expect(granularInvite.permissionsBitfield).toBe(expectedGranularBitfield);
    expect(granularInvite.url).toContain(
      `permissions=${expectedGranularBitfield.toString()}`,
    );
    expect(granularInvite.url).toContain("guild_id=guild_target_123");
  });

  it("runGuildDiagnostics accurately audits permissions and detects degraded capabilities", () => {
    // Case 1: Bot has Administrator permission
    const adminReport = runGuildDiagnostics(
      DiscordPermissions.ADMINISTRATOR,
      99,
    );
    expect(adminReport.hasAdministrator).toBe(true);
    expect(adminReport.isFullyOperational).toBe(true);
    expect(adminReport.missingCount).toBe(0);
    expect(adminReport.summary).toContain("Administrator permissions (0x8)");

    // Case 2: Bot has full Granular permissions
    const granularBitfield = calculateGranularBitfield();
    const granularReport = runGuildDiagnostics(granularBitfield, 50);
    expect(granularReport.hasAdministrator).toBe(false);
    expect(granularReport.isFullyOperational).toBe(true);
    expect(granularReport.missingCount).toBe(0);
    expect(granularReport.summary).toContain("Restricted Granular Mode");

    // Case 3: Bot lacks required permissions (e.g. only VIEW_CHANNEL and SEND_MESSAGES)
    const degradedBitfield =
      DiscordPermissions.VIEW_CHANNEL | DiscordPermissions.SEND_MESSAGES;
    const degradedReport = runGuildDiagnostics(degradedBitfield, 10);
    expect(degradedReport.hasAdministrator).toBe(false);
    expect(degradedReport.isFullyOperational).toBe(false);
    expect(degradedReport.missingCount).toBeGreaterThan(0);
    expect(degradedReport.missingPermissionsSet).toContain("BAN_MEMBERS");
    expect(degradedReport.missingPermissionsSet).toContain("KICK_MEMBERS");
    expect(degradedReport.missingPermissionsSet).toContain("MANAGE_CHANNELS");
  });

  it("GuildSetupService idempotently creates initial channels and never creates duplicates", async () => {
    const uow = new InMemoryUnitOfWork();
    const discordClient = new FakeDiscordClient();
    const setupService = new GuildSetupService(uow, discordClient);

    const tenant = { guildId: "guild_test_100" };
    const actor = {
      actorId: "user_owner_1",
      actorType: "user" as const,
      realm: "guild" as const,
      guildId: "guild_test_100",
      isGuildOwner: true,
    };

    discordClient.addGuild({
      id: "guild_test_100",
      name: "Test Guild",
      ownerId: "user_owner_1",
      channels: [],
      roles: [],
      botPermissions: DiscordPermissions.ADMINISTRATOR,
      botRolePosition: 90,
    });

    // 1st Run: Creates #nexus-logs and #nexus-mod-logs
    const firstResult = await setupService.runSetup(
      tenant,
      actor,
      "req_setup_1",
    );
    expect(firstResult.isNewSetup).toBe(true);
    expect(firstResult.createdChannels).toContain("nexus-logs");
    expect(firstResult.createdChannels).toContain("nexus-mod-logs");
    expect(discordClient.channels.size).toBe(2);

    // Verify stored settings
    const savedSettings = await uow
      .getRepositories()
      .guildSettings.getSettings(tenant);
    expect(savedSettings?.logChannelId).toBe(firstResult.logChannel.id);
    expect(savedSettings?.modLogChannelId).toBe(firstResult.modLogChannel.id);

    // 2nd Run (IDEMPOTENCY CHECK): Re-running setup must NOT create duplicates
    const secondResult = await setupService.runSetup(
      tenant,
      actor,
      "req_setup_2",
    );
    expect(secondResult.isNewSetup).toBe(false);
    expect(secondResult.createdChannels).toHaveLength(0);
    expect(discordClient.channels.size).toBe(2); // Still exactly 2 channels!
    expect(secondResult.logChannel.id).toBe(firstResult.logChannel.id);
  });

  it("GuildSetupService safely repairs deleted channels without duplicating intact ones", async () => {
    const uow = new InMemoryUnitOfWork();
    const discordClient = new FakeDiscordClient();
    const setupService = new GuildSetupService(uow, discordClient);

    const tenant = { guildId: "guild_test_200" };
    const actor = {
      actorId: "user_owner_2",
      actorType: "user" as const,
      realm: "guild" as const,
      guildId: "guild_test_200",
      isGuildOwner: true,
    };

    discordClient.addGuild({
      id: "guild_test_200",
      name: "Test Guild 2",
      ownerId: "user_owner_2",
      channels: [],
      roles: [],
      botPermissions: DiscordPermissions.ADMINISTRATOR,
      botRolePosition: 90,
    });

    // Run initial setup
    const initial = await setupService.runSetup(tenant, actor, "req_init");
    const intactModLogId = initial.modLogChannel.id;

    // Simulate a user manually deleting the logChannel in Discord
    discordClient.channels.delete(initial.logChannel.id);
    expect(discordClient.channels.has(initial.logChannel.id)).toBe(false);
    expect(discordClient.channels.has(intactModLogId)).toBe(true);

    // Run repair
    const repairResult = await setupService.runRepair(
      tenant,
      actor,
      "req_repair",
    );
    expect(repairResult.repairedChannels).toContain("nexus-logs");
    expect(repairResult.repairedChannels).not.toContain("nexus-mod-logs");

    // Intact channel must be preserved
    expect(repairResult.modLogChannel.id).toBe(intactModLogId);
    expect(repairResult.logChannel.id).not.toBe(initial.logChannel.id);

    // Settings must be updated with the new log channel
    const updatedSettings = await uow
      .getRepositories()
      .guildSettings.getSettings(tenant);
    expect(updatedSettings?.logChannelId).toBe(repairResult.logChannel.id);
    expect(updatedSettings?.modLogChannelId).toBe(intactModLogId);
  });
});
