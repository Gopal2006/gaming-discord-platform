import { Client, GatewayIntentBits } from "discord.js";
import type { IUnitOfWork } from "@nexus/database";
import type { IDiscordRestClient } from "@nexus/discord-adapter";
import { CommandRouter } from "./router.js";
import { DiagnosticsCommand } from "./commands/diagnostics.js";
import { SetupCommand } from "./commands/setup.js";
import { HelpCommand } from "./commands/help.js";
import { StatusCommand } from "./commands/status.js";
import { ConfigCommand } from "./commands/config.js";
import { onGuildCreate } from "./events/guild-create.js";
import { onGuildDelete } from "./events/guild-delete.js";
import { onInteractionCreate } from "./events/interaction-create.js";

export interface BotOptions {
  uow: IUnitOfWork;
  discordClient: IDiscordRestClient;
  router?: CommandRouter;
}

export interface NexusBot {
  readonly client: Client;
  readonly router: CommandRouter;
  start(token: string): Promise<void>;
  stop(): Promise<void>;
}

export function createNexusBot(options: BotOptions): NexusBot {
  const { uow, discordClient } = options;

  // Build Command Router
  const router = options.router ?? new CommandRouter();
  router.register(new DiagnosticsCommand());
  router.register(new SetupCommand());
  router.register(new HelpCommand());
  router.register(new StatusCommand());
  router.register(new ConfigCommand());

  // Instantiate Discord.js Client with minimum intents (P0 requires only Guilds intent)
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.on("guildCreate", (guild) => {
    onGuildCreate(guild, uow).catch(() => {});
  });

  client.on("guildDelete", (guild) => {
    onGuildDelete(guild, uow).catch(() => {});
  });

  client.on("interactionCreate", (interaction) => {
    onInteractionCreate(interaction, router, uow, discordClient).catch(
      () => {},
    );
  });

  return {
    client,
    router,
    async start(token: string) {
      await client.login(token);
    },
    async stop() {
      client.destroy();
    },
  };
}
