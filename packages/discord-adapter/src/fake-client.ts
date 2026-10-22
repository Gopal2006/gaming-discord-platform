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

  async timeoutMember(
    guildId: string,
    userId: string,
    durationMs: number,
    reason?: string,
  ): Promise<void> {
    const member = await this.getGuildMember(guildId, userId);
    if (!member) {
      this.addMember({
        id: userId,
        guildId,
        username: `user_${userId}`,
        roleIds: [],
        highestRolePosition: 0,
        isOwner: false,
      });
    }
  }

  async kickMember(
    guildId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const key = `${guildId}_${userId}`;
    this.members.delete(key);
  }

  async banMember(
    guildId: string,
    userId: string,
    options?: { deleteMessageSeconds?: number; reason?: string },
  ): Promise<void> {
    const key = `${guildId}_${userId}`;
    this.members.delete(key);
  }

  async unbanMember(
    guildId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {}

  async bulkDelete(
    channelId: string,
    messageCount: number,
  ): Promise<{ deletedCount: number }> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
    return { deletedCount: Math.min(messageCount, 100) };
  }

  async setChannelSlowmode(
    channelId: string,
    rateLimitPerUser: number,
  ): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
  }

  async lockChannel(
    channelId: string,
    options?: { reason?: string },
  ): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
  }

  async unlockChannel(
    channelId: string,
    options?: { reason?: string },
  ): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
  }

  async createTicketChannel(
    guildId: string,
    options: {
      name: string;
      topic?: string;
      requesterId: string;
    },
  ): Promise<DiscordChannel> {
    return await this.createChannel(guildId, {
      name: options.name,
      type: "text",
      topic: options.topic ?? `Ticket for user ${options.requesterId}`,
    });
  }

  async fetchChannelMessages(
    channelId: string,
    limit: number = 50,
  ): Promise<
    Array<{
      id: string;
      authorTag: string;
      content: string;
      timestamp: string;
    }>
  > {
    return this.sentMessages
      .filter((m) => m.channelId === channelId)
      .slice(-limit)
      .map((m) => ({
        id: m.id,
        authorTag: "User#0001",
        content: m.content ?? "",
        timestamp: new Date().toISOString(),
      }));
  }
}
