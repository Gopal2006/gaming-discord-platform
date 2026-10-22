import type {
  IBotCommand,
  CommandContext,
  CommandExecutionResult,
} from "../types.js";
import { evaluateActionPolicy } from "@nexus/authorization";
import { GuildCapability } from "@nexus/contracts";

export class ConfigCommand implements IBotCommand {
  public readonly name = "config";
  public readonly description = "Inspect server settings and module states.";

  async execute(ctx: CommandContext): Promise<CommandExecutionResult> {
    const policyDecision = evaluateActionPolicy({
      actor: ctx.actor,
      targetGuildId: ctx.guildId,
      capability: GuildCapability.GuildSettingsView,
      operation: {
        type: "guild.config.view",
        riskLevel: "low",
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
              "You do not have permission to view server configuration.",
            color: 0xed4245,
          },
        ],
      };
    }

    const settings = await ctx.uow
      .getRepositories()
      .guildSettings.getSettings(ctx.tenant);

    return {
      ephemeral: true,
      embeds: [
        {
          title: "Server Configuration",
          description: `Current settings for Guild \`${ctx.guildId}\``,
          color: 0x5865f2,
          fields: [
            {
              name: "Audit Log Channel",
              value: settings?.logChannelId
                ? `<#${settings.logChannelId}>`
                : "*Not set*",
              inline: true,
            },
            {
              name: "Mod-Log Channel",
              value: settings?.modLogChannelId
                ? `<#${settings.modLogChannelId}>`
                : "*Not set*",
              inline: true,
            },
            {
              name: "Welcome Channel",
              value: settings?.welcomeChannelId
                ? `<#${settings.welcomeChannelId}>`
                : "*Not set*",
              inline: true,
            },
            {
              name: "Welcome Template",
              value: settings?.welcomeMessageTemplate
                ? `\`${settings.welcomeMessageTemplate}\``
                : "*Default*",
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
          name: "view",
          description: "View current server settings.",
          type: 1, // SUB_COMMAND
        },
      ],
    };
  }
}
