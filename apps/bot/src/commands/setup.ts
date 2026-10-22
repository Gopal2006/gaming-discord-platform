import type {
  IBotCommand,
  CommandContext,
  CommandExecutionResult,
} from "../types.js";
import { GuildSetupService } from "@nexus/discord-adapter";
import { evaluateActionPolicy } from "@nexus/authorization";
import { GuildCapability } from "@nexus/contracts";

export class SetupCommand implements IBotCommand {
  public readonly name = "setup";
  public readonly description =
    "Guided guild setup, status verification, and safe channel repair.";

  async execute(ctx: CommandContext): Promise<CommandExecutionResult> {
    const subcommand = ctx.subcommand ?? "status";

    // 1. Authorize Action via ActionPolicyEngine
    const isMutation = subcommand === "start" || subcommand === "repair";
    const capability = isMutation
      ? GuildCapability.GuildSettingsEdit
      : GuildCapability.GuildSettingsView;

    const policyDecision = evaluateActionPolicy({
      actor: ctx.actor,
      targetGuildId: ctx.guildId,
      capability,
      operation: {
        type: `guild.setup.${subcommand}`,
        riskLevel: isMutation ? "medium" : "low",
        isDestructive: false,
      },
      grants: ctx.grants,
      botPermissions: {
        rawBitfield: ctx.botPermissions,
        botRolePosition: ctx.botRolePosition,
      },
    });

    if (!policyDecision.allowed) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Access Denied",
            description:
              policyDecision.message ??
              "You are not authorized to manage guild setup.",
            color: 0xed4245,
          },
        ],
      };
    }

    const setupService = new GuildSetupService(ctx.uow, ctx.discordClient);

    // 2. Handle Subcommands
    if (subcommand === "start") {
      const result = await setupService.runSetup(
        ctx.tenant,
        ctx.actor,
        ctx.correlationId,
      );

      const description = result.isNewSetup
        ? "✅ Initial guild setup completed successfully! Standard channels have been provisioned."
        : "ℹ️ Guild setup is already initialized. Verified existing channels and settings without duplication.";

      return {
        ephemeral: true,
        embeds: [
          {
            title: "Guild Setup Complete",
            description,
            color: 0x57f287,
            fields: [
              {
                name: "Audit Log Channel",
                value: `<#${result.logChannel.id}> (\`${result.logChannel.name}\`)`,
                inline: true,
              },
              {
                name: "Moderation Log Channel",
                value: `<#${result.modLogChannel.id}> (\`${result.modLogChannel.name}\`)`,
                inline: true,
              },
              {
                name: "Provisioned Channels",
                value:
                  result.createdChannels.length > 0
                    ? result.createdChannels
                        .map((c) => `• \`#${c}\``)
                        .join("\n")
                    : "*None (reused existing channels)*",
                inline: false,
              },
            ],
            footer: { text: "Nexus Setup • Idempotent & Reconciled" },
          },
        ],
      };
    }

    if (subcommand === "repair") {
      const result = await setupService.runRepair(
        ctx.tenant,
        ctx.actor,
        ctx.correlationId,
      );

      const description =
        result.repairedChannels.length > 0
          ? `🔧 Recreated missing channel(s): ${result.repairedChannels.map((c) => `\`#${c}\``).join(", ")}. Intact channels were untouched.`
          : "✅ All configured channels are intact and healthy. No repair needed.";

      return {
        ephemeral: true,
        embeds: [
          {
            title: "Guild Repair Status",
            description,
            color: 0x5865f2,
            fields: [
              {
                name: "Audit Log Channel",
                value: `<#${result.logChannel.id}>`,
                inline: true,
              },
              {
                name: "Moderation Log Channel",
                value: `<#${result.modLogChannel.id}>`,
                inline: true,
              },
            ],
          },
        ],
      };
    }

    // Default: 'status'
    const settings = await ctx.uow
      .getRepositories()
      .guildSettings.getSettings(ctx.tenant);

    return {
      ephemeral: true,
      embeds: [
        {
          title: "Guild Setup Status",
          description: settings
            ? "Nexus is configured and active in this server."
            : "⚠️ Guild setup has not been run yet. Use `/setup start` to initialize.",
          color: settings ? 0x5865f2 : 0xfee75c,
          fields: [
            {
              name: "Audit Log Channel",
              value: settings?.logChannelId
                ? `<#${settings.logChannelId}>`
                : "*Not configured*",
              inline: true,
            },
            {
              name: "Mod-Log Channel",
              value: settings?.modLogChannelId
                ? `<#${settings.modLogChannelId}>`
                : "*Not configured*",
              inline: true,
            },
            {
              name: "Emergency Stop",
              value: settings?.isEmergencyStopped
                ? `🚨 **ACTIVE** (${settings.emergencyStopReason ?? "No reason given"})`
                : "✅ Inactive (Normal Operations)",
              inline: false,
            },
          ],
        },
      ],
    };
  }

  toSlashCommandData(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      default_member_permissions: "32", // MANAGE_GUILD
      dm_permission: false,
      options: [
        {
          name: "start",
          description: "Initialize guild settings and log channels safely.",
          type: 1, // SUB_COMMAND
        },
        {
          name: "status",
          description: "Check current guild setup and channel configuration.",
          type: 1,
        },
        {
          name: "repair",
          description:
            "Safely recreate missing channels without duplicating existing ones.",
          type: 1,
        },
      ],
    };
  }
}
