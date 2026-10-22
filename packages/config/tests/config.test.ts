import { describe, it, expect } from "vitest";
import { parseConfig, redactConfig } from "../src/index.js";

describe("Config - Environment Validation", () => {
  it("parses valid default development environment", () => {
    const config = parseConfig({
      NODE_ENV: "development",
    });
    expect(config.NODE_ENV).toBe("development");
    expect(config.PORT).toBe(3000);
    expect(config.HOST).toBe("127.0.0.1");
    expect(config.LOG_LEVEL).toBe("info");
    expect(config.DATABASE_URL).toBeDefined();
  });

  it("fails safely in production when secrets are placeholders", () => {
    expect(() =>
      parseConfig({
        NODE_ENV: "production",
        PORT: "3000",
        DATABASE_URL:
          "postgresql://nexus_dev:nexus_dev_password@localhost:5432/nexus_dev", // default password
        DISCORD_BOT_TOKEN: "dev_bot_token_placeholder",
      }),
    ).toThrow(/Configuration validation failed/);
  });

  it("succeeds in production with properly configured credentials", () => {
    const config = parseConfig({
      NODE_ENV: "production",
      PORT: "8080",
      DATABASE_URL:
        "postgresql://prod_user:secure_prod_pw_98765@db.example.com:5432/nexus_prod",
      REDIS_URL:
        "rediss://default:secure_redis_token_12345@redis.example.com:6380",
      DISCORD_CLIENT_ID: "123456789012345678",
      DISCORD_CLIENT_SECRET: "real_client_secret_abcdef1234567890",
      DISCORD_BOT_TOKEN: "real_bot_token_abc.def.ghi.1234567890abcdef",
      DISCORD_REDIRECT_URI: "https://nexus.gg/auth/discord/callback",
      SESSION_SECRET:
        "super_secure_random_session_secret_1234567890abcdef1234567890abcdef",
      CSRF_SECRET:
        "super_secure_random_csrf_secret_1234567890abcdef1234567890abcdef",
    });

    expect(config.NODE_ENV).toBe("production");
    expect(config.PORT).toBe(8080);
  });

  it("redacts sensitive values safely", () => {
    const config = parseConfig({
      NODE_ENV: "development",
      DISCORD_BOT_TOKEN: "secret_token_123",
    });
    const redacted = redactConfig(config);
    expect(redacted["DISCORD_BOT_TOKEN"]).toBe("[REDACTED]");
    expect(redacted["DATABASE_URL"]).toBe("[REDACTED_DATABASE_URL]");
    expect(redacted["REDIS_URL"]).toBe("[REDACTED_REDIS_URL]");
  });
});
