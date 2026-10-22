import type {
  IBotCommand,
  CommandContext,
  CommandExecutionResult,
} from "./types.js";

export class CommandRouter {
  private readonly commands = new Map<string, IBotCommand>();

  register(command: IBotCommand): void {
    this.commands.set(command.name, command);
  }

  get(name: string): IBotCommand | undefined {
    return this.commands.get(name);
  }

  list(): readonly IBotCommand[] {
    return Array.from(this.commands.values());
  }

  async dispatch(
    commandName: string,
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const cmd = this.commands.get(commandName);
    if (!cmd) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Unknown Command",
            description: `Command \`/${commandName}\` is not recognized.`,
            color: 0xed4245,
          },
        ],
      };
    }

    return await cmd.execute(ctx);
  }

  toSlashCommandsData(): Record<string, unknown>[] {
    return this.list().map((cmd) => cmd.toSlashCommandData());
  }
}
