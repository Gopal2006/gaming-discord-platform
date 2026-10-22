import type {
  IBotCommand,
  CommandContext,
  CommandExecutionResult,
} from "../types.js";
import { runGuildDiagnostics } from "@nexus/discord-adapter";
import { evaluateActionPolicy } from "@nexus/authorization";
import { GuildCapability } from "@nexus/contracts";

export class DiagnosticsCommand implements IBotCommand {
  public readonly name = "diagnostics";
  public readonly description =
    "Inspect bot permissions, role hierarchy status, and feature health.";

  async execute(ctx: CommandContext): Promise<CommandExecutionResult> {
    // 1. Evaluate Action Policy
    const policyDecision = evaluateActionPolicy({
      actor: ctx.actor,
      targetGuildId: ctx.guildId,
      capability: GuildCapability.GuildDiagnosticsView,
      operation: {
        type: "diagnostics.view",
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
              "You do not have permission to view diagnostics.",
            color: 0xed4245, // Red
          },
        ],
      };
    }

    // 2. Generate Diagnostics Report
    const report = runGuildDiagnostics(ctx.botPermissions, ctx.botRolePosition);

    const fields = [
      {
        name: "Installation Mode",
        value: report.hasAdministrator
          ? "🛡️ **Full Administrator Mode (0x8)**\nAll feature transport requirements satisfied."
          : "🔒 **Restricted Granular Mode**\nRunning with specific permission bitset.",
        inline: true,
      },
      {
        name: "Bot Role Position",
        value: `Hierarchy level: **#${report.botRolePosition}**`,
        inline: true,
      },
      {
        name: "Capability Health",
        value: `${report.satisfiedCount} / ${report.totalCapabilities} capabilities operational (${Math.round((report.satisfiedCount / report.totalCapabilities) * 100)}%)`,
        inline: false,
      },
    ];

    if (report.missingPermissionsSet.length > 0) {
      fields.push({
        name: "⚠️ Missing Discord Permissions",
        value: report.missingPermissionsSet.map((p) => `• \`${p}\``).join("\n"),
        inline: false,
      });
    }

    return {
      ephemeral: true, // Diagnostics are ephemeral to avoid cluttering channels
      embeds: [
        {
          title: "Nexus System Diagnostics",
          description: report.summary,
          color: report.isFullyOperational ? 0x57f287 : 0xfee75c, // Green or Yellow
          fields,
          footer: { text: "Nexus Action-Safety Engine • v0.1.0" },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  toSlashCommandData(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      default_member_permissions: "32", // MANAGE_GUILD (0x20)
      dm_permission: false,
    };
  }
}
