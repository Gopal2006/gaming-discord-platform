import type {
  IDiscordRestClient,
  DiscordChannel,
  DiscordGuild,
  DiscordMember,
  DiscordEmbed,
  DiscordChannelType,
} from "./types.js";

export class FakeDiscordClient implements IDiscordRestClient {
  public readonly channels = new Map<string, DiscordChannel>();
  public readonly sentMessages: Array<{
    id: string;
    channelId: string;
    content?: string;
    embeds?: DiscordEmbed[];
  }> = [];
  public readonly guilds = new Map<string, DiscordGuild>();
  public readonly members = new Map<string, DiscordMember>();

  constructor() {}

  public addGuild(guild: DiscordGuild): void {
    this.guilds.set(guild.id, guild);
    for (const ch of guild.channels) {
      this.channels.set(ch.id, ch);
    }
  }

  public addMember(member: DiscordMember): void {
    const key = `${member.guildId}_${member.id}`;
    this.members.set(key, member);
  }

  async createChannel(
    guildId: string,
    options: {
      name: string;
      type?: DiscordChannelType;
      topic?: string;
    },
  ): Promise<DiscordChannel> {
    const id = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel: DiscordChannel = {
      id,
      guildId,
      name: options.name,
      type: options.type ?? "text",
      topic: options.topic,
      position: this.channels.size + 1,
    };

    this.channels.set(id, channel);

    const guild = this.guilds.get(guildId);
    if (guild) {
      guild.channels.push(channel);
    }

    return channel;
  }

  async getChannel(channelId: string): Promise<DiscordChannel | null> {
    return this.channels.get(channelId) ?? null;
  }

  async sendMessage(
    channelId: string,
    message: { content?: string; embeds?: DiscordEmbed[] },
  ): Promise<{ id: string; channelId: string; content?: string }> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel with ID '${channelId}' not found.`);
    }

    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      channelId,
      content: message.content,
      embeds: message.embeds,
    };

    this.sentMessages.push(record);
    return record;
  }

  async getGuild(guildId: string): Promise<DiscordGuild | null> {
    return this.guilds.get(guildId) ?? null;
  }

  async getGuildMember(
    guildId: string,
    userId: string,
  ): Promise<DiscordMember | null> {
    const key = `${guildId}_${userId}`;
    return this.members.get(key) ?? null;
  }
}
