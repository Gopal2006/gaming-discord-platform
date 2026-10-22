import crypto from "node:crypto";
import type { ConfirmationTokenPayload } from "@nexus/contracts";

export interface CreateConfirmationTokenOptions {
  guildId: string;
  actorId: string;
  operationType: string;
  targetFingerprint: string;
  ttlSeconds?: number;
}

export interface VerifyConfirmationTokenOptions {
  token: string;
  guildId: string;
  actorId: string;
  operationType: string;
  targetFingerprint: string;
  now?: Date;
}

export interface IConfirmationService {
  createToken(options: CreateConfirmationTokenOptions): {
    token: string;
    payload: ConfirmationTokenPayload;
  };
  verifyAndConsumeToken(options: VerifyConfirmationTokenOptions): {
    valid: boolean;
    reason?: string;
    payload?: ConfirmationTokenPayload;
  };
}

export class InMemoryConfirmationService implements IConfirmationService {
  private readonly tokens = new Map<string, ConfirmationTokenPayload>();
  private readonly consumedTokens = new Set<string>();

  public createToken(options: CreateConfirmationTokenOptions): {
    token: string;
    payload: ConfirmationTokenPayload;
  } {
    const {
      guildId,
      actorId,
      operationType,
      targetFingerprint,
      ttlSeconds = 60,
    } = options;

    const rawToken = crypto.randomBytes(24).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const payload: ConfirmationTokenPayload = {
      token: rawToken,
      guildId,
      actorId,
      operationType,
      targetFingerprint,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.tokens.set(rawToken, payload);

    return { token: rawToken, payload };
  }

  public verifyAndConsumeToken(options: VerifyConfirmationTokenOptions): {
    valid: boolean;
    reason?: string;
    payload?: ConfirmationTokenPayload;
  } {
    const { token, guildId, actorId, operationType, targetFingerprint } =
      options;
    const now = options.now ?? new Date();

    if (this.consumedTokens.has(token)) {
      return {
        valid: false,
        reason:
          "REPLAY_DETECTED: Confirmation token has already been consumed.",
      };
    }

    const payload = this.tokens.get(token);
    if (!payload) {
      return {
        valid: false,
        reason: "TOKEN_NOT_FOUND: Confirmation token does not exist.",
      };
    }

    if (new Date(payload.expiresAt).getTime() <= now.getTime()) {
      this.tokens.delete(token);
      return {
        valid: false,
        reason: "TOKEN_EXPIRED: Confirmation token has expired.",
      };
    }

    if (payload.guildId !== guildId) {
      return {
        valid: false,
        reason:
          "GUILD_MISMATCH: Confirmation token does not match target guild.",
      };
    }

    if (payload.actorId !== actorId) {
      return {
        valid: false,
        reason:
          "ACTOR_MISMATCH: Confirmation token was not issued to this actor.",
      };
    }

    if (payload.operationType !== operationType) {
      return {
        valid: false,
        reason:
          "OPERATION_MISMATCH: Confirmation token is for a different operation type.",
      };
    }

    if (payload.targetFingerprint !== targetFingerprint) {
      return {
        valid: false,
        reason: "TARGET_MISMATCH: Confirmation token target does not match.",
      };
    }

    // Mark as consumed to prevent replay attacks
    this.consumedTokens.add(token);
    this.tokens.delete(token);

    return {
      valid: true,
      payload,
    };
  }
}
