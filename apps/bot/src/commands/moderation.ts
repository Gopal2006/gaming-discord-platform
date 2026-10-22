import type {
  IBotCommand,
  CommandContext,
  CommandExecutionResult,
} from "../types.js";
import {
  executeModerationWorkflow,
  InMemoryConfirmationService,
  type ModerationActionType,
} from "@nexus/application";
import { evaluateActionPolicy } from "@nexus/authorization";
import {
  GuildCapability,
  type ConfirmationTokenPayload,
} from "@nexus/contracts";

export class ModerationCommand implements IBotCommand {
  public readonly name = "mod";
  public readonly description =
    "Community moderation tools: warn, timeout, kick, ban, unban, history, purge, slowmode, and channel lock.";

  async execute(ctx: CommandContext): Promise<CommandExecutionResult> {
    const subcommand = ctx.subcommand ?? "history";

    switch (subcommand) {
      case "warn":
      case "timeout":
      case "kick":
      case "ban":
      case "unban":
        return await this.handleMemberAction(
          ctx,
          subcommand as ModerationActionType,
        );

      case "history":
        return await this.handleHistory(ctx);

      case "purge":
        return await this.handlePurge(ctx);

      case "slowmode":
        return await this.handleSlowmode(ctx);

      case "lock":
        return await this.handleLock(ctx, true);

      case "unlock":
        return await this.handleLock(ctx, false);

      default:
        return {
          ephemeral: true,
          embeds: [
            {
              title: "Invalid Subcommand",
              description: `Subcommand \`${subcommand}\` is not supported.`,
              color: 0xed4245,
            },
          ],
        };
    }
  }

