# Product Scope and Product Decisions

**Status:** approved working direction; launch-policy decisions are intentionally identified below.  
**Product codename:** Nexus (not final brand).

## 1. Vision

Provide one dependable operating platform for gaming and esports Discord servers: community safety, configurable communication, support, game registrations, teams, competitive events, staff workflows, reporting, and a useful web dashboard. The platform should be flexible enough for a small friend group, a college gaming club, an esports organizer, or a multi-game competitive community without forcing each server into one workflow.

The product succeeds when a server can configure most routine operations without editing code, organizers can run a complete event lifecycle with fewer manual errors, server admins understand exactly what their delegated staff can do, and platform operators can safely operate the service across many independent guilds.

## 2. Audited reference baseline versus future scope

The attached `dc_bot_rough(1).txt` describes the following legacy/reference features: `/setupbot`, bot-role configuration, welcome/leave messages, log channel configuration, server statistics, global bot presence management, moderation actions, warnings, purges, locks/slowmode, announcement modals, direct messages including role broadcasts, giveaways, interactive polls, support-ticket panels and provisioning, timeout expiration, giveaway countdown jobs, member lifecycle events, command logs and an `aiohttp` dashboard with operator accounts, WebSockets and SQLite.

Those items are retained as **requirements to evaluate**, not as an implementation to blindly port. Some legacy choices are not acceptable as-is for a production multi-tenant service. Examples include broad role-based authority over every bot function, role-wide DM broadcasting without a stronger anti-abuse workflow, passcode-based dashboard operators, destructive ticket deletion without retention/export policy, a custom non-prefix command dispatcher, and a single SQLite file used for multi-process/cloud operation. Replace the underlying design where necessary while preserving useful user outcomes.

The product extends well beyond that baseline with schema-driven game profiles, reusable announcement templates, registration forms, teams/rosters, tournaments, match operations, disputes, self-service configuration, audit/search, platform governance and operational recovery.

## 3. Product principles

1. **Server autonomy with platform safeguards:** each server configures its own modules, policy and staff access within platform guardrails.
2. **Least privilege:** permissions are actions/capabilities scoped to a tenant and resource, not one all-powerful `bot-admin` role.
3. **Customizable, not infinitely bespoke:** schemas, templates, workflow configuration and feature modules provide flexibility; unrestricted script execution or per-server plugins are not part of the initial product.
4. **Discord-first, not Discord-only:** the bot remains useful alone; the dashboard makes complex configuration and bulk workflows practical.
5. **Safe by default:** sensitive features are opt-in, dangerous mentions are restricted, private data is private, and destructive actions have a recovery-aware path.
6. **Operational transparency:** explain permissions, prerequisites, state and failures. Record enough audit evidence to answer who changed what, when, in which server and through which interface.
7. **No fake completion:** scheduled means the durable job exists; sent means Discord confirmed publication. Similar distinction applies to registrations, score submissions, approvals and refunds/reversals.
8. **Craft with evidence:** visual quality is judged through rendered screens and real interactions, not only code review or subjective preference.

## 4. User groups and core jobs

- **Community member/player:** understand server rules, choose roles, register for an event, join a team, check status, check in, submit evidence/results when authorized and contact staff.
- **Server owner:** connect the guild, run setup, choose modules, authorize staff, set privacy and moderation rules, configure templates, inspect audit events, export data and disconnect the bot.
- **Server administrator:** manage only the capabilities delegated to them, see setup/permission health, preview changes, publish allowed communications and troubleshoot safely.
- **Moderator/safety staff:** review alerts, moderate with reasons, handle reports/appeals, use incident workflows and access only necessary participant information.
- **Tournament organizer:** create a game configuration, registration form, roster rules, event format, schedule and announcement workflow; resolve event operations and publish results.
- **Referee:** view assigned matches, collect submissions/evidence, approve or contest results and create a decision trail; no access to global server settings unless separately granted.
- **Registrar/event staff:** manage entries and check-in but not alter match scores or issue moderation actions unless granted.
- **Support operator:** respond to platform support cases and view only what is necessary. Access to customer tenant data is narrowly controlled and audited.
- **Platform operator:** manage approved system operations, feature flags, incident controls, deployments and cross-tenant support under explicit platform capabilities.
- **Platform owner/security owner:** control identity, break-glass, platform governance and security response; still must use auditable workflows for consequential actions.

## 5. Scope tiers

### P0 — production foundation (must precede beta)

- Discord installation/OAuth onboarding, guild discovery, server selection and disconnected/permission-degraded states.
- Separate platform identity/authorization and guild-scoped authorization.
- Server config, module enablement, capability editor, audit trail and bot-permission diagnostics.
- Secure core API, PostgreSQL migrations, job queue, health checks, metrics/logs, backup/restore, CI/CD and environments.
- Welcome/leave configuration; announcement templates and safe publishing; core moderation with reasons and durable cases; log routing; polls; giveaways; tickets with archive/transcript policy.
- Schema-driven game profiles and registration forms; participant export with strong authorization; basic events, teams, check-in and a minimal tournament lifecycle.
- Dashboard design system, accessible forms, search/filter, empty/error/loading/permission-denied states and responsive core workflows.
- Automated unit/integration/e2e/security tests and documented incident/rollback procedures.

