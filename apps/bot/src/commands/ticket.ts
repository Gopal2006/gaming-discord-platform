import type {
  IBotCommand,
  CommandContext,
  CommandExecutionResult,
} from "../types.js";
import {
  openTicketWorkflow,
  transitionTicketWorkflow,
} from "@nexus/application";
import { evaluateAuthorization } from "@nexus/authorization";
import { GuildCapability } from "@nexus/contracts";

export class TicketCommand implements IBotCommand {
  public readonly name = "ticket";
  public readonly description =
    "Community ticketing system: open, claim, close, and view transcripts.";

  async execute(ctx: CommandContext): Promise<CommandExecutionResult> {
    const subcommand = ctx.subcommand ?? "open";

    switch (subcommand) {
      case "open":
        return await this.handleOpen(ctx);

      case "claim":
        return await this.handleClaim(ctx);

      case "close":
        return await this.handleClose(ctx);

      case "transcript":
        return await this.handleTranscript(ctx);

      default:
        return {
          ephemeral: true,
          embeds: [
            {
              title: "Invalid Subcommand",
              description: `Subcommand \`${subcommand}\` is not supported for /ticket.`,
              color: 0xed4245,
            },
          ],
        };
    }
  }

  private async handleOpen(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const category = String(ctx.options.category ?? "support");
    const subject = ctx.options.subject
      ? String(ctx.options.subject)
      : undefined;

    try {
      // 1. Run openTicketWorkflow (Authorization, limit checks, DB record, outbox event)
      const ticket = await openTicketWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        correlationId: ctx.correlationId,
        category,
      });

      // 2. Create ticket channel via Discord REST adapter
      const channelName = `ticket-${ticket.ticketNumber}`;
      const channel = await ctx.discordClient.createTicketChannel(ctx.guildId, {
        name: channelName,
        requesterId: ctx.actor.actorId,
      });

