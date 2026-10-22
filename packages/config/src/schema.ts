import { z } from "zod";

export const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z
      .string()
      .default("3000")
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(65535)),
    HOST: z.string().default("127.0.0.1"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    // Database
    DATABASE_URL: z
      .string()
      .min(1)
      .default(
        "postgresql://nexus_dev:nexus_dev_password@localhost:5432/nexus_dev",
      ),
    DATABASE_MAX_CONNECTIONS: z
      .string()
      .default("10")
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive()),

    // Redis
    REDIS_URL: z.string().min(1).default("redis://localhost:6379/0"),

    // Discord App
    DISCORD_CLIENT_ID: z.string().default("000000000000000000"),
    DISCORD_CLIENT_SECRET: z.string().default("dev_client_secret_placeholder"),
    DISCORD_BOT_TOKEN: z.string().default("dev_bot_token_placeholder"),
    DISCORD_REDIRECT_URI: z
      .string()
      .url()
      .default("http://localhost:3000/auth/discord/callback"),

    // Session Security
    SESSION_SECRET: z
      .string()
      .min(32)
      .default("dev_session_secret_change_me_to_random_64_characters_min"),
    CSRF_SECRET: z
      .string()
      .min(32)
      .default("dev_csrf_secret_change_me_to_random_64_characters_min"),

    // S3 Storage (Optional in dev)
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default("us-east-1"),
    S3_BUCKET: z.string().default("nexus-assets-dev"),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Strict production requirements
    if (data.NODE_ENV === "production") {
      if (
        !data.DATABASE_URL ||
        data.DATABASE_URL.includes("nexus_dev_password")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "DATABASE_URL must be configured with secure credentials in production",
          path: ["DATABASE_URL"],
        });
      }
      if (
        !data.DISCORD_BOT_TOKEN ||
        data.DISCORD_BOT_TOKEN.includes("placeholder")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "DISCORD_BOT_TOKEN is required and cannot be placeholder in production",
          path: ["DISCORD_BOT_TOKEN"],
        });
      }
      if (
        !data.DISCORD_CLIENT_SECRET ||
        data.DISCORD_CLIENT_SECRET.includes("placeholder")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "DISCORD_CLIENT_SECRET is required and cannot be placeholder in production",
          path: ["DISCORD_CLIENT_SECRET"],
        });
      }
      if (data.SESSION_SECRET.includes("dev_session_secret")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "SESSION_SECRET must be replaced with a secure random secret in production",
          path: ["SESSION_SECRET"],
        });
      }
    }
  });

export type NexusConfig = z.infer<typeof EnvSchema>;

export function parseConfig(
  env: Record<string, string | undefined>,
): NexusConfig {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `[${issue.path.join(".")}] ${issue.message}`)
      .join("\n");
    throw new Error(`Configuration validation failed:\n${errorMessages}`);
  }
  return result.data;
}

export function redactConfig(config: NexusConfig): Record<string, unknown> {
  return {
    ...config,
    DATABASE_URL: "[REDACTED_DATABASE_URL]",
    REDIS_URL: "[REDACTED_REDIS_URL]",
    DISCORD_CLIENT_SECRET: "[REDACTED]",
    DISCORD_BOT_TOKEN: "[REDACTED]",
    SESSION_SECRET: "[REDACTED]",
    CSRF_SECRET: "[REDACTED]",
    S3_ACCESS_KEY: config.S3_ACCESS_KEY ? "[REDACTED]" : undefined,
    S3_SECRET_KEY: config.S3_SECRET_KEY ? "[REDACTED]" : undefined,
  };
}
