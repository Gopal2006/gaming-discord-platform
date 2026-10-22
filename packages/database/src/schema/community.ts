import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { guilds } from "./identity.js";

export const moderationCases = pgTable(
  "moderation_cases",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    caseNumber: integer("case_number").notNull(),
    targetUserId: text("target_user_id").notNull(),
    moderatorId: text("moderator_id").notNull(),
    action: text("action").notNull(), // 'warn' | 'timeout' | 'kick' | 'ban' | 'unban'
    reason: text("reason").notNull(),
    status: text("status").notNull().default("applied"), // 'applied' | 'expired' | 'reversed'
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_mod_cases_guild_number").on(
      table.guildId,
      table.caseNumber,
    ),
    index("idx_mod_cases_guild_target").on(table.guildId, table.targetUserId),
    index("idx_mod_cases_guild_status").on(table.guildId, table.status),
  ],
);

export const tickets = pgTable(
  "tickets",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    ticketNumber: integer("ticket_number").notNull(),
    requesterId: text("requester_id").notNull(),
    assignedUserId: text("assigned_user_id"),
    channelId: text("channel_id"),
    category: text("category").notNull().default("general"),
    status: text("status").notNull().default("open"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    retentionDeadline: timestamp("retention_deadline", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_tickets_guild_number").on(
      table.guildId,
      table.ticketNumber,
    ),
    index("idx_tickets_guild_status").on(table.guildId, table.status),
    index("idx_tickets_guild_requester").on(table.guildId, table.requesterId),
  ],
);

export const polls = pgTable(
  "polls",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id"),
    question: text("question").notNull(),
    optionsJson: jsonb("options_json").notNull(), // array of strings
    status: text("status").notNull().default("active"), // 'active' | 'closed' | 'archived'
    closesAt: timestamp("closes_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_polls_guild_status").on(table.guildId, table.status)],
);

export const pollVotes = pgTable(
  "poll_votes",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    optionIndex: integer("option_index").notNull(),
    votedAt: timestamp("voted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_poll_user_unique_vote").on(table.pollId, table.userId),
  ],
);

export const giveaways = pgTable(
  "giveaways",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id"),
    prize: text("prize").notNull(),
    winnerCount: integer("winner_count").notNull().default(1),
    status: text("status").notNull().default("active"), // 'active' | 'ended' | 'cancelled'
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_giveaways_guild_status").on(table.guildId, table.status),
  ],
);