      return {
        ephemeral: true,
        embeds: [
          {
            title: "Support Ticket Created",
            description: `Ticket **#${ticket.ticketNumber}** has been opened successfully.`,
            color: 0x57f287,
            fields: [
              { name: "Ticket ID", value: `\`${ticket.id}\``, inline: true },
              { name: "Category", value: ticket.category, inline: true },
              { name: "Channel", value: `<#${channel.id}>`, inline: true },
              ...(subject
                ? [{ name: "Subject", value: subject, inline: false }]
                : []),
            ],
          },
        ],
      };
    } catch (err: any) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Could Not Open Ticket",
            description:
              err.message ?? "An error occurred while creating your ticket.",
            color: 0xed4245,
          },
        ],
      };
    }
  }

  private async handleClaim(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const ticketId = String(ctx.options.ticket_id ?? "");
    if (!ticketId) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Missing Ticket ID",
            description: "Please specify the ticket ID to claim.",
            color: 0xed4245,
          },
        ],
      };
    }

    try {
      const ticket = await transitionTicketWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        correlationId: ctx.correlationId,
        ticketId,
        action: "claim",
      });

      // Update assignee in repository
      await ctx.uow.runInTransaction(async (repos) => {
        await repos.tickets.updateAssignee(
          ctx.tenant,
          ticketId,
          ctx.actor.actorId,
        );
      });

      return {
        ephemeral: false,
        embeds: [
          {
            title: "Ticket Claimed",
            description: `Ticket **#${ticket.ticketNumber}** (\`${ticket.id}\`) has been claimed by <@${ctx.actor.actorId}>.`,
            color: 0x5865f2,
          },
        ],
      };
    } catch (err: any) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Failed to Claim Ticket",
            description:
              err.message ?? "An error occurred while claiming the ticket.",
            color: 0xed4245,
          },
        ],
      };
    }
  }

  private async handleClose(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const ticketId = String(ctx.options.ticket_id ?? "");
    const reason = ctx.options.reason
      ? String(ctx.options.reason)
      : "Resolved by staff";

    if (!ticketId) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Missing Ticket ID",
            description: "Please specify the ticket ID to close.",
            color: 0xed4245,
          },
        ],
      };
    }

    try {
      const ticket = await transitionTicketWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        correlationId: ctx.correlationId,
        ticketId,
        action: "resolve",
      });

      // Fetch messages for transcript capture
      let messageCount = 0;
      try {
        const messages = await ctx.discordClient.fetchChannelMessages(
          ctx.channelId,
          100,
        );
        messageCount = messages.length;
      } catch {
        // Channel may not be current channel or already deleted
      }

      return {
        ephemeral: false,
        embeds: [
          {
            title: "Ticket Resolved & Closed",
            description: `Ticket **#${ticket.ticketNumber}** has been marked as resolved.\n**Reason:** ${reason}`,
            color: 0x57f287,
            fields: [
              { name: "Ticket ID", value: `\`${ticket.id}\``, inline: true },
              { name: "Status", value: "RESOLVED", inline: true },
              {
                name: "Captured Messages",
                value: `${messageCount}`,
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
            title: "Failed to Close Ticket",
            description:
              err.message ?? "An error occurred while closing the ticket.",
            color: 0xed4245,
          },
        ],
      };
    }
  }

  private async handleTranscript(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const ticketId = String(ctx.options.ticket_id ?? "");
    if (!ticketId) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Missing Ticket ID",
            description: "Please specify the ticket ID to view transcript.",
            color: 0xed4245,
          },
        ],
      };
    }

    const decision = evaluateAuthorization(
      {
        actor: ctx.actor,
        capability: GuildCapability.TicketView,
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
            description: "You are not authorized to view ticket transcripts.",
            color: 0xed4245,
          },
        ],
      };
    }

    const ticket = await ctx.uow
      .getRepositories()
      .tickets.getById(ctx.tenant, ticketId);
    if (!ticket) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Ticket Not Found",
            description: `Ticket with ID \`${ticketId}\` could not be found.`,
            color: 0xed4245,
          },
        ],
      };
    }

    return {
      ephemeral: true,
      embeds: [
        {
          title: `Ticket Transcript — #${ticket.ticketNumber}`,
          description: `Archived metadata and activity record for Ticket \`${ticket.id}\``,
          color: 0x5865f2,
          fields: [
            {
              name: "Requester",
              value: `<@${ticket.requesterId}>`,
              inline: true,
            },
            { name: "Category", value: ticket.category, inline: true },
            {
              name: "Status",
              value: ticket.status.toUpperCase(),
              inline: true,
            },
            {
              name: "Assignee",
              value: ticket.assignedUserId
                ? `<@${ticket.assignedUserId}>`
                : "*Unassigned*",
              inline: true,
            },
            {
              name: "Created At",
              value: new Date(ticket.createdAt).toLocaleString(),
              inline: true,
            },
            {
              name: "Closed At",
              value: ticket.closedAt
                ? new Date(ticket.closedAt).toLocaleString()
                : "*Open*",
              inline: true,
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
      dm_permission: false,
      options: [
        {
          name: "open",
          description: "Open a new support ticket.",
          type: 1, // SUB_COMMAND
          options: [
            {
              name: "category",
              description:
                "Category (e.g. general, tournament, dispute, report)",
              type: 3,
              required: false,
            },
            {
              name: "subject",
              description: "Brief summary or issue description",
              type: 3,
              required: false,
            },
          ],
        },
        {
          name: "claim",
          description: "Staff: Claim an open ticket.",
          type: 1,
          options: [
            {
              name: "ticket_id",
              description: "ID of ticket to claim",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "close",
          description: "Close and resolve an active ticket.",
          type: 1,
          options: [
            {
              name: "ticket_id",
              description: "ID of ticket to close",
              type: 3,
              required: true,
            },
            {
              name: "reason",
              description: "Reason for closing ticket",
              type: 3,
              required: false,
            },
          ],
        },
        {
          name: "transcript",
          description: "View ticket archive details.",
          type: 1,
          options: [
            {
              name: "ticket_id",
              description: "ID of ticket",
              type: 3,
              required: true,
            },
          ],
        },
      ],
    };
  }
}
