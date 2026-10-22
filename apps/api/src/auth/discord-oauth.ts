export interface DiscordUserIdentity {
  id: string; // Discord user snowflake
  username: string;
  email: string | null;
  avatar: string | null;
}

export interface DiscordUserGuild {
  id: string; // Guild snowflake
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string; // bitwise permissions string
}

export interface IDiscordOAuthClient {
  getAuthorizationUrl(state: string): string;
  exchangeCode(
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;
  fetchUser(accessToken: string): Promise<DiscordUserIdentity>;
  fetchUserGuilds(accessToken: string): Promise<readonly DiscordUserGuild[]>;
}

export interface DiscordOAuthOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class MockDiscordOAuthClient implements IDiscordOAuthClient {
  constructor(
    private readonly defaultUser: DiscordUserIdentity = {
      id: "123456789012345678",
      username: "TestDiscordUser",
      email: "test@nexus.gg",
      avatar: null,
    },
    private readonly defaultGuilds: readonly DiscordUserGuild[] = [
      {
        id: "111111111111111111",
        name: "Nexus Alpha Gaming",
        icon: null,
        owner: true,
        permissions: "8", // Administrator
      },
      {
        id: "222222222222222222",
        name: "Casual Gaming Hub",
        icon: null,
        owner: false,
        permissions: "32", // Manage Server
      },
    ],
  ) {}

  getAuthorizationUrl(state: string): string {
    return `https://discord.com/api/oauth2/authorize?client_id=mock&response_type=code&scope=identify%20email%20guilds&state=${encodeURIComponent(state)}`;
  }

  async exchangeCode(
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (code === "invalid_code") {
      throw new Error("Invalid OAuth code");
    }
    return {
      accessToken: `mock_access_token_${code}`,
      refreshToken: `mock_refresh_token_${code}`,
    };
  }

  async fetchUser(accessToken: string): Promise<DiscordUserIdentity> {
    if (accessToken.includes("invalid")) {
      throw new Error("Invalid access token");
    }
    return this.defaultUser;
  }

  async fetchUserGuilds(
    accessToken: string,
  ): Promise<readonly DiscordUserGuild[]> {
    if (accessToken.includes("invalid")) {
      throw new Error("Invalid access token");
    }
    return this.defaultGuilds;
  }
}
