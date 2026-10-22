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

export const gameDefinitions = pgTable("game_definitions", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  isPlatformDefault: boolean("is_platform_default").notNull().default(false),
  defaultSchemaJson: jsonb("default_schema_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const guildGameProfiles = pgTable(
  "guild_game_profiles",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    gameDefinitionId: text("game_definition_id").references(
      () => gameDefinitions.id,
    ),
    name: text("name").notNull(),
    schemaVersion: text("schema_version").notNull().default("1.0"),
    profileConfigJson: jsonb("profile_config_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_game_profiles_guild_id").on(table.guildId)],
);

export const tournaments = pgTable(
  "tournaments",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    gameProfileId: text("game_profile_id")
      .notNull()
      .references(() => guildGameProfiles.id),
    title: text("title").notNull(),
    format: text("format").notNull().default("single_elimination"), // 'single_elimination' | 'round_robin'
    status: text("status").notNull().default("draft"),
    maxEntrants: integer("max_entrants").notNull().default(16),
    checkInDurationMinutes: integer("check_in_duration_minutes")
      .notNull()
      .default(30),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_tournaments_guild_status").on(table.guildId, table.status),
  ],
);

export const registrations = pgTable(
  "registrations",
  {
    id: text("id").primaryKey(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    entrantId: text("entrant_id").notNull(), // User or Team ID
    entrantType: text("entrant_type").notNull().default("user"), // 'user' | 'team'
    status: text("status").notNull().default("submitted"), // 'submitted' | 'accepted' | 'waitlisted' | 'checked_in' | 'rejected'
    answersJson: jsonb("answers_json"),
    formVersion: text("form_version").notNull().default("1.0"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_registrations_tournament_entrant").on(
      table.tournamentId,
      table.entrantId,
    ),
    index("idx_registrations_tournament_status").on(
      table.tournamentId,
      table.status,
    ),
    index("idx_registrations_guild_id").on(table.guildId),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: text("id").primaryKey(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    stageIndex: integer("stage_index").notNull().default(0),
    roundIndex: integer("round_index").notNull().default(0),
    matchIndex: integer("match_index").notNull().default(0),
    status: text("status").notNull().default("scheduled"),
    participantAId: text("participant_a_id"),
    participantBId: text("participant_b_id"),
    scoreA: integer("score_a").notNull().default(0),
    scoreB: integer("score_b").notNull().default(0),
    winnerId: text("winner_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_matches_tournament_round").on(
      table.tournamentId,
      table.roundIndex,
    ),
    index("idx_matches_guild_id").on(table.guildId),
  ],
);

export const teams = pgTable(
  "teams",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    captainUserId: text("captain_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_teams_guild_name").on(table.guildId, table.name),
  ],
);
