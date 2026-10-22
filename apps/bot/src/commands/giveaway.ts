import type {
  IBotCommand,
  CommandContext,
  CommandExecutionResult,
} from "../types.js";
import {
  createGiveawayWorkflow,
  enterGiveawayWorkflow,
  endGiveawayWorkflow,
  rerollGiveawayWorkflow,
} from "@nexus/application";
import { evaluateAuthorization } from "@nexus/authorization";
import { GuildCapability } from "@nexus/contracts";

export class GiveawayCommand implements IBotCommand {
  public readonly name = "giveaway";
  public readonly description =
    "Community giveaway system: create giveaways, enter, pick verified winners, and reroll.";

  async execute(ctx: CommandContext): Promise<CommandExecutionResult> {
    const subcommand = ctx.subcommand ?? "list";

    switch (subcommand) {
      case "create":
        return await this.handleCreate(ctx);

      case "enter":
        return await this.handleEnter(ctx);

      case "end":
        return await this.handleEnd(ctx);

      case "reroll":
        return await this.handleReroll(ctx);

      case "list":
        return await this.handleList(ctx);

      default:
        return {
          ephemeral: true,
          embeds: [
            {
              title: "Invalid Subcommand",
              description: `Subcommand \`${subcommand}\` is not supported for /giveaway.`,
              color: 0xed4245,
            },
          ],
        };
    }
  }

