import type {
  IUnitOfWork,
  TenantContext,
  GuildSettingsRecord,
} from "@nexus/database";
import type { IDiscordRestClient, DiscordChannel } from "./types.js";
import type { ActorContext } from "@nexus/authorization";
import type { GuildId } from "@nexus/contracts";

export interface SetupGuildOptions {
  uow: IUnitOfWork;
  discordClient: IDiscordRestClient;
  tenant: TenantContext;
  actor: ActorContext;
  correlationId: string;
}

export interface SetupResult {
  settings: GuildSettingsRecord;
  logChannel: DiscordChannel;
  modLogChannel: DiscordChannel;
  createdChannels: string[];
  repairedChannels: string[];
  isNewSetup: boolean;
}

export class GuildSetupService {
  constructor(
    private readonly uow: IUnitOfWork,
    private readonly discordClient: IDiscordRestClient,
  ) {}

  /**
   * Idempotent guild setup:
   * Ensures #nexus-logs and #nexus-mod-logs exist on Discord and in guild_settings.
   * If existing channels are valid, reuses them.
   */
  async runSetup(
    tenant: TenantContext,
    actor: ActorContext,
    correlationId: string,
  ): Promise<SetupResult> {
    const existing = await this.uow
      .getRepositories()
      .guildSettings.getSettings(tenant);

    const createdChannels: string[] = [];
    const repairedChannels: string[] = [];

    let logChannel: DiscordChannel | null = null;
    let modLogChannel: DiscordChannel | null = null;

    // 1. Verify or create Log Channel
    if (existing?.logChannelId) {
      logChannel = await this.discordClient.getChannel(existing.logChannelId);
    }
    if (!logChannel) {
      logChannel = await this.discordClient.createChannel(tenant.guildId, {
        name: "nexus-logs",
        type: "text",
        topic: "Durable operational audit and event logs managed by Nexus.",
      });
      createdChannels.push("nexus-logs");
    }

    // 2. Verify or create Mod-Log Channel
    if (existing?.modLogChannelId) {
      modLogChannel = await this.discordClient.getChannel(
        existing.modLogChannelId,
      );
    }
    if (!modLogChannel) {
      modLogChannel = await this.discordClient.createChannel(tenant.guildId, {
        name: "nexus-mod-logs",
        type: "text",
        topic: "Moderation case logs and incident records managed by Nexus.",
      });
      createdChannels.push("nexus-mod-logs");
    }

    // 3. Persist settings and audit record transactionally
    const updated = await this.uow.runInTransaction(async (repos) => {
      const settings = await repos.guildSettings.updateSettings(tenant, {
        logChannelId: logChannel!.id,
        modLogChannelId: modLogChannel!.id,
        welcomeChannelId: existing?.welcomeChannelId ?? null,
        welcomeMessageTemplate:
          existing?.welcomeMessageTemplate ?? "Welcome {user} to {server}!",
      });

      await repos.auditEvents.record({
        eventId: `aud_setup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        realm: "guild",
        guildId: tenant.guildId as GuildId,
        actorId: actor.actorId,
        actorType: actor.actorType,
        action: "guild.settings.edit",
        resourceType: "guild_setup",
        resourceId: tenant.guildId,
        outcome: "success",
        reason: existing
          ? "Guild setup verified/repaired"
          : "Initial guild setup completed",
        correlationId,
        occurredAt: new Date().toISOString(),
        details: {
          createdChannels,
          repairedChannels,
          logChannelId: logChannel!.id,
          modLogChannelId: modLogChannel!.id,
        },
      });

      return settings;
    });

    return {
      settings: updated,
      logChannel: logChannel!,
      modLogChannel: modLogChannel!,
      createdChannels,
      repairedChannels,
      isNewSetup: !existing,
    };
  }

  /**
   * Safe repair:
   * Inspects configured channels; if any channel was deleted on Discord, safely recreates only the missing channel.
   */
  async runRepair(
    tenant: TenantContext,
    actor: ActorContext,
    correlationId: string,
  ): Promise<SetupResult> {
    const existing = await this.uow
      .getRepositories()
      .guildSettings.getSettings(tenant);

    const repairedChannels: string[] = [];
    let logChannel: DiscordChannel | null = null;
    let modLogChannel: DiscordChannel | null = null;

    if (existing?.logChannelId) {
      logChannel = await this.discordClient.getChannel(existing.logChannelId);
    }
    if (!logChannel) {
      logChannel = await this.discordClient.createChannel(tenant.guildId, {
        name: "nexus-logs",
        type: "text",
        topic: "Durable operational audit and event logs managed by Nexus.",
      });
      repairedChannels.push("nexus-logs");
    }

    if (existing?.modLogChannelId) {
      modLogChannel = await this.discordClient.getChannel(
        existing.modLogChannelId,
      );
    }
    if (!modLogChannel) {
      modLogChannel = await this.discordClient.createChannel(tenant.guildId, {
        name: "nexus-mod-logs",
        type: "text",
        topic: "Moderation case logs and incident records managed by Nexus.",
      });
      repairedChannels.push("nexus-mod-logs");
    }

    const updated = await this.uow.runInTransaction(async (repos) => {
      const settings = await repos.guildSettings.updateSettings(tenant, {
        logChannelId: logChannel!.id,
        modLogChannelId: modLogChannel!.id,
      });

      await repos.auditEvents.record({
        eventId: `aud_repair_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        realm: "guild",
        guildId: tenant.guildId as GuildId,
        actorId: actor.actorId,
        actorType: actor.actorType,
        action: "guild.settings.edit",
        resourceType: "guild_repair",
        resourceId: tenant.guildId,
        outcome: "success",
        reason: "Repaired missing guild channels",
        correlationId,
        occurredAt: new Date().toISOString(),
        details: {
          repairedChannels,
          logChannelId: logChannel!.id,
          modLogChannelId: modLogChannel!.id,
        },
      });

      return settings;
    });

    return {
      settings: updated,
      logChannel: logChannel!,
      modLogChannel: modLogChannel!,
      createdChannels: [],
      repairedChannels,
      isNewSetup: false,
    };
  }
}
