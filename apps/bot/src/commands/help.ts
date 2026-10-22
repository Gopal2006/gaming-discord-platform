import type {
  IBotCommand,
  CommandContext,
  CommandExecutionResult,
} from "../types.js";

export class HelpCommand implements IBotCommand {
  public readonly name = "help";
  public readonly description =
    "Contextual documentation and commands reference for Nexus.";

  async execute(_ctx: CommandContext): Promise<CommandExecutionResult> {
    return {
      ephemeral: true,
      embeds: [
        {
          title: "Nexus Platform Command Guide",
          description:
            "Nexus is a secure, multi-tenant gaming and esports automation platform for Discord.",
          color: 0x5865f2,
          fields: [
            {
              name: "🛠️ Setup & Maintenance",
              value:
                "`/setup start` — Initialize required channels and settings.\n`/setup status` — Verify channel and integration health.\n`/setup repair` — Safely restore missing channels.\n`/diagnostics` — Inspect permissions and role hierarchy.",
              inline: false,
            },
            {
              name: "⚙️ Configuration",
              value:
                "`/config view` — Inspect server settings and active modules.\n`/status` — View bot runtime latency and connectivity.",
              inline: false,
            },
            {
              name: "🛡️ Action-Safety & Tenancy",
              value:
                "All server mutations are governed by internal policy checks, role hierarchy enforcement, bulk limits, and emergency kill-switches.",
              inline: false,
            },
          ],
          footer: { text: "Nexus • Gaming & Esports Platform" },
        },
      ],
    };
  }

  toSlashCommandData(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      dm_permission: true,
    };
  }
}
