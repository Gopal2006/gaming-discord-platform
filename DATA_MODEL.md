# Data Model and Persistence Specification

## 1. Data principles

PostgreSQL is authoritative for tenant configuration, identity links, permission grants, registrations, competition state, durable jobs/outbox records and audit events. Redis supports queues/cache and can be rebuilt. Object storage holds binary files. Discord is authoritative for live guild roles, channels and native message state; local records track desired mappings/history and reconcile with Discord.

All entities use generated primary keys (UUID/ULID preferred for internal entities), UTC timestamps, explicit status/state fields and created/updated audit metadata. Discord snowflakes are stored without lossy JavaScript number conversion; use `text` for portability or PostgreSQL `numeric(20,0)` with carefully validated mapping. Never use SQLite `INTEGER` assumptions copied from the legacy report for a horizontally scaled platform.

## 2. Core model domains

### Identity and guild

- `users`: internal user identity and lifecycle; Discord identity link separate to support safe changes.
- `external_identities`: provider (`discord`), provider subject ID, linked user, created/verified timestamps, unique provider+subject.
- `sessions`: hashed opaque session token or secure session identifier, user, expiry, last active, revocation and risk metadata. Store no raw browser bearer secret if a hash-based design can be used.
- `guilds`: Discord guild ID, display cache, owner ID cache, bot installation status and timestamps. Live Discord facts can become stale; record last verified time.
- `guild_memberships`: internal user/guild relationship and role cache only when needed; must not be treated as permanent authorization truth.
- `guild_settings`: normalized or JSONB settings for non-relational feature options, schema version and revision. Prefer normalized tables for data queried/authorized/related frequently.
- `guild_modules`: feature key, enabled/configured state, config revision, enabled by, updated by.

### Authorization and audit

- `platform_operators`, `platform_teams`, `platform_role_bindings`.
- `permission_grants`: realm, guild scope nullable only for platform capability, principal type/id, capability, resource scope, effect, expiry, grantor and revocation metadata.
- `audit_events`: immutable append-style action record with realm, tenant/guild, actor, action, resource type/ID, reason, redacted payload, outcome, request/correlation ID, created time. Restrict update/delete privileges; use retention/archival process, not tenant endpoint deletion.
- `security_incidents`: severity, scope, owner, state, timeline links, containment/mitigation actions and postmortem.
- `support_access_grants`: purpose, ticket, approving/requesting operators, tenant/resource scope, capabilities, expiry and revoked timestamp.

### Templates, jobs and integrations

- `template_definitions`: global or guild-scoped source, owner, type and state.
- `template_versions`: immutable content/schema snapshot, validation errors, version and authored by.
- `scheduled_actions`: durable desired effect, tenant, target, payload snapshot/reference, execution time, status and idempotency key.
- `outbox_events`: event type/version, tenant, aggregate ID, payload, availability time, status and attempts.
- `job_executions`: job ID/key, status, attempts, timestamps, outcome and sanitized error classification.
- `discord_channel_bindings`: guild, purpose, channel ID, last verified status.
- `integrations`: provider, tenant, settings reference, enabled status and secret-manager reference (never secret value in normal table), scope/grant and sync status.

### Community and moderation

- `moderation_cases`: guild, target user ID, actor, action, reason, case status, Discord outcome, external reference, expiry and timestamps.
- `moderation_case_events`: append-only case history.
- `reports` / `appeals`: reporter/target, category, content access policy, assignment, status and resolution.
- `tickets`: guild, requester, category, status, channel/message IDs, assigned team/user, priority, created/closed timestamps and retention deadline.
- `ticket_participants`: ticket/user and access role with timestamps.
- `ticket_transcripts`: private object reference, content hash, created by, retention deadline and access audit.
- `polls` and `poll_votes`: poll lifecycle and one canonical vote per poll/user (or versioned vote changes if audit needs it).
- `giveaways`, `giveaway_entries`, `giveaway_winners`: durable deadline, eligibility rule snapshot, entry identity and winner selection metadata/seed or algorithm version as policy requires.

### Gaming domain

