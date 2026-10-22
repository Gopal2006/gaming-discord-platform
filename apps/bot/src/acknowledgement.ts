import type { ChatInputCommandInteraction } from "discord.js";
import type { CommandExecutionResult } from "./types.js";
import type { DiscordEmbed } from "@nexus/discord-adapter";

export interface IInteractionResponder {
  defer(ephemeral?: boolean): Promise<void>;
  respond(result: CommandExecutionResult): Promise<void>;
  fail(error: Error | string, ephemeral?: boolean): Promise<void>;
}

export class DiscordInteractionResponder implements IInteractionResponder {
  private isDeferred = false;
  private isReplied = false;

  constructor(private readonly interaction: ChatInputCommandInteraction) {}

  async defer(ephemeral = true): Promise<void> {
    if (
      !this.isDeferred &&
      !this.interaction.deferred &&
      !this.interaction.replied
    ) {
      await this.interaction.deferReply({ ephemeral });
      this.isDeferred = true;
    }
  }

  async respond(result: CommandExecutionResult): Promise<void> {
    const payload = {
      content: result.content,
      embeds: result.embeds?.map((e) => this.toDiscordEmbed(e)),
    };

    if (this.interaction.deferred) {
      await this.interaction.editReply(payload);
    } else if (!this.interaction.replied) {
      await this.interaction.reply({
        ...payload,
        ephemeral: result.ephemeral ?? true,
      });
    } else {
      await this.interaction.followUp({
        ...payload,
        ephemeral: result.ephemeral ?? true,
      });
    }

    this.isReplied = true;
  }

  async fail(error: Error | string, ephemeral = true): Promise<void> {
    const message = typeof error === "string" ? error : error.message;
    const errorEmbed = {
      title: "Command Execution Error",
      description: message,
      color: 0xed4245,
    };

    await this.respond({
      ephemeral,
      embeds: [errorEmbed],
    });
  }

  private toDiscordEmbed(embed: DiscordEmbed) {
    return {
      title: embed.title,
      description: embed.description,
      color: embed.color,
      fields: embed.fields,
      footer: embed.footer,
      timestamp: embed.timestamp,
    };
  }
}
