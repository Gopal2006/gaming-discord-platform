import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { guilds } from "./identity.js";

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id").references(() => guilds.id, {
      onDelete: "cascade",
    }),
    eventType: text("event_type").notNull(),
    eventVersion: integer("event_version").notNull().default(1),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payloadJson: jsonb("payload_json").notNull(),
    status: text("status").notNull().default("pending"), // 'pending' | 'dispatched' | 'acknowledged' | 'retry_wait' | 'dead_letter'
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_outbox_events_status_available").on(
      table.status,
      table.availableAt,
    ),
    index("idx_outbox_events_lease").on(table.status, table.leaseExpiresAt),
    index("idx_outbox_events_guild_id").on(table.guildId),
  ],
);

export const scheduledActions = pgTable(
  "scheduled_actions",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    actionType: text("action_type").notNull(),
    targetId: text("target_id").notNull(),
    payloadJson: jsonb("payload_json").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("scheduled"), // 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled'
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_scheduled_actions_idempotency").on(table.idempotencyKey),
    index("idx_scheduled_actions_status_scheduled_for").on(
      table.status,
      table.scheduledFor,
    ),
    index("idx_scheduled_actions_guild_id").on(table.guildId),
  ],
);

export const jobExecutions = pgTable(
  "job_executions",
  {
    id: text("id").primaryKey(),
    jobName: text("job_name").notNull(),
    jobKey: text("job_key").notNull(),
    status: text("status").notNull(), // 'active' | 'completed' | 'failed' | 'cancelled'
    attempts: integer("attempts").notNull().default(1),
    errorClass: text("error_class"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_job_executions_job_name").on(table.jobName),
    index("idx_job_executions_status").on(table.status),
  ],
);
