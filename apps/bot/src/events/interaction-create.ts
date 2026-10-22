import type { Interaction } from "discord.js";
import type { IUnitOfWork } from "@nexus/database";
import type { IDiscordRestClient } from "@nexus/discord-adapter";
import type { CommandRouter } from "../router.js";
import { DiscordInteractionResponder } from "../acknowledgement.js";
import type { ActorContext, PermissionGrant } from "@nexus/authorization";

export async function onInteractionCreate(
  interaction: Interaction,
  router: CommandRouter,
  uow: IUnitOfWork,
  discordClient: IDiscordRestClient,
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const responder = new DiscordInteractionResponder(interaction);
  const correlationId = `int_${interaction.id}`;

  try {
    // 1. Defer early to guarantee acknowledgement within 3 seconds
    await responder.defer(true);

    const guildId = interaction.guildId;
    if (!guildId) {
      await responder.respond({
        ephemeral: true,
        content: "Nexus commands can only be executed within a Discord server.",
      });
      return;
    }

    // 2. Resolve Actor Context
    const member = interaction.member;
    const isOwner = interaction.guild?.ownerId === interaction.user.id;
    const roleIds: string[] = [];
    let actorRolePosition = 0;

    if (
      member &&
      "roles" in member &&
      member.roles &&
      "cache" in member.roles
    ) {
      for (const [id, role] of member.roles.cache) {
        roleIds.push(id);
        if (role.position > actorRolePosition) {
          actorRolePosition = role.position;
        }
      }
    }

    const actor: ActorContext = {
      actorId: interaction.user.id,
      actorType: "user",
      realm: "guild",
      guildId,
      roleIds,
      actorRolePosition,
      isGuildOwner: isOwner,
    };

    // 3. Resolve Grants (Owner preset grant)
    const grants: PermissionGrant[] = [];
    if (isOwner) {
      grants.push({
        id: `grant_owner_${interaction.user.id}_${guildId}`,
        principalType: "guild_owner",
        principalId: interaction.user.id,
        realm: "guild",
        guildId,
        capability: "*",
        effect: "allow",
      });
    }

    // 4. Resolve Bot Permissions in Guild
    const botMember = interaction.guild?.members.me;
    const botPermissions = botMember?.permissions.bitfield ?? 0n;
    const botRolePosition = botMember?.roles.highest.position ?? 0;

    // 5. Parse Options and Subcommand
    const subcommand = interaction.options.getSubcommand(false) ?? undefined;
    const subcommandGroup =
      interaction.options.getSubcommandGroup(false) ?? undefined;

    const options: Record<string, unknown> = {};
    const extractOptions = (data: readonly any[]) => {
      for (const item of data) {
        if (item.value !== undefined) {
          options[item.name] = item.value;
        }
        if (item.options && Array.isArray(item.options)) {
          extractOptions(item.options);
        }
      }
    };
    extractOptions(interaction.options.data);

    // 6. Dispatch via CommandRouter
    const result = await router.dispatch(interaction.commandName, {
      guildId,
      channelId: interaction.channelId,
      actor,
      tenant: { guildId },
      grants,
      botPermissions,
      botRolePosition,
      correlationId,
      uow,
      discordClient,
      options,
      subcommand,
      subcommandGroup,
    });

    // 7. Respond
    await responder.respond(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    await responder.fail(message, true);
  }
}
