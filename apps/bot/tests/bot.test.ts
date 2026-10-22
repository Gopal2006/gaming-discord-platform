import { describe, it, expect, beforeEach } from "vitest";
import {
  CommandRouter,
  DiagnosticsCommand,
  SetupCommand,
  HelpCommand,
  StatusCommand,
  ConfigCommand,
  type CommandContext,
  onGuildCreate,
  onGuildDelete,
} from "../src/index.js";
import { FakeDiscordClient } from "@nexus/discord-adapter";
import { InMemoryUnitOfWork } from "@nexus/database";
import {
  DiscordPermissions,
  type ActorContext,
  type PermissionGrant,
} from "@nexus/authorization";

describe("Nexus Bot - Commands, Action Safety, and Gateway Lifecycle", () => {
  let uow: InMemoryUnitOfWork;
  let discordClient: FakeDiscordClient;
  let router: CommandRouter;

  const guildId = "guild_discord_101";

  const ownerActor: ActorContext = {
    actorId: "user_owner_999",
    actorType: "user",
    realm: "guild",
    guildId,
    isGuildOwner: true,
  };

  const memberActor: ActorContext = {
    actorId: "user_member_123",
    actorType: "user",
    realm: "guild",
    guildId,
    roleIds: ["role_regular"],
    isGuildOwner: false,
    actorRolePosition: 5,
  };

  const ownerGrants: PermissionGrant[] = [
    {
      id: "grant_owner",
      principalType: "guild_owner",
      principalId: "user_owner_999",
      realm: "guild",
      guildId,
      capability: "*",
      effect: "allow",
    },
  ];

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    discordClient = new FakeDiscordClient();
    router = new CommandRouter();

    router.register(new DiagnosticsCommand());
    router.register(new SetupCommand());
    router.register(new HelpCommand());
    router.register(new StatusCommand());
    router.register(new ConfigCommand());

    discordClient.addGuild({
      id: guildId,
      name: "Nexus Esports HQ",
      ownerId: "user_owner_999",
      channels: [],
      roles: [],
      botPermissions: DiscordPermissions.ADMINISTRATOR,
      botRolePosition: 99,
    });
  });

  it("Registers all slash commands and formats slash command registration data", () => {
    const commands = router.list();
    expect(commands.map((c) => c.name)).toEqual([
      "diagnostics",
      "setup",
      "help",
      "status",
      "config",
    ]);

    const slashData = router.toSlashCommandsData();
    expect(slashData).toHaveLength(5);
    const setupData = slashData.find((d) => d.name === "setup");
    expect(setupData?.default_member_permissions).toBe("32"); // MANAGE_GUILD
    expect(Array.isArray(setupData?.options)).toBe(true);
  });

  it("/diagnostics reports Administrator status and capability health", async () => {
    const ctx: CommandContext = {
      guildId,
      channelId: "ch_general",
      actor: ownerActor,
      tenant: { guildId },
      grants: ownerGrants,
      botPermissions: DiscordPermissions.ADMINISTRATOR,
      botRolePosition: 99,
      correlationId: "req_diag_1",
      uow,
      discordClient,
      options: {},
    };

    const result = await router.dispatch("diagnostics", ctx);
    expect(result.ephemeral).toBe(true);
    expect(result.embeds).toBeDefined();
    expect(result.embeds![0]!.title).toBe("Nexus System Diagnostics");
    expect(result.embeds![0]!.description).toContain(
      "Administrator permissions (0x8)",
    );

    const modeField = result.embeds![0]!.fields?.find(
      (f) => f.name === "Installation Mode",
    );
    expect(modeField?.value).toContain("Full Administrator Mode");
  });

  it("/diagnostics rejects unauthorized actors without grants", async () => {
    const ctx: CommandContext = {
      guildId,
      channelId: "ch_general",
      actor: memberActor,
      tenant: { guildId },
      grants: [], // No grants
      botPermissions: DiscordPermissions.ADMINISTRATOR,
      botRolePosition: 99,
      correlationId: "req_diag_unauth",
      uow,
      discordClient,
      options: {},
    };

    const result = await router.dispatch("diagnostics", ctx);
    expect(result.ephemeral).toBe(true);
    expect(result.embeds![0]!.title).toBe("Access Denied");
  });

  it("/setup start initializes channels, persists settings, and is idempotent", async () => {
    const ctx: CommandContext = {
      guildId,
      channelId: "ch_general",
      actor: ownerActor,
      tenant: { guildId },
      grants: ownerGrants,
      botPermissions: DiscordPermissions.ADMINISTRATOR,
      botRolePosition: 99,
      correlationId: "req_setup_start_1",
      uow,
      discordClient,
      options: {},
      subcommand: "start",
    };

    // 1st Execution
    const firstRes = await router.dispatch("setup", ctx);
    expect(firstRes.ephemeral).toBe(true);
    expect(firstRes.embeds![0]!.title).toBe("Guild Setup Complete");
    expect(firstRes.embeds![0]!.description).toContain(
      "Initial guild setup completed",
    );
    expect(discordClient.channels.size).toBe(2);

    // 2nd Execution: IDEMPOTENCY CHECK
    const secondRes = await router.dispatch("setup", {
      ...ctx,
      correlationId: "req_setup_start_2",
    });
    expect(secondRes.embeds![0]!.description).toContain("already initialized");
    expect(discordClient.channels.size).toBe(2); // Still 2 channels!
  });

  it("/setup repair restores missing deleted channels safely", async () => {
    const setupCtx: CommandContext = {
      guildId,
      channelId: "ch_general",
      actor: ownerActor,
      tenant: { guildId },
      grants: ownerGrants,
      botPermissions: DiscordPermissions.ADMINISTRATOR,
      botRolePosition: 99,
      correlationId: "req_setup_start",
      uow,
      discordClient,
      options: {},
      subcommand: "start",
    };

    // Run initial setup
    await router.dispatch("setup", setupCtx);
    const settings = await uow
      .getRepositories()
      .guildSettings.getSettings({ guildId });
    const originalModLogId = settings!.modLogChannelId!;

    // Delete log channel
    discordClient.channels.delete(settings!.logChannelId!);

    // Run repair
    const repairRes = await router.dispatch("setup", {
      ...setupCtx,
      subcommand: "repair",
      correlationId: "req_repair_run",
    });

    expect(repairRes.embeds![0]!.title).toBe("Guild Repair Status");
    expect(repairRes.embeds![0]!.description).toContain(
      "Recreated missing channel",
    );
    expect(repairRes.embeds![0]!.description).toContain("nexus-logs");

    // Intact channel was preserved
    const updatedSettings = await uow
      .getRepositories()
      .guildSettings.getSettings({ guildId });
    expect(updatedSettings?.modLogChannelId).toBe(originalModLogId);
  });

  it("/config view returns current server configuration", async () => {
    // Seed settings
    await uow.getRepositories().guildSettings.updateSettings(
      { guildId },
      {
        welcomeChannelId: "ch_welcome_123",
        welcomeMessageTemplate: "Welcome to our esports arena!",
      },
    );

    const ctx: CommandContext = {
      guildId,
      channelId: "ch_general",
      actor: ownerActor,
      tenant: { guildId },
      grants: ownerGrants,
      botPermissions: DiscordPermissions.ADMINISTRATOR,
      botRolePosition: 99,
      correlationId: "req_config_view",
      uow,
      discordClient,
      options: {},
      subcommand: "view",
    };

    const result = await router.dispatch("config", ctx);
    expect(result.embeds![0]!.title).toBe("Server Configuration");
    const welcomeField = result.embeds![0]!.fields?.find(
      (f) => f.name === "Welcome Channel",
    );
    expect(welcomeField?.value).toContain("<#ch_welcome_123>");
  });

  it("/help and /status return operational guides and connectivity status without leaking secrets", async () => {
    const ctx: CommandContext = {
      guildId,
      channelId: "ch_general",
      actor: ownerActor,
      tenant: { guildId },
      grants: ownerGrants,
      botPermissions: DiscordPermissions.ADMINISTRATOR,
      botRolePosition: 99,
      correlationId: "req_general",
      uow,
      discordClient,
      options: {},
    };

    const helpRes = await router.dispatch("help", ctx);
    expect(helpRes.embeds![0]!.title).toBe("Nexus Platform Command Guide");
    expect(JSON.stringify(helpRes)).not.toContain("token");
    expect(JSON.stringify(helpRes)).not.toContain("secret");

    const statusRes = await router.dispatch("status", ctx);
    expect(statusRes.embeds![0]!.title).toBe("Nexus System Status");
    expect(
      statusRes.embeds![0]!.fields?.some((f) => f.value.includes("Online")),
    ).toBe(true);
  });

  it("Gateway events: onGuildCreate and onGuildDelete record durable audit events", async () => {
    const mockGuild = {
      id: "guild_gateway_test",
      name: "Gateway Guild",
      ownerId: "user_gateway_owner",
      channels: { cache: new Map() },
      members: { me: null },
    } as any;

    // 1. onGuildCreate
    await onGuildCreate(mockGuild, uow);
    const settings = await uow
      .getRepositories()
      .guildSettings.getSettings({ guildId: "guild_gateway_test" });
    expect(settings).toBeDefined();

    const auditList1 = await uow
      .getRepositories()
      .auditEvents.list({ guildId: "guild_gateway_test" });
    expect(auditList1.some((e) => e.action === "guild.join")).toBe(true);

    // 2. onGuildDelete
    await onGuildDelete(mockGuild, uow);
    const auditList2 = await uow
      .getRepositories()
      .auditEvents.list({ guildId: "guild_gateway_test" });
    expect(auditList2.some((e) => e.action === "guild.leave")).toBe(true);
  });
});