  private async handleCreate(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const prize = String(ctx.options.prize ?? "");
    const winnerCount = Number(ctx.options.winner_count ?? 1);
    const durationMinutes = Number(ctx.options.duration_minutes ?? 1440);

    if (!prize) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Missing Prize",
            description: "Please specify the prize for the giveaway.",
            color: 0xed4245,
          },
        ],
      };
    }

    try {
      const giveaway = await createGiveawayWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        correlationId: ctx.correlationId,
        prize,
        winnerCount,
        durationMinutes,
        channelId: ctx.channelId,
      });

      return {
        ephemeral: false,
        embeds: [
          {
            title: `🎉 GIVEAWAY: ${giveaway.prize}`,
            description: `A new giveaway has started!\n\n**Winners:** ${giveaway.winnerCount}\n**Hosted by:** <@${ctx.actor.actorId}>\n\nEnter using \`/giveaway enter giveaway_id:${giveaway.id}\``,
            color: 0xf1c40f,
            fields: [
              {
                name: "Giveaway ID",
                value: `\`${giveaway.id}\``,
                inline: true,
              },
              {
                name: "Ends At",
                value: new Date(giveaway.endsAt).toLocaleString(),
                inline: true,
              },
            ],
          },
        ],
      };
    } catch (err: any) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Failed to Create Giveaway",
            description:
              err.message ?? "An error occurred creating the giveaway.",
            color: 0xed4245,
          },
        ],
      };
    }
  }

  private async handleEnter(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const giveawayId = String(ctx.options.giveaway_id ?? "");
    if (!giveawayId) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Missing Giveaway ID",
            description: "Please specify the giveaway ID you wish to enter.",
            color: 0xed4245,
          },
        ],
      };
    }

    try {
      const result = await enterGiveawayWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        giveawayId,
      });

      return {
        ephemeral: true,
        embeds: [
          {
            title: "Giveaway Entry Confirmed! 🎉",
            description: `You have successfully entered giveaway \`${result.giveawayId}\`. Good luck!`,
            color: 0x57f287,
          },
        ],
      };
    } catch (err: any) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Could Not Enter Giveaway",
            description: err.message ?? "Failed to enter giveaway.",
            color: 0xed4245,
          },
        ],
      };
    }
  }

  private async handleEnd(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const giveawayId = String(ctx.options.giveaway_id ?? "");
    if (!giveawayId) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Missing Giveaway ID",
            description: "Please specify the giveaway ID to end.",
            color: 0xed4245,
          },
        ],
      };
    }

    try {
      const { giveaway, winners } = await endGiveawayWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        correlationId: ctx.correlationId,
        giveawayId,
      });

      const winnersMention =
        winners.length > 0
          ? winners.map((w: string) => `<@${w}>`).join(", ")
          : "*No eligible entries*";

      return {
        ephemeral: false,
        embeds: [
          {
            title: `🎉 Giveaway Ended: ${giveaway.prize}`,
            description: `Congratulations to the winner(s):\n${winnersMention}`,
            color: 0x57f287,
            fields: [
              {
                name: "Giveaway ID",
                value: `\`${giveaway.id}\``,
                inline: true,
              },
              { name: "Status", value: "ENDED", inline: true },
            ],
          },
        ],
      };
    } catch (err: any) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Failed to End Giveaway",
            description: err.message ?? "Could not conclude giveaway.",
            color: 0xed4245,
          },
        ],
      };
    }
  }

  private async handleReroll(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const giveawayId = String(ctx.options.giveaway_id ?? "");
    if (!giveawayId) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Missing Giveaway ID",
            description: "Please specify the giveaway ID to reroll.",
            color: 0xed4245,
          },
        ],
      };
    }

    try {
      const { giveaway, newWinners } = await rerollGiveawayWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        correlationId: ctx.correlationId,
        giveawayId,
      });

      const winnersMention =
        newWinners.length > 0
          ? newWinners.map((w: string) => `<@${w}>`).join(", ")
          : "*No eligible entries*";

      return {
        ephemeral: false,
        embeds: [
          {
            title: `🎲 Giveaway Rerolled: ${giveaway.prize}`,
            description: `New winner(s) picked:\n${winnersMention}`,
            color: 0x5865f2,
            fields: [
              {
                name: "Giveaway ID",
                value: `\`${giveaway.id}\``,
                inline: true,
              },
            ],
          },
        ],
      };
    } catch (err: any) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Failed to Reroll Giveaway",
            description: err.message ?? "Could not reroll giveaway winner.",
            color: 0xed4245,
          },
        ],
      };
    }
  }

  private async handleList(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const decision = evaluateAuthorization(
      {
        actor: ctx.actor,
        capability: GuildCapability.GiveawayCreate,
        targetRealm: "guild",
        targetGuildId: ctx.guildId,
      },
      ctx.grants,
    );

    if (!decision.allowed) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Access Denied",
            description: "You lack permission to list giveaways.",
            color: 0xed4245,
          },
        ],
      };
    }

    const giveaways = await ctx.uow
      .getRepositories()
      .giveaways.list(ctx.tenant, "active");

    if (giveaways.length === 0) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Giveaways",
            description: "No active giveaways found in this server.",
            color: 0x5865f2,
          },
        ],
      };
    }

    const listText = giveaways
      .slice(0, 10)
      .map(
        (g) =>
          `• **${g.prize}** (\`${g.id}\`): ends ${new Date(g.endsAt).toLocaleDateString()}`,
      )
      .join("\n");

    return {
      ephemeral: true,
      embeds: [
        {
          title: "Active Server Giveaways",
          description: listText,
          color: 0x5865f2,
        },
      ],
    };
  }

  toSlashCommandData(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      dm_permission: false,
      options: [
        {
          name: "create",
          description: "Create a new giveaway.",
          type: 1, // SUB_COMMAND
          options: [
            {
              name: "prize",
              description: "Prize item or reward",
              type: 3,
              required: true,
            },
            {
              name: "winner_count",
              description: "Number of winners (default 1)",
              type: 4,
              required: false,
            },
            {
              name: "duration_minutes",
              description: "Duration in minutes (default 1440 = 24h)",
              type: 4,
              required: false,
            },
          ],
        },
        {
          name: "enter",
          description: "Enter an ongoing giveaway.",
          type: 1,
          options: [
            {
              name: "giveaway_id",
              description: "ID of giveaway to enter",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "end",
          description: "End an active giveaway and pick winner(s).",
          type: 1,
          options: [
            {
              name: "giveaway_id",
              description: "ID of giveaway to end",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "reroll",
          description: "Reroll a giveaway to pick new winner(s).",
          type: 1,
          options: [
            {
              name: "giveaway_id",
              description: "ID of giveaway to reroll",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "list",
          description: "List all active giveaways.",
          type: 1,
        },
      ],
    };
  }
}
