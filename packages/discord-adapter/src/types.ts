export type DiscordChannelType = "text" | "voice" | "category" | "announcement";

export interface DiscordChannel {
  id: string;
  guildId: string;
  name: string;
  type: DiscordChannelType;
  topic?: string | null;
  parentId?: string | null;
  position?: number;
}

export interface DiscordRole {
  id: string;
  guildId: string;
  name: string;
  color: number;
  position: number;
  permissions: bigint | string;
  managed: boolean;
}

export interface DiscordMember {
  id: string;
  guildId: string;
  username: string;
  roleIds: string[];
  highestRolePosition: number;
  isOwner: boolean;
}

export interface DiscordGuild {
  id: string;
  name: string;
  ownerId: string;
  channels: DiscordChannel[];
  roles: DiscordRole[];
  botPermissions: bigint;
  botRolePosition: number;
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string; iconUrl?: string };
  timestamp?: string;
}

export type InstallationMode = "administrator" | "granular";

export interface InviteUrlOptions {
  clientId: string;
  mode?: InstallationMode;
  guildId?: string;
  redirectUri?: string;
  scopes?: string[];
}

export interface IDiscordRestClient {
  createChannel(
    guildId: string,
    options: {
      name: string;
      type?: DiscordChannelType;
      topic?: string;
    },
  ): Promise<DiscordChannel>;
  getChannel(channelId: string): Promise<DiscordChannel | null>;
  sendMessage(
    channelId: string,
    message: { content?: string; embeds?: DiscordEmbed[] },
  ): Promise<{ id: string; channelId: string; content?: string }>;
  getGuild(guildId: string): Promise<DiscordGuild | null>;
  getGuildMember(
    guildId: string,
    userId: string,
  ): Promise<DiscordMember | null>;

  // Moderation & channel control
  timeoutMember(
    guildId: string,
    userId: string,
    durationMs: number,
    reason?: string,
  ): Promise<void>;
  kickMember(guildId: string, userId: string, reason?: string): Promise<void>;
  banMember(
    guildId: string,
    userId: string,
    options?: { deleteMessageSeconds?: number; reason?: string },
  ): Promise<void>;
  unbanMember(guildId: string, userId: string, reason?: string): Promise<void>;
  bulkDelete(
    channelId: string,
    messageCount: number,
  ): Promise<{ deletedCount: number }>;
  setChannelSlowmode(
    channelId: string,
    rateLimitPerUser: number,
  ): Promise<void>;
  lockChannel(channelId: string, options?: { reason?: string }): Promise<void>;
  unlockChannel(
    channelId: string,
    options?: { reason?: string },
  ): Promise<void>;

  // Tickets
  createTicketChannel(
    guildId: string,
    options: {
      name: string;
      topic?: string;
      requesterId: string;
    },
  ): Promise<DiscordChannel>;
  fetchChannelMessages(
    channelId: string,
    limit?: number,
  ): Promise<
    Array<{ id: string; authorTag: string; content: string; timestamp: string }>
  >;
}