  private async handleMemberAction(
    ctx: CommandContext,
    action: ModerationActionType,
  ): Promise<CommandExecutionResult> {
    const targetId = String(ctx.options.target ?? ctx.options.user_id ?? "");
    const reason = String(ctx.options.reason ?? "No reason provided");
    const durationMinutes = Number(ctx.options.duration_minutes ?? 0);
    const deleteMessageSeconds = Number(
      ctx.options.delete_message_seconds ?? 0,
    );

    if (!targetId) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Missing Target",
            description: "A valid target user ID must be provided.",
            color: 0xed4245,
          },
        ],
      };
    }

    try {
      // 1. Execute Moderation Workflow (Policy, Hierarchy, and DB Case Record)
      const durationSeconds =
        durationMinutes > 0 ? durationMinutes * 60 : undefined;
      let confirmationToken: ConfirmationTokenPayload | undefined;
      if (ctx.options.confirm !== false) {
        const confirmationService = new InMemoryConfirmationService();
        const { payload } = confirmationService.createToken({
          guildId: ctx.guildId,
          actorId: ctx.actor.actorId,
          operationType: `moderation.${action}`,
          targetFingerprint: targetId,
          ttlSeconds: 60,
        });
        confirmationToken = payload;
      }

      const result = await executeModerationWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        correlationId: ctx.correlationId,
        action,
        target: {
          targetId,
          isGuildOwner: false,
          isBotSelf: false,
          targetRolePosition: Number(ctx.options.target_role_position ?? 0),
        },
        reason,
        durationSeconds,
        botPermissions: {
          rawBitfield: ctx.botPermissions,
          botRolePosition: ctx.botRolePosition,
        },
        confirmationToken,
      });

      // 2. Perform Discord REST Side Effect
      if (action === "timeout") {
        await ctx.discordClient.timeoutMember(
          ctx.guildId,
          targetId,
          durationSeconds ?? 300,
          reason,
        );
      } else if (action === "kick") {
        await ctx.discordClient.kickMember(ctx.guildId, targetId, reason);
      } else if (action === "ban") {
        await ctx.discordClient.banMember(ctx.guildId, targetId, {
          deleteMessageSeconds,
          reason,
        });
      } else if (action === "unban") {
        await ctx.discordClient.unbanMember(ctx.guildId, targetId, reason);
      }

      const caseNumber = result.caseRecord?.caseNumber;
      return {
        ephemeral: false,
        embeds: [
          {
            title: `Moderation Action Applied: ${action.toUpperCase()}`,
            description: `Successfully executed **${action}** on <@${targetId}>.`,
            color: 0x57f287,
            fields: [
              ...(caseNumber
                ? [{ name: "Case #", value: `${caseNumber}`, inline: true }]
                : []),
              {
                name: "Target",
                value: `<@${targetId}> (\`${targetId}\`)`,
                inline: true,
              },
              {
                name: "Moderator",
                value: `<@${ctx.actor.actorId}>`,
                inline: true,
              },
              { name: "Reason", value: reason, inline: false },
              ...(durationMinutes > 0
                ? [
                    {
                      name: "Duration",
                      value: `${durationMinutes} minutes`,
                      inline: true,
                    },
                  ]
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
            title: "Moderation Failed",
            description:
              err.message ?? "An error occurred executing moderation action.",
            color: 0xed4245,
          },
        ],
      };
    }
  }

  private async handleHistory(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const targetId = String(ctx.options.target ?? ctx.options.user_id ?? "");
    if (!targetId) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Missing Target",
            description:
              "Please specify a target user ID to look up case history.",
            color: 0xed4245,
          },
        ],
      };
    }

    const decision = evaluateActionPolicy({
      actor: ctx.actor,
      targetGuildId: ctx.guildId,
      capability: GuildCapability.ModerationCaseView,
      operation: {
        type: "moderation.history.view",
        riskLevel: "low",
        isDestructive: false,
      },
      grants: ctx.grants,
      botPermissions: {
        rawBitfield: ctx.botPermissions,
        botRolePosition: ctx.botRolePosition,
      },
    });

    if (!decision.allowed) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Access Denied",
            description:
              decision.message ??
              "You are not authorized to view moderation history.",
            color: 0xed4245,
          },
        ],
      };
    }

    const cases = await ctx.uow
      .getRepositories()
      .moderationCases.listByTarget(ctx.tenant, targetId);

    if (cases.length === 0) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Moderation History",
            description: `No moderation records found for <@${targetId}>.`,
            color: 0x5865f2,
          },
        ],
      };
    }

    const caseList = cases
      .slice(0, 10)
      .map(
        (c) =>
          `**#${c.caseNumber}** [${c.action.toUpperCase()}] by <@${c.moderatorId}>: ${c.reason} (${new Date(c.createdAt).toLocaleDateString()})`,
      )
      .join("\n");

    return {
      ephemeral: true,
      embeds: [
        {
          title: `Moderation History for User \`${targetId}\``,
          description: `Total recorded cases: **${cases.length}**\n\n${caseList}`,
          color: 0x5865f2,
        },
      ],
    };
  }

  private async handlePurge(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const amount = Number(ctx.options.amount ?? 0);
    const filterUser = ctx.options.filter_user
      ? String(ctx.options.filter_user)
      : undefined;

    if (!amount || amount < 1 || amount > 100) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Invalid Amount",
            description: "Purge amount must be between 1 and 100 messages.",
            color: 0xed4245,
          },
        ],
      };
    }

    try {
      let confirmationToken: ConfirmationTokenPayload | undefined;
      if (ctx.options.confirm !== false) {
        const confirmationService = new InMemoryConfirmationService();
        const { payload } = confirmationService.createToken({
          guildId: ctx.guildId,
          actorId: ctx.actor.actorId,
          operationType: "moderation.purge",
          targetFingerprint: filterUser ?? ctx.channelId,
          ttlSeconds: 60,
        });
        confirmationToken = payload;
      }

      const result = await executeModerationWorkflow(ctx.uow, {
        actor: ctx.actor,
        grants: ctx.grants,
        tenant: ctx.tenant,
        correlationId: ctx.correlationId,
        action: "purge",
        target: {
          targetId: filterUser ?? ctx.channelId,
        },
        bulkCount: amount,
        reason: `Purge ${amount} messages in channel ${ctx.channelId}${filterUser ? ` from user ${filterUser}` : ""}`,
        botPermissions: {
          rawBitfield: ctx.botPermissions,
          botRolePosition: ctx.botRolePosition,
        },
        confirmationToken,
      });

      const deleteResult = await ctx.discordClient.bulkDelete(
        ctx.channelId,
        amount,
      );

      return {
        ephemeral: true,
        embeds: [
          {
            title: "Safe Purge Executed",
            description: `Successfully purged **${deleteResult.deletedCount}** messages in <#${ctx.channelId}>.`,
            color: 0x57f287,
            fields: [
              { name: "Requested", value: `${amount}`, inline: true },
              {
                name: "Deleted",
                value: `${deleteResult.deletedCount}`,
                inline: true,
              },
              ...(filterUser
                ? [
                    {
                      name: "Filtered By User",
                      value: `<@${filterUser}>`,
                      inline: true,
                    },
                  ]
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
            title: "Purge Failed",
            description: err.message ?? "Failed to purge messages.",
            color: 0xed4245,
          },
        ],
      };
    }
  }

  private async handleSlowmode(
    ctx: CommandContext,
  ): Promise<CommandExecutionResult> {
    const seconds = Number(ctx.options.seconds ?? 0);
    if (seconds < 0 || seconds > 21600) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Invalid Slowmode",
            description:
              "Slowmode must be between 0 (disabled) and 21,600 seconds (6 hours).",
            color: 0xed4245,
          },
        ],
      };
    }

    let confirmationToken: ConfirmationTokenPayload | undefined;
    if (ctx.options.confirm !== false) {
      const confirmationService = new InMemoryConfirmationService();
      const { payload } = confirmationService.createToken({
        guildId: ctx.guildId,
        actorId: ctx.actor.actorId,
        operationType: "channel.slowmode.set",
        targetFingerprint: ctx.channelId,
        ttlSeconds: 60,
      });
      confirmationToken = payload;
    }

    const decision = evaluateActionPolicy({
      actor: ctx.actor,
      targetGuildId: ctx.guildId,
      capability: GuildCapability.ModerationLock,
      operation: {
        type: "channel.slowmode.set",
        riskLevel: "medium",
        isDestructive: false,
        target: {
          targetType: "channel",
          targetId: ctx.channelId,
        },
      },
      grants: ctx.grants,
      botPermissions: {
        rawBitfield: ctx.botPermissions,
        botRolePosition: ctx.botRolePosition,
      },
      confirmationToken,
    });

    if (!decision.allowed) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Access Denied",
            description:
              decision.message ??
              "You lack permission to adjust channel slowmode.",
            color: 0xed4245,
          },
        ],
      };
    }

    await ctx.discordClient.setChannelSlowmode(ctx.channelId, seconds);

    await ctx.uow.runInTransaction(async (repos) => {
      await repos.auditEvents.record({
        eventId: `aud_slowmode_${ctx.correlationId}`,
        realm: "guild",
        guildId: ctx.tenant.guildId as any,
        actorId: ctx.actor.actorId,
        actorType: ctx.actor.actorType,
        action: "channel.slowmode.set",
        resourceType: "channel",
        resourceId: ctx.channelId,
        outcome: "success",
        correlationId: ctx.correlationId,
        details: { seconds, channelId: ctx.channelId },
        occurredAt: new Date().toISOString(),
      });
    });

    return {
      ephemeral: false,
      embeds: [
        {
          title: "Slowmode Updated",
          description:
            seconds === 0
              ? `Slowmode disabled in <#${ctx.channelId}>.`
              : `Slowmode in <#${ctx.channelId}> set to **${seconds}** seconds.`,
          color: 0x5865f2,
        },
      ],
    };
  }

  private async handleLock(
    ctx: CommandContext,
    lock: boolean,
  ): Promise<CommandExecutionResult> {
    const reason = String(
      ctx.options.reason ??
        (lock
          ? "Channel locked by moderator"
          : "Channel unlocked by moderator"),
    );

    let confirmationToken: ConfirmationTokenPayload | undefined;
    if (ctx.options.confirm !== false) {
      const confirmationService = new InMemoryConfirmationService();
      const { payload } = confirmationService.createToken({
        guildId: ctx.guildId,
        actorId: ctx.actor.actorId,
        operationType: lock ? "channel.lock" : "channel.unlock",
        targetFingerprint: ctx.channelId,
        ttlSeconds: 60,
      });
      confirmationToken = payload;
    }

    const decision = evaluateActionPolicy({
      actor: ctx.actor,
      targetGuildId: ctx.guildId,
      capability: GuildCapability.ModerationLock,
      operation: {
        type: lock ? "channel.lock" : "channel.unlock",
        riskLevel: "high",
        isDestructive: true,
        target: {
          targetType: "channel",
          targetId: ctx.channelId,
        },
      },
      grants: ctx.grants,
      botPermissions: {
        rawBitfield: ctx.botPermissions,
        botRolePosition: ctx.botRolePosition,
      },
      confirmationToken,
    });

    if (!decision.allowed) {
      return {
        ephemeral: true,
        embeds: [
          {
            title: "Access Denied",
            description:
              decision.message ??
              `You lack permission to ${lock ? "lock" : "unlock"} channels.`,
            color: 0xed4245,
          },
        ],
      };
    }

    if (lock) {
      await ctx.discordClient.lockChannel(ctx.channelId, { reason });
    } else {
      await ctx.discordClient.unlockChannel(ctx.channelId, { reason });
    }

    await ctx.uow.runInTransaction(async (repos) => {
      await repos.auditEvents.record({
        eventId: `aud_lock_${ctx.correlationId}`,
        realm: "guild",
        guildId: ctx.tenant.guildId as any,
        actorId: ctx.actor.actorId,
        actorType: ctx.actor.actorType,
        action: lock ? "channel.lock" : "channel.unlock",
        resourceType: "channel",
        resourceId: ctx.channelId,
        outcome: "success",
        correlationId: ctx.correlationId,
        details: { channelId: ctx.channelId, reason },
        occurredAt: new Date().toISOString(),
      });
    });

    return {
      ephemeral: false,
      embeds: [
        {
          title: lock ? "Channel Locked" : "Channel Unlocked",
          description: lock
            ? `🔒 <#${ctx.channelId}> has been locked. Regular members cannot send messages.\n**Reason:** ${reason}`
            : `🔓 <#${ctx.channelId}> has been unlocked. Normal chat permissions restored.\n**Reason:** ${reason}`,
          color: lock ? 0xed4245 : 0x57f287,
        },
      ],
    };
  }

  toSlashCommandData(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      default_member_permissions: "4", // BAN_MEMBERS | KICK_MEMBERS
      dm_permission: false,
      options: [
        {
          name: "warn",
          description: "Issue a formal moderation warning.",
          type: 1, // SUB_COMMAND
          options: [
            {
              name: "target",
              description: "Target member ID",
              type: 6,
              required: true,
            },
            {
              name: "reason",
              description: "Reason for warning",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "timeout",
          description: "Mute/timeout a member temporarily.",
          type: 1,
          options: [
            {
              name: "target",
              description: "Target member ID",
              type: 6,
              required: true,
            },
            {
              name: "duration_minutes",
              description: "Duration in minutes (e.g. 5, 60, 1440)",
              type: 4,
              required: true,
            },
            {
              name: "reason",
              description: "Reason for timeout",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "kick",
          description: "Kick a member from the server.",
          type: 1,
          options: [
            {
              name: "target",
              description: "Target member ID",
              type: 6,
              required: true,
            },
            {
              name: "reason",
              description: "Reason for kick",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "ban",
          description: "Ban a member from the server.",
          type: 1,
          options: [
            {
              name: "target",
              description: "Target member ID",
              type: 6,
              required: true,
            },
            {
              name: "reason",
              description: "Reason for ban",
              type: 3,
              required: true,
            },
            {
              name: "delete_message_seconds",
              description: "Delete messages from past seconds (0-604800)",
              type: 4,
              required: false,
            },
          ],
        },
        {
          name: "unban",
          description: "Revoke a member ban.",
          type: 1,
          options: [
            {
              name: "user_id",
              description: "User ID to unban",
              type: 3,
              required: true,
            },
            {
              name: "reason",
              description: "Reason for unban",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "history",
          description: "View moderation history for a member.",
          type: 1,
          options: [
            {
              name: "target",
              description: "Target member ID",
              type: 6,
              required: true,
            },
          ],
        },
        {
          name: "purge",
          description: "Safely bulk delete messages in this channel.",
          type: 1,
          options: [
            {
              name: "amount",
              description: "Number of messages to delete (1-100)",
              type: 4,
              required: true,
            },
            {
              name: "filter_user",
              description: "Only delete messages from this user",
              type: 6,
              required: false,
            },
          ],
        },
        {
          name: "slowmode",
          description: "Set slowmode cooldown for this channel.",
          type: 1,
          options: [
            {
              name: "seconds",
              description: "Slowmode cooldown in seconds (0 to disable)",
              type: 4,
              required: true,
            },
          ],
        },
        {
          name: "lock",
          description: "Lock down this channel against regular messages.",
          type: 1,
          options: [
            {
              name: "reason",
              description: "Reason for lock",
              type: 3,
              required: false,
            },
          ],
        },
        {
          name: "unlock",
          description: "Unlock this channel and restore messaging.",
          type: 1,
          options: [
            {
              name: "reason",
              description: "Reason for unlock",
              type: 3,
              required: false,
            },
          ],
        },
      ],
    };
  }
}
