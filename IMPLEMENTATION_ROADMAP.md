# End-to-End Implementation Roadmap

**Rule:** milestones advance by acceptance evidence, not elapsed time or percentage of code written. This roadmap is intentionally staged; the entire vision is broader than the first production release.

## Milestone 0 — Product decisions and source reconciliation

**Work**

- Confirm final working name/domain approach.
- Obtain the legacy bot source repository and reconcile `dc_bot_rough(1).txt` against actual code; tag each behavior keep/rebuild/drop/defer.
- Approve P0/P1 boundaries, data retention, moderation principles, permissions, initial hosting regions and beta success metrics.
- Create ADR process and issue templates.

**Exit criteria**

- Every P0 feature has an owner, user outcome, security classification, acceptance criteria and dependency.
- Legacy features are not labeled verified until inspected/tested.
- Open decision log has explicit owner and deadline; unresolved policy choices block affected features.

## Milestone 1 — Repository and engineering foundation

**Work**

- Create GitHub repository and protect the default branch.
- Set up pnpm/Turborepo, TypeScript strict mode, lint/format, test runner, environment validation and CI.
- Establish apps/packages according to actual initial use; add `AGENTS.md`, tailored `.agents/skills`, docs and ADR template.
- Configure secret scanning, dependency audit, lockfile and branch checks.

**Exit criteria**

- Fresh clone can install/build/test from documented instructions.
- PR CI required checks fail on type/test/lint/security failure.
- No token or production environment value is committed.

## Milestone 2 — Domain contracts and persistence

**Work**

- Define canonical IDs, UTC clock strategy, request/event DTOs and error envelope.
- Implement PostgreSQL schema for identity, guild config, capability grants, audit, templates, scheduled actions/outbox and job execution.
- Add migrations, repositories, tenant context and transaction helpers.
- Implement deterministic domain services without Discord/API coupling.

**Exit criteria**

- Migrations create a clean database and upgrade from previous test schema.
- Transaction and tenant-scope integration tests pass.
- Outbox/job recovery logic is tested for publish interruption and replay.

## Milestone 3 — Authentication, tenant isolation, authorization, and action-safety boundary

**Work Completed**

- Implement Discord OAuth2 flow and secure server-side session lifecycle with SHA-256 session token hashing.
- Build server picker from authorized/manageable guilds and verified install state.
- Implement platform realm and guild realm as separate capability namespaces.
- Add grant/revoke/effective-access evaluation, audit, session revocation and cache invalidation.
- Implement API schema validation/response serialization, strict CORS allowlist, cookie CSRF protection, security headers and rate limits.
- **Action-Safety Policy Engine:** Central, transport-independent evaluation gate (`@nexus/authorization`) enforcing actor grants, Discord permission requirements, role hierarchy, bulk limits, mass mention suppression, and single-use confirmation tokens.
- **Administrator Support Model:** Safe handling of Discord `ADMINISTRATOR` permission (`0x8`) as an external transport capability that NEVER bypasses internal authorization, hierarchy, or safety ceilings.
- **Emergency Controls:** Per-guild and global emergency kill-switches halting mutations and pausing outbox dispatchers.
- **Destructive Operation Safeguards:** Cryptographic single-use confirmation tokens with 60s TTL and replay prevention.

**Exit criteria (Verified)**

- Cross-tenant negative tests pass for all existing endpoints/repositories.
- A normal guild admin cannot access platform routes (403 `REALM_MISMATCH`).
- Internal action policies reject unauthorized actions even when Discord grants `ADMINISTRATOR`.
- Emergency shutdown halts new actions and pauses worker event dispatch.
- Replayed, mismatched, or expired confirmation tokens are rejected.
- No sensitive tokens reach browser storage/logs.

## Milestone 4 — Bot installation, setup and diagnostics

**Work Completed**

- Built `@nexus/discord-adapter` package with clean separation between Discord transport details and domain contracts:
  - Dual installation invite link generator supporting both **Full Administrator Mode** (`0x8`) and **Restricted Granular Mode** calculated from verified capabilities.
  - Comprehensive guild diagnostics runner comparing bot permissions and highest role hierarchy against `CAPABILITY_PERMISSION_MANIFEST`.
  - Idempotent `GuildSetupService` creating required channels (`#audit-log`, `#announcements`, `#mod-log`) with safe repair that restores missing entities without duplicating intact ones.
  - Pure in-memory `FakeDiscordClient` conforming to `IDiscordRestClient` for fast, hermetic test runs.
