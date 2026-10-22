import crypto from "node:crypto";

export interface UserSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly username: string;
  readonly email: string | null;
  readonly isPlatformOperator: boolean;
  readonly accessibleGuilds: readonly { guildId: string; isOwner: boolean }[];
  readonly expiresAt: Date;
}

export interface ISessionStore {
  createSession(
    user: {
      userId: string;
      username: string;
      email: string | null;
      isPlatformOperator?: boolean;
      accessibleGuilds?: readonly { guildId: string; isOwner: boolean }[];
    },
    ttlSeconds?: number,
  ): Promise<{ rawToken: string; session: UserSession }>;

  resolveSession(rawToken: string): Promise<UserSession | null>;

  revokeSession(rawToken: string): Promise<void>;
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class InMemorySessionStore implements ISessionStore {
  private readonly sessions = new Map<string, UserSession>();
  private readonly defaultTtlSeconds = 7 * 24 * 3600; // 7 days

  async createSession(
    user: {
      userId: string;
      username: string;
      email: string | null;
      isPlatformOperator?: boolean;
      accessibleGuilds?: readonly { guildId: string; isOwner: boolean }[];
    },
    ttlSeconds = this.defaultTtlSeconds,
  ): Promise<{ rawToken: string; session: UserSession }> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const session: UserSession = {
      sessionId: `sess_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      userId: user.userId,
      username: user.username,
      email: user.email,
      isPlatformOperator: user.isPlatformOperator ?? false,
      accessibleGuilds: user.accessibleGuilds ?? [],
      expiresAt,
    };

    this.sessions.set(tokenHash, session);
    return { rawToken, session };
  }

  async resolveSession(rawToken: string): Promise<UserSession | null> {
    if (!rawToken || rawToken.trim() === "") return null;
    const tokenHash = hashSessionToken(rawToken);
    const session = this.sessions.get(tokenHash);
    if (!session) return null;

    if (session.expiresAt.getTime() <= Date.now()) {
      this.sessions.delete(tokenHash);
      return null;
    }

    return session;
  }

  async revokeSession(rawToken: string): Promise<void> {
    const tokenHash = hashSessionToken(rawToken);
    this.sessions.delete(tokenHash);
  }
}
