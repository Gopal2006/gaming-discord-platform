# Discord Bot Specification

## 1. Product role

The bot is an interaction surface for the platform. It should make common actions convenient in Discord while complex configuration, bulk administration, detailed analytics and tournament setup live in the dashboard. Bot commands and dashboard operations must call the same application/domain use cases and use the same authorization policies.

## 2. Command conventions

- Use **slash commands** as the default public interaction. Add context-menu commands where acting on a user/message is more discoverable than typing a command.
- Avoid a custom no-prefix dispatcher. It increases ambiguity, makes command auditing and discovery harder, and can require the privileged Message Content intent. Only introduce a prefix command set if a demonstrated user need and intent approval justify it.
- Use command groups and subcommands by domain (`/mod warn`, `/event create`, `/tournament match`, `/template preview`). Keep names predictable and descriptions action-oriented.
- Use autocomplete and select menus for known choices; do not require admins to copy opaque IDs unless that is an advanced fallback.
- Dangerous commands must state the target, scope and consequences; require confirmation for mass/destructive actions and enforce actor/target/bot hierarchy.
- Ephemeral responses are used for private diagnostics, participant personal data and configuration confirmation; public actions post only where the configured workflow requires them.
- All long-running command work defers early, tracks a durable status and produces a useful completion/failure follow-up.

## 3. Command catalog by domain

Names below are proposed design targets, not registered commands yet. Final syntax may be revised during command contract implementation and documented in generated command reference.

### Setup and configuration

- `/setup start|status|repair` — guided setup, prerequisites, health and safe repair.
- `/config view|module|channel|role|timezone|privacy` — inspect/configure allowed server settings.
- `/permissions view|grant|revoke|test` — inspect a user/role's effective capabilities and test an intended action. High-privilege changes require owner authorization and confirmation.
- `/diagnostics` — verify required bot permissions, role hierarchy, configured channels, intents and integration status.
- `/help` and `/status` — contextual help and bot/feature health; never leak platform secrets.

### Community and moderation

- `/mod warn|timeout|untimeout|kick|ban|unban|history|case|note|purge|slowmode|lock|unlock`.
- `/report create|status|withdraw` — member report intake and review status where policy allows.
- `/appeal create|status` — moderation appeal workflows.
- `/security status|verify|quarantine|review|incident` — only the actions granted to actor; incident controls have strict checks and high-impact audit.

Every disciplinary action records actor, target, reason, timestamp, scope, operation result and case identifier. Reasons are required for punitive actions. Private DM notification is best-effort and reported accurately; inability to DM must not cause the moderation action to be misreported as failed if it succeeded.

### Announcements and notifications

- `/announce create|preview|publish|schedule|list|cancel`.
- `/template list|preview|clone` for authorized users; complex authoring is on the dashboard.
- `/reminder create|list|cancel`.

The bot must not publish until permission, destination, template variables, allowed mentions, attachment size/type and schedule are validated. Scheduled announcement state belongs in PostgreSQL; worker execution is idempotent. Show `scheduled`, `publishing`, `published`, `partially_failed`, `failed` and `cancelled` states rather than one generic success.

### Events, registration and tournament operations

- `/event list|view|register|unregister|status|check-in`.
- `/team create|invite|join|leave|roster|captain`.
- `/tournament list|view|check-in|my-matches|report-score|dispute|standings`.
- `/scrim request|list|accept|decline|cancel` where enabled.

Public commands expose only public event data. Player PII, registration answers, room passwords and private evidence are visible only to authorized users or matched participants at configured times. Never place private lobby credentials in a publicly visible embed.

### Community engagement and support

- `/poll create|close|results`.
- `/giveaway create|end|reroll|list` with eligibility rules, auditable selection and explicit randomness policy.
- `/ticket open|claim|close|reopen|add|remove|transcript` as authorized by ticket policy.
- `/suggestion submit|status`, `/faq search`, `/member profile` and self-role UI where modules are enabled.

### Information and utilities

- `/server overview`, `/member info` and `/bot invite` (or a help card).
- Provide pagination/search, clear rate-limit feedback, permission-aware suggestions and accessible component labels.

## 4. Non-command behavior

- `guildCreate`: send minimal onboarding guidance, record guild installation and queue a setup reminder without assuming `Administrator` access.
- `guildDelete`: record disconnect, stop tenant jobs and follow documented retention/deletion policy; do not instantly erase required compliance/audit records without the approved retention flow.
- `guildMemberAdd`/`guildMemberRemove`: welcome/farewell only if explicitly configured; do not collect more member data than required.
- Moderation and security events: write durable case/audit records and route configured notifications.
- Scheduler/worker events: announcements, reminders, check-in deadlines, registration closure, role expiration where supported, tournament transitions and retention.
- Interaction component events: verify durable object ID, guild, actor access, current object state and component version; component custom IDs are identifiers, not proof of authorization.
- Bot permission change / missing channels: detect degraded capability, expose diagnostics and alert configured admins where possible.

## 5. Discord permissions and intents

Use minimum scopes and permissions. Do not request Discord's `Administrator` permission by default. Create a feature-to-permission matrix and provide a human-readable install explanation. The exact permission bitset is generated from enabled P0 features, reviewed before launch and tested in a staging server.

Message Content, Guild Members and Presence are privileged intents and are not enabled by default unless a documented feature genuinely requires them and Discord application configuration/approval is completed. Prefer interaction payloads and specific event data over scraping message history. Presence is not needed for core moderation, tournaments or registrations; exclude it from P0.

Bot actions must check role hierarchy and target validity immediately before execution. A cached permission result is not enough for high-impact actions. The bot should explicitly refuse actions against the guild owner, itself, the actor where prohibited, a peer/superior moderator if policy forbids it, or a target above the bot role.

## 6. Resilience and interaction correctness

- Acknowledge interactions within Discord's response deadline; defer before I/O that may be slow.
- Respect Discord rate limits and `retry_after`; use bounded retries for transient errors only.
- Reconcile interaction outcome if the connection drops after a request. Avoid duplicate bans, posts, ticket channels or registrations.
- Use persistent component handling and rehydrate active views from stable IDs/state on startup where required by the library's capabilities.
- Store external IDs (guild, channel, message, user, role) as strings in JSON and `BIGINT`/safe representations in the database; never depend on 32-bit integers.
- Detect missing/deleted destination channels and bot permission loss; fail with repair instructions instead of unhandled exceptions.
- Every action log should distinguish actor intent from confirmed effect.

## 7. Announcement and broadcast policy

Role-wide DMs are not a default feature. Prefer a published channel announcement, opt-in notification roles, or a user-initiated notification. If direct broadcast is later enabled: require a separate capability, explicit preview/recipient count, rate and concurrency limits, opt-in/eligibility checks, confirmation, durable job, cancellation, suppression of repeat sends, accurate delivered/failed/blocked counts and audit logging. Respect Discord policies/rate limits; do not attempt to bypass them.

## 8. Ticket behavior

Closing a ticket should normally mark it closed, revoke customer write access, persist metadata, optionally create a permission-controlled transcript and start a retention timer. Deleting the channel is a later operation with an explicit retention and restore policy, not the only closure behavior. Opening a ticket must be idempotent per configured limit and handle concurrent button clicks without creating duplicates.

## 9. Command implementation checklist

For every command: contract/type and examples; guild/DM availability; exact permission capability; actor/target hierarchy; input validation; acknowledgement timing; public/ephemeral response; state transition; side effects; audit event; rate limit/cooldown; error responses; idempotency; tests for permitted and denied actors; docs generation; metrics. No command is considered complete without the associated authorization tests.