- `game_definitions` (platform default) and `guild_game_profiles` (tenant-owned clone/custom version).
- `game_profile_versions`: immutable schema, format capabilities, scoring rules and template bindings.
- `player_profiles`: guild-scoped user identity plus privacy settings.
- `player_game_accounts`: profile field values protected according to sensitivity classification; use versioned schema references.
- `teams`, `team_memberships`, `team_invitations`, `roster_revisions`.
- `events`, `event_revisions`, `registration_form_versions`, `registrations`, `registration_answers`, `check_ins`.
- `competitions`, `competition_stages`, `stage_entrants`, `matches`, `match_participants`, `match_schedule_revisions`, `result_submissions`, `result_revisions`, `evidence_assets`, `disputes`, `dispute_events`, `standings_snapshots`.

## 3. Essential relationships and constraints

- Guild-owned entities reference `guild_id` explicitly where possible and include indexes on `(guild_id, status)`, `(guild_id, created_at)` and primary list filters.
- `guild_game_profiles` and tenant templates always have an owning guild; built-in defaults have explicit global ownership and are immutable from tenant writes.
- Unique active registration is enforced by the chosen event/player or event/team constraint, taking registration policy into account. Do not enforce uniqueness only in application code.
- At most one current accepted result exists per match; preserve historical result revisions.
- Team roster changes and event rule changes preserve revision history after registration or competition starts.
- Scheduled actions and outbox events have idempotency/unique keys.
- Foreign keys and unique indexes must be designed with tenant scope to prevent accidental cross-guild joins.
- Use database constraints for invariants where feasible; use transactions for multi-row state changes.

## 4. JSONB use policy

JSONB is appropriate for versioned form definitions, rule configuration, template blocks and event payloads that are explicitly schema-validated and not relationally queried on every request. It is not a shortcut for all columns. Frequently filtered data, identity, permission grants, match state, financial/entitlement records (if later implemented), ownership, and relationships belong in normalized fields/tables with constraints.

Keep the schema version and validation contract alongside each JSONB payload. Changes require migrations or version-aware readers. Never accept arbitrary tenant JSON directly into internal settings without schema validation and size limits.

## 5. Transactions and job durability

Use transactions for:

- accepting registration and allocating a capped slot;
- closing registration and snapshotting entrant eligibility;
- roster lock and roster revision creation;
- confirming a result and advancing the stage/standings revision;
- updating permissions and writing corresponding audit/outbox events;
- publishing an announcement intent and its durable scheduled-action record.

For external side effects, commit state and outbox event together, then dispatch to BullMQ. Consumers check current state and idempotency before acting. A reconciliation task scans for pending outbox rows or stuck scheduled actions. A `published` state is recorded only after the external provider confirms publication and a message ID/reference is stored.

## 6. Data lifecycle and privacy

Every data domain needs a retention classification, owner, access policy and cleanup behavior. Apply TTL/retention jobs to expired session data, temporary evidence, stale exports and logs according to policy. Backups have their own retention and access controls. Ensure deletion/anonymization policy handles foreign-key and audit requirements explicitly; don't simply delete user data blindly if legal/audit retention applies. Exports are generated asynchronously, kept private and expired automatically.

## 7. Migration rules

- Generate and review migration SQL in pull requests.
- Apply migrations through a single controlled release step, not concurrently from every replica.
- Use expand-migrate-contract for nontrivial production changes: add compatible fields/tables, deploy readers/writers, backfill, verify, then remove old schema in a later release.
- Migrations must be safe on realistically sized data; destructive changes require backup and recovery plan.
- Include rollback/forward-fix policy. Some DDL/data transformations cannot be safely rolled back; document that before release.
- Validate schema and migration state in CI and staging before production.

## 8. Indexing and performance

Begin with indexes that support tenant-bound lists, lookups by Discord external ID, status/deadline queues, upcoming event schedules, registrations by event, matches by participant/status, and audit filters. Use `EXPLAIN ANALYZE` on slow queries and track query latency; do not add speculative indexes indiscriminately. Paginate all unbounded endpoints and use cursor pagination for high-volume audit/event streams where appropriate.

## 9. Backup and restore

Use managed database backups plus periodic logical exports as appropriate, encrypted and with strict access. Set measurable RPO/RTO before launch. Test restores to an isolated environment at a defined cadence; a backup not successfully restored is not a proven backup. Object storage and database references must be recovered consistently, and scheduled jobs should be reconciled after restore to prevent duplicate external sends.
