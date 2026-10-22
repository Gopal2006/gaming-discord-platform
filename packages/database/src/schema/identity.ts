import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const guilds = pgTable(
  "guilds",
  {
    id: text("id").primaryKey(), // Discord Snowflake
    name: text("name").notNull(),
    icon: text("icon"),
    ownerId: text("owner_id").notNull(),
    botInstalledAt: timestamp("bot_installed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    botRemovedAt: timestamp("bot_removed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_guilds_owner_id").on(table.ownerId)],
);

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Internal UUID / ULID
  username: text("username").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const externalIdentities = pgTable(
  "external_identities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("discord"),
    providerSubjectId: text("provider_subject_id").notNull(), // Discord User Snowflake
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_provider_subject_unique").on(
      table.provider,
      table.providerSubjectId,
    ),
    index("idx_external_identities_user_id").on(table.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_expires_at").on(table.expiresAt),
  ],
);

export const guildSettings = pgTable("guild_settings", {
  guildId: text("guild_id")
    .primaryKey()
    .references(() => guilds.id, { onDelete: "cascade" }),
  logChannelId: text("log_channel_id"),
  modLogChannelId: text("mod_log_channel_id"),
  welcomeChannelId: text("welcome_channel_id"),
  welcomeMessageTemplate: text("welcome_message_template"),
  leaveChannelId: text("leave_channel_id"),
  leaveMessageTemplate: text("leave_message_template"),
  schemaVersion: text("schema_version").notNull().default("1.0"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const guildModules = pgTable(
  "guild_modules",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    moduleKey: text("module_key").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(false),
    configJson: jsonb("config_json"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_guild_modules_guild_module_unique").on(
      table.guildId,
      table.moduleKey,
    ),
    index("idx_guild_modules_guild_id").on(table.guildId),
  ],
);
