import type {
  IBotCommand,
  CommandContext,
  CommandExecutionResult,
} from "../types.js";
import { createAnnouncementWorkflow } from "@nexus/application";

export class AnnouncementCommand implements IBotCommand {
  public readonly name = "announce";
  public readonly description =
    "Publish verified announcements with policy checks, mention guards, and audit trail.";

  async execute(ctx: CommandContext): Promise<CommandExecutionResult> {
    const channelId = String(ctx.options.channel ?? ctx.channelId);
    const title = String(ctx.options.title ?? "");
    const content = String(ctx.options.content ?? "");
    const mention = String(ctx.options.mention ?? "none");

    if (!title || !content) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Missing Fields",
            description: "Announcement requires both a `title` and `content`.",
            color: 0xed4245,
          },
        ],
      };
    }

    const allowEveryone = mention === "everyone";
    const allowHere = mention === "here";

    try {
      const announcement = await createAnnouncementWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        correlationId: ctx.correlationId,
        data: {
          id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          channelId,
          title,
          content,
          allowEveryone,
          allowHere,
        },
      });

      // Send to destination Discord channel
      let mentionPrefix = "";
      if (allowEveryone) mentionPrefix = "@everyone\n";
      else if (allowHere) mentionPrefix = "@here\n";

      await ctx.discordClient.sendMessage(channelId, {
        content: mentionPrefix ? mentionPrefix : undefined,
        embeds: [
          {
            title: announcement.title,
            description: announcement.content,
            color: 0x5865f2,
            footer: {
              text: `Published by Nexus • Announcement ID: ${announcement.id}`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      });

      return {
        ephemeral: true,
        embeds: [
          {
            title: "Announcement Published",
            description: `Announcement has been sent to <#${channelId}>.`,
            color: 0x57f287,
            fields: [
              {
                name: "Announcement ID",
                value: `\`${announcement.id}\``,
                inline: true,
              },
              {
                name: "Target Channel",
                value: `<#${channelId}>`,
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
            title: "Announcement Denied",
            description: err.message ?? "Failed to publish announcement.",
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
      default_member_permissions: "32", // MANAGE_GUILD
      dm_permission: false,
      options: [
        {
          name: "title",
          description: "Title of the announcement",
          type: 3,
          required: true,
        },
        {
          name: "content",
          description: "Body text / message content",
          type: 3,
          required: true,
        },
        {
          name: "channel",
          description: "Destination channel (defaults to current channel)",
          type: 7,
          required: false,
        },
        {
          name: "mention",
          description: "Mention level: everyone, here, or none",
          type: 3,
          required: false,
          choices: [
            { name: "none", value: "none" },
            { name: "everyone", value: "everyone" },
            { name: "here", value: "here" },
          ],
        },
      ],
    };
  }
}