### P1 — competitive operations and safety depth

- Bracket formats, stages, seeding, match reporting, result confirmations, evidence access, disputes and referee assignment.
- Scrim requests, scheduling, team rosters/substitutes, recurring templates and event duplication.
- Anti-raid/anti-spam configuration, verification gates, quarantine/review queues, escalating incident response and appeals.
- Detailed analytics, audit search, notification preferences, CSV/JSON exports, improved admin workflows and richer module configuration.

### P2 — scale and platform maturity

- Bot sharding and horizontally scaled queue workers where metrics justify them; advanced reporting, configurable quotas and subscription/entitlement model.
- More comprehensive localization, notification delivery controls, public status/incident communication and advanced operator tooling.
- External game integrations only where official/public APIs and their terms permit stable access. Avoid brittle scraping, credential collection or automation that violates game/platform terms.

### Explicitly not in initial release

- Arbitrary tenant-provided executable code, arbitrary SQL, arbitrary HTTP callbacks without an allowlisted secure integration model, or user-defined scripts executed in the bot process.
- Guaranteed anti-nuke prevention, guaranteed delivery to members who block DMs, guaranteed identity verification from an in-game username alone, or claims of data unavailable from Discord/game APIs.
- Payments/prize custody/escrow, gambling mechanics or cash prize handling before legal, tax, fraud, and payment-provider requirements are assessed.
- A microservice per domain, Kubernetes, event sourcing for every aggregate, or a new technology solely to appear scalable.

## 6. Definition of a configurable game profile

A game profile is data, not a branch in command code. It defines display metadata, team-size options, player fields, field validation, optional region/platform/rank values, roster rules, registration eligibility, event-format capabilities, score model, match metadata fields, announcement template bindings and any integrations. The schema version is persisted on registrations and events. A later schema edit must not silently reinterpret prior submissions.

A profile may declare which tournament formats and scoring modules it supports. A generic tournament engine must not imply that every format works for every game: compatibility is explicit and validated before an organizer can publish an event.

## 7. Success measures

- Time from installation to successful first configuration and first published announcement.
- Percentage of new servers completing setup without platform support.
- Registration completion/error rate and duplicate-submission rate.
- Tournament event completion rate, no-show rate and dispute resolution time.
- Failed job rate, duplicate publication count, Discord API error rate and recovery time.
- Permission-denial correctness and cross-tenant isolation test results.
- Dashboard task success rate, median workflow completion time, accessibility defects and Core Web Vitals.
- Incidents caused by unauthorized actions, privilege drift or data exposure.

Define exact numerical targets after the first instrumented pilot establishes a baseline; do not invent performance claims before measurement.

## 8. Decisions that must be signed off before public beta

| Decision                   | Default recommendation                                                                                                            | Why it matters                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Public product name/domain | Keep `Nexus` as a working codename; run name/trademark checks before launch                                                       | Brand and repository naming should be intentional            |
| Legacy Python source       | Obtain source repo and reconcile each audit claim; do not port without evidence                                                   | The attachment is an audit, not source code                  |
| Installation permissions   | Request least-privileged intents and permissions; no Administrator permission by default                                          | Reduces blast radius and increases user trust                |
| Dashboard auth             | Discord OAuth2 with securely managed server-side sessions; evaluate MFA/step-up for platform admins                               | Avoid shared passcodes and local Discord-password collection |
| Platform roles             | Named capability grants, separation of duties, audited break-glass                                                                | A platform owner role must not be confused with server staff |
| Retention                  | Publish baseline retention periods for audit logs, tickets, evidence, registrations and backups                                   | Data minimization, privacy and legal obligations             |
| Admin destructive actions  | Require confirmation, reason and audit; define recovery windows per feature                                                       | Prevent accidental bulk changes                              |
| DM/broadcast policy        | Opt-in announcements or Discord channel announcements by default; role-wide DM sends disabled or explicitly rate-limited/approved | Avoid abuse, failed delivery and account reputation issues   |
| Game integrations          | Manual forms first; integrate only stable, authorized APIs later                                                                  | Player IDs and APIs differ by game/region                    |
| Billing/prizes             | Exclude from P0 until explicitly scoped and compliance reviewed                                                                   | Adds payment, fraud and jurisdiction-specific requirements   |
| Service objective          | Set pilot SLO after measuring real load, then set production SLO/alert thresholds                                                 | Availability promises need evidence and operating budget     |
| Hosting regions            | Choose based on latency, data residency, cost and provider capabilities                                                           | Do not hardcode one provider into business logic             |

## 9. Change-control policy

Any material scope/stack/security change requires an Architecture Decision Record in `docs/decisions/ADR-NNNN-title.md` with context, decision, alternatives, consequences, migration plan and owner. Changes to permissions, data visibility, retention, destructive workflows, auth or tenant isolation require security review and tests. A launch requirement may not be downgraded simply to make a milestone appear complete.
