import pino from "pino";

export interface LoggerOptions {
  name: string;
  level?: string;
  pretty?: boolean;
}

export const REDACTED_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["set-cookie"]',
  "headers.authorization",
  "headers.cookie",
  "token",
  "botToken",
  "clientSecret",
  "password",
  "secret",
  "sessionSecret",
  "csrfSecret",
  "s3SecretKey",
  "databaseUrl",
  "redisUrl",
  "*.token",
  "*.password",
  "*.secret",
  "*.authorization",
];

export function createLogger(options: LoggerOptions): pino.Logger {
  return pino({
    name: options.name,
    level: options.level ?? "info",
    redact: {
      paths: REDACTED_PATHS,
      censor: "[REDACTED]",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}

export type Logger = pino.Logger;
