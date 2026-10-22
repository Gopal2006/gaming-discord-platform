import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { guilds } from "./identity.js";

export const permissionGrants = pgTable(
  "permission_grants",
  {
    id: text("id").primaryKey(),
    realm: text("realm").notNull(), // 'guild' | 'platform'
    guildId: text("guild_id").references(() => guilds.id, {
      onDelete: "cascade",
    }),
    principalType: text("principal_type").notNull(), // 'user' | 'role' | 'platform_operator' | 'guild_owner'
    principalId: text("principal_id").notNull(),
    capability: text("capability").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    effect: text("effect").notNull().default("allow"), // 'allow' | 'deny'
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    grantedBy: text("granted_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_permission_grants_guild_id").on(table.guildId),
    index("idx_permission_grants_principal").on(
      table.principalType,
      table.principalId,
    ),
    index("idx_permission_grants_capability").on(table.capability),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    realm: text("realm").notNull(),
    guildId: text("guild_id").references(() => guilds.id, {
      onDelete: "set null",
    }),
    actorId: text("actor_id").notNull(),
    actorType: text("actor_type").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    outcome: text("outcome").notNull(), // 'success' | 'denied' | 'failed'
    reason: text("reason"),
    correlationId: text("correlation_id").notNull(),
    detailsJson: jsonb("details_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_audit_events_guild_id").on(table.guildId),
    index("idx_audit_events_actor_id").on(table.actorId),
    index("idx_audit_events_action").on(table.action),
    index("idx_audit_events_created_at").on(table.createdAt),
  ],
);

export const securityIncidents = pgTable(
  "security_incidents",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id").references(() => guilds.id, {
      onDelete: "set null",
    }),
    severity: text("severity").notNull(), // 'low' | 'medium' | 'high' | 'critical'
    state: text("state").notNull().default("detected"),
    summary: text("summary").notNull(),
    ownerId: text("owner_id"),
    detailsJson: jsonb("details_json"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_security_incidents_guild_id").on(table.guildId),
    index("idx_security_incidents_state").on(table.state),
  ],
);
