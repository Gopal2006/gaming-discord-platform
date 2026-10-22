import type {
  IBotCommand,
  CommandContext,
  CommandExecutionResult,
} from "../types.js";
import {
  createPollWorkflow,
  votePollWorkflow,
  closePollWorkflow,
} from "@nexus/application";

export class PollCommand implements IBotCommand {
  public readonly name = "poll";
  public readonly description =
    "Community polling system: create polls, vote atomically, and calculate tallies.";

  async execute(ctx: CommandContext): Promise<CommandExecutionResult> {
    const subcommand = ctx.subcommand ?? "create";

    switch (subcommand) {
      case "create":
        return await this.handleCreate(ctx);

      case "vote":
        return await this.handleVote(ctx);

      case "close":
        return await this.handleClose(ctx);

      default:
        return {
          ephemeral: true,
          embeds: [
            {
              title: "Invalid Subcommand",
              description: `Subcommand \`${subcommand}\` is not supported for /poll.`,
              color: 0xed4245,
            },
          ],
        };
    }
  }

  private async handleCreate(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const question = String(ctx.options.question ?? "");
    const optionsRaw = String(ctx.options.options ?? "");
    const durationMinutes = Number(ctx.options.duration_minutes ?? 1440); // 24h default

    if (!question) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Missing Question",
            description: "Please provide a question for the poll.",
            color: 0xed4245,
          },
        ],
      };
    }

    const options = optionsRaw
      .split(/[,;]/)
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);

    if (options.length < 2) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Invalid Options",
            description:
              "Poll must have at least 2 options (separated by comma or semicolon).",
            color: 0xed4245,
          },
        ],
      };
    }

    try {
      const poll = await createPollWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        correlationId: ctx.correlationId,
        question,
        options,
        channelId: ctx.channelId,
        durationMinutes,
      });

      const optionsList = poll.options
        .map((opt, idx) => `**${idx + 1}.** ${opt}`)
        .join("\n");

      return {
        ephemeral: false,
        embeds: [
          {
            title: `📊 ${poll.question}`,
            description: `${optionsList}\n\n*Vote with \`/poll vote poll_id:${poll.id} option_index:<1-${poll.options.length}>\`*`,
            color: 0x5865f2,
            fields: [
              { name: "Poll ID", value: `\`${poll.id}\``, inline: true },
              {
                name: "Closes At",
                value: poll.closesAt
                  ? new Date(poll.closesAt).toLocaleString()
                  : "Never",
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
            title: "Failed to Create Poll",
            description: err.message ?? "An error occurred creating poll.",
            color: 0xed4245,
          },
        ],
      };
    }
  }

  private async handleVote(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const pollId = String(ctx.options.poll_id ?? "");
    const optionNumber = Number(ctx.options.option_index ?? 0);
    const optionIndex = optionNumber - 1; // 1-indexed to 0-indexed

    if (!pollId || optionNumber < 1) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Invalid Vote Input",
            description:
              "Provide a valid poll ID and option number (starting at 1).",
            color: 0xed4245,
          },
        ],
      };
    }

    try {
      const poll = await votePollWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        correlationId: ctx.correlationId,
        pollId,
        optionIndex,
      });

      return {
        ephemeral: true,
        embeds: [
          {
            title: "Vote Cast",
            description: `Your vote for option **#${optionNumber}** in poll \`${pollId}\` has been recorded.`,
            color: 0x57f287,
          },
        ],
      };
    } catch (err: any) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Could Not Cast Vote",
            description: err.message ?? "Failed to record vote.",
            color: 0xed4245,
          },
        ],
      };
    }
  }

  private async handleClose(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const pollId = String(ctx.options.poll_id ?? "");
    if (!pollId) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Missing Poll ID",
            description: "Please specify the poll ID to close.",
            color: 0xed4245,
          },
        ],
      };
    }

    try {
      const result = await closePollWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        correlationId: ctx.correlationId,
        pollId,
      });

      const { poll, tally } = result;
      const totalVotes = Object.values(tally).reduce(
        (acc: number, count: number) => acc + count,
        0,
      );

      const tallyFields = poll.options.map((opt: string, idx: number) => {
        const votes = tally[idx] ?? 0;
        const pct =
          totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : "0.0";
        return {
          name: `${idx + 1}. ${opt}`,
          value: `${votes} votes (${pct}%)`,
          inline: false,
        };
      });

      return {
        ephemeral: false,
        embeds: [
          {
            title: `📊 Poll Closed: ${poll.question}`,
            description: `Final results for Poll \`${poll.id}\` (Total Votes: **${totalVotes}**)`,
            color: 0x57f287,
            fields: tallyFields,
          },
        ],
      };
    } catch (err: any) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Failed to Close Poll",
            description: err.message ?? "Could not close poll.",
            color: 0xed4245,
          },
        ],
      };
    }
  }

  toSlashCommandData(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      dm_permission: false,
      options: [
        {
          name: "create",
          description: "Create a new community poll.",
          type: 1, // SUB_COMMAND
          options: [
            {
              name: "question",
              description: "Poll question",
              type: 3,
              required: true,
            },
            {
              name: "options",
              description: "Options separated by comma or semicolon",
              type: 3,
              required: true,
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
          name: "vote",
          description: "Vote on an active poll.",
          type: 1,
          options: [
            {
              name: "poll_id",
              description: "ID of the poll",
              type: 3,
              required: true,
            },
            {
              name: "option_index",
              description: "Option number to vote for (e.g. 1, 2, 3)",
              type: 4,
              required: true,
            },
          ],
        },
        {
          name: "close",
          description: "Close an active poll and tally final results.",
          type: 1,
          options: [
            {
              name: "poll_id",
              description: "ID of the poll to close",
              type: 3,
              required: true,
            },
          ],
        },
      ],
    };
  }
}
