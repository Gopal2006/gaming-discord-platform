import type { ActorContext, PermissionGrant } from "@nexus/authorization";
import type { TenantContext, IUnitOfWork } from "@nexus/database";
import type { IDiscordRestClient, DiscordEmbed } from "@nexus/discord-adapter";

export interface CommandContext {
  guildId: string;
  channelId: string;
  actor: ActorContext;
  tenant: TenantContext;
  grants: readonly PermissionGrant[];
  botPermissions: bigint;
  botRolePosition: number;
  correlationId: string;
  uow: IUnitOfWork;
  discordClient: IDiscordRestClient;
  options: Record<string, unknown>;
  subcommand?: string;
  subcommandGroup?: string;
}

export interface CommandExecutionResult {
  ephemeral?: boolean;
  content?: string;
  embeds?: DiscordEmbed[];
}

export interface IBotCommand {
  readonly name: string;
  readonly description: string;
  execute(ctx: CommandContext): Promise<CommandExecutionResult>;
  toSlashCommandData(): Record<string, unknown>;
}
