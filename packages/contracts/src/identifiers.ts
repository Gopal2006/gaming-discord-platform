import { z } from "zod";

/**
 * Discord Snowflake: 17 to 20 digit numeric string.
 * Must be stored as string to avoid IEEE 754 precision loss in JavaScript.
 */
export const SnowflakeSchema = z
  .string()
  .regex(
    /^[0-9]{17,20}$/,
    "Must be a valid Discord snowflake ID (17-20 digits)",
  );

export type Snowflake = z.infer<typeof SnowflakeSchema>;

export const GuildIdSchema = SnowflakeSchema.brand<"GuildId">();
export type GuildId = z.infer<typeof GuildIdSchema>;

export const UserIdSchema = SnowflakeSchema.brand<"UserId">();
export type UserId = z.infer<typeof UserIdSchema>;

export const RoleIdSchema = SnowflakeSchema.brand<"RoleId">();
export type RoleId = z.infer<typeof RoleIdSchema>;

export const ChannelIdSchema = SnowflakeSchema.brand<"ChannelId">();
export type ChannelId = z.infer<typeof ChannelIdSchema>;

export const MessageIdSchema = SnowflakeSchema.brand<"MessageId">();
export type MessageId = z.infer<typeof MessageIdSchema>;

/**
 * Internal entity identifier (UUIDv4 or ULID format).
 */
export const EntityIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Must be an alphanumeric entity identifier");

export type EntityId = z.infer<typeof EntityIdSchema>;

/**
 * Correlation/Request ID schema.
 */
export const RequestIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_.-]+$/, "Must be a valid request/correlation identifier");

export type RequestId = z.infer<typeof RequestIdSchema>;