- Built `apps/bot` service powered by `discord.js` v14 and bounded by the `@nexus/authorization` `ActionPolicyEngine`:
  - Standardized `CommandRouter` and slash command registry.
  - Interaction acknowledgement helper (`DiscordInteractionResponder`) enforcing 3-second acknowledgement deadlines with early deferrals and sanitized error presentation.
  - Slash command suite: `/diagnostics` (evaluates action policy and transport permissions), `/setup` (`start`, `status`, `repair`), `/config view`, `/help`, and `/status`.
  - Gateway event lifecycle handlers: `guildCreate` (creates initial settings, records audit event, posts onboarding embed), `guildDelete` (records disconnect audit event), and `interactionCreate` (resolves actor grants, validates transport permissions, routes commands).
  - All bot commands fail-closed through internal `ActionPolicyEngine` checks: Discord Administrator privileges can never bypass internal RBAC or emergency kill-switches.

**Exit criteria (Verified)**

- Setup is idempotent and repairs missing channels/settings safely without duplicates.
- Missing permission and role-hierarchy cases explain exact remediation based on the verified manifest.
- Bot mutations fail closed if Discord permissions or internal action policies are not satisfied.
- Bot restarts without duplicate setup artifacts or lost critical state.
- Automated tests pass across adapter and bot packages (12 test suites, 99 tests passing monorepo-wide).

## Milestone 5 — Base server dashboard and design system

**Work Completed**

- Built `@nexus/ui` shared design system package adhering strictly to `DESIGN_SYSTEM.md` and WCAG 2.2 AA:
  - Complete token architecture in CSS variables (`--surface-page`, `--surface-card`, `--surface-raised`, `--text-primary`, `--status-info`, `--status-success`, `--status-warning`, `--status-danger`, `--focus-ring`, `--font-sans`, `--font-mono`, tabular numbers).
  - Component library with full state matrix (default, hover, focus-visible, active, disabled, loading, empty, error, permission-denied):
    - `Button` (primary, secondary, danger, ghost, loading spinner, disabled)
    - `Badge` (semantic statuses with non-color dot indicators)
    - `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
    - `FormGroup`, `Input`, `Select`, `Textarea` (persistent labels, required asterisks, inline error validation)
    - `Dialog` (accessible modal with `role="dialog"`, `aria-modal="true"`, escape key, backdrop dismiss)
    - `TableContainer`, `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
    - `Alert` (`role="alert"`, status banners)
    - `Skeleton` (animated wave loading placeholder)
    - `EmptyState` and `PermissionDenied` (capability-aware access blocker)
- Built `apps/web` Server Dashboard on Next.js 15 App Router:
  - App shell with responsive sidebar navigation, breadcrumbs, server context switcher, and live emergency status indicators.
  - **Server Selector (`/`)**: lists authorized manageable guilds with install reach mode (`Administrator` vs `Granular`), health badges, and search filtering.
  - **Operational Overview (`/guilds/[guildId]`)**: live telemetry cards (scheduled events, disputes, mod cases 24h, audit events), enabled modules, and recent activity stream.
  - **Setup & Health Diagnostics (`/guilds/[guildId]/setup`)**: bot gateway latency, permission reach mode, role hierarchy verification, required operational channels (`#audit-log`, `#announcements`, `#mod-log`), and interactive "Safe Setup Repair" modal.
  - **Operations Modules Directory (`/guilds/[guildId]/modules`)**: modular control plane for Tournaments, Scrims, Moderation, Announcements, and Tickets with capability requirements and toggles.
  - **Roles & Capabilities Access Editor (`/guilds/[guildId]/capabilities`)**: explicit server-side capability bindings with Effective Access Evaluator ("Why can/can't this role do X?") and privilege escalation warnings.
  - **Audit Log Trail (`/guilds/[guildId]/audit`)**: high-density tabular operational log with category and text search filters, tabular numerals, and JSON payload inspection modal.
  - **Guild Configuration (`/guilds/[guildId]/settings`)**: timezone selection, fallback prefix, and Emergency Stop Killswitch halting mutations and worker outbox dispatch.
  - **Design System Workbench (`/design-system`)**: live interactive gallery testing and rendering all tokens, components, and state matrices.

**Exit criteria (Verified)**

- All protected data paths require explicit guild capability checks; route hiding is not the security boundary.
- Form inputs preserve values and expose persistent labels and accessible error summaries.
- Modal dialogs trap/manage focus and support keyboard escape dismissal.
- Next.js production build completes cleanly across all 8 static and dynamic routes.
- Automated tests pass monorepo-wide (14 test suites, 122 tests passing monorepo-wide).

## Milestone 6 — Core community operations

**Work**

- Moderation cases/actions, warning history, timeouts, safe purge, slowmode/lock/unlock.
- Welcome/leave, announcement template authoring/preview/publish/schedule, role self-service if approved.
- Tickets with archived closure/transcript retention, polls, giveaways and opt-in notifications.
- Capability checks, audit events and error/partial-success UX for each action.

**Exit criteria**

- Every command/API action has permission-denial tests, audit behavior and rate-limit handling.
- Scheduled actions survive restart and cannot execute twice due to retry.
- Destructive actions preview scope and follow data-retention rules.

## Milestone 7 — Game profiles and registration

**Work**

- Implement built-in starter game profile definitions plus tenant-owned clone/custom profiles.
- Implement versioned dynamic forms, field validation/visibility, solo/team entries, capacities, waitlist and deadlines.
- Implement player/team profile, invitations, roster changes, registration review and check-in.
- Build CSV export jobs with permission-controlled private storage.

**Exit criteria**

- New custom game profile can be created without code changes.
- Concurrent submissions cannot oversubscribe a registration cap or create duplicate active entries.
- Old submissions retain the form version and remain interpretable after schema edit.

## Milestone 8 — Tournament and match lifecycle

**Work**

- Competition/stage rules, start with single-elimination and round robin.
- Bracket/schedule generation, seeding, referee assignment, match reminders, score submission, evidence, disputes and final results.
- Tournament-specific announcements and standings.
- Build property/fixture tests for byes, ties, forfeits, cancellations, reschedule, corrected results and downstream progression.

**Exit criteria**

- Incompatible formats are rejected before publish.
- A match result cannot be approved by an unauthorized actor or silently overwritten.
- Bracket progression is transactionally safe or recoverable, versioned and auditable.

## Milestone 9 — Security depth and operational controls

**Work**

- Anti-spam/anti-raid rules with configurable thresholds, allowlists, quarantine/review and incident workflows.
- Platform feature flags, support case/access grant, incident console, job monitoring and audit search.
- Runbooks, alerts, restore drill, key rotation and tenant disconnect/deletion/retention jobs.

**Exit criteria**

- Incident actions are bounded, reversible when possible and produce an action timeline.
- Support access expires and is auditable.
- Backup restore and queue reconciliation have been exercised.

## Milestone 10 — Beta pilot and reliability hardening

**Work**

- Invite selected test guilds; provide support channel and feedback capture.
- Measure onboarding, command success, registration completion, schedule failure, latency, error rate and job backlog.
- Fix critical workflow, permissions, performance, accessibility and mobile issues.
- Verify policy, product claims and documentation against actual deployed features.

**Exit criteria**

- All P0 acceptance criteria pass on staging and pilot evidence is reviewed.
- Security owner and product owner sign off public beta risk register.
- SLO, alert thresholds and support escalation are defined from observed traffic.

## Milestone 11 — Public beta / general availability

**Work**

- Public product docs, privacy/terms, support escalation, status page as appropriate, onboarding and release notes.
- Protect feature rollout; monitor incidents and rollback options.
- Establish data-retention request handling, operator-access reviews and dependency update cadence.

**Exit criteria**

- No blocker-level defect; critical/high security findings resolved or accepted in writing with expiry.
- Operational and security runbooks are owned and current.
- Product marketing makes no promises beyond shipped and verified capabilities.

## Milestone 12 — Scale and commercial readiness

Only after real usage justifies it: bot sharding, worker pool separation, read-replica/query tuning, subscription/entitlement model, localization breadth, external game API integrations and advanced analytics. Each expansion has its own ADR, threat review, budget and support plan.

## Work item template

Every implementation task includes:

- Outcome and user story.
- Dependencies and related requirements section.
- Domain/data/API/UI/Discord changes.
- Permission capability and tenant scope.
- State transitions and failure paths.
- Migration/backfill/retention impact.
- Test cases and security negative cases.
- Logging/metrics/alert impact.
- Acceptance criteria demonstrable in staging.
- Documentation/runbook updates.
- Rollback or forward-fix plan.

## Definition of Done

A task is done only when the implementation meets the contract; authorization and validation live server-side; relevant unit/integration/e2e tests pass; UI states/accessibility are reviewed where applicable; durable side effects are idempotent; logs/metrics are safe and useful; migration/deployment/recovery instructions exist; docs match implementation; and unresolved limitations are stated explicitly.
