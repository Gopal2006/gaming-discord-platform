# Nexus — Gaming & Esports Discord Platform

> Working product codename: **Nexus**. Final brand, domain, and public repository name remain subject to a name/trademark check. The proposed repository name is `gaming-discord-platform`.

This repository is the **source of truth for what we intend to build and how we will build it**. It is a product-and-engineering specification pack, not implemented application code. The supplied `dc_bot_rough(1).txt` was used as a reference inventory of the prior Python/Pycord bot; its claims are not treated as proof of the code's present behavior because the original source repository was not supplied.

## Product direction

Build a secure, configurable, multi-tenant platform for gaming and esports Discord communities. The product has three interfaces backed by shared domain rules:

1. **Discord bot** — commands, buttons, modals, automated events, announcements, community operations, moderation, registration, matches and tournaments.
2. **Server dashboard** — a server owner and explicitly delegated staff can configure their own guild, modules, custom game profiles, forms, templates, competitions, security policies, tickets and reports.
3. **Platform control plane** — the product's creator/operator team can manage platform-wide health, access, releases, incidents, support, feature flags and later commercial plans. It is not an expanded server-admin panel; it is a separate security boundary.

The ambition is broad coverage, but implementation must be staged and dependable. We will not describe a capability as available until it is implemented, authorized, observable, tested, documented and deployed.

## Read in this order

| Order | Document                                                           | Purpose                                                                                              |
| ----: | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
|     1 | [`PRODUCT_SCOPE.md`](PRODUCT_SCOPE.md)                             | Product principles, launch scope, priorities, explicit non-goals and decision policy                 |
|     2 | [`REQUIREMENTS.md`](REQUIREMENTS.md)                               | Detailed product requirements, role catalog, acceptance criteria and end-to-end baseline             |
|     3 | [`LEGACY_RECONCILIATION.md`](LEGACY_RECONCILIATION.md)             | Explicit disposition of reported legacy Nexus features and unsafe patterns to replace                |
|     4 | [`ARCHITECTURE.md`](ARCHITECTURE.md)                               | Runtime topology, module boundaries, stack and request/event flow                                    |
|     5 | [`AUTHORIZATION_SECURITY.md`](AUTHORIZATION_SECURITY.md)           | Trust boundaries, server isolation, roles, permissions, threat controls and incident handling        |
|     6 | [`DATA_MODEL.md`](DATA_MODEL.md)                                   | Domains, entities, relationships, persistence and migration rules                                    |
|     7 | [`BOT_SPEC.md`](BOT_SPEC.md)                                       | Discord command model, interaction behavior, intents, installation and bot runtime                   |
|     8 | [`SERVER_DASHBOARD_SPEC.md`](SERVER_DASHBOARD_SPEC.md)             | Information architecture and requirements for server-owner/staff web UX                              |
|     9 | [`PLATFORM_CONTROL_PLANE_SPEC.md`](PLATFORM_CONTROL_PLANE_SPEC.md) | Platform operator tools, break-glass controls and global governance                                  |
|    10 | [`GAMING_ESPORTS_DOMAIN.md`](GAMING_ESPORTS_DOMAIN.md)             | Extensible game schemas, registrations, teams, tournaments, scrims, results and disputes             |
|    11 | [`WORKFLOW_STATE_MACHINES.md`](WORKFLOW_STATE_MACHINES.md)         | Legal states/transitions for announcements, tickets, moderation, registrations, tournaments and jobs |
|    12 | [`COMMAND_CATALOG.md`](COMMAND_CATALOG.md)                         | Proposed command surface and legacy command reconciliation                                           |
|    13 | [`API_AND_EVENTS.md`](API_AND_EVENTS.md)                           | API conventions, event contracts, idempotency, queue behavior and error model                        |
|    14 | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)                             | Visual direction, design tokens, components, states, motion and quality gates                        |
|    15 | [`PUBLIC_SITE_SPEC.md`](PUBLIC_SITE_SPEC.md)                       | Product landing page and conversion flow, separate from the admin dashboard                          |
|    16 | [`RELIABILITY_DEPLOYMENT.md`](RELIABILITY_DEPLOYMENT.md)           | Environments, CI/CD, operations, recovery, scaling and release controls                              |
|    17 | [`TESTING_QUALITY_GATES.md`](TESTING_QUALITY_GATES.md)             | Test strategy, security tests, visual QA and release gates                                           |
|    18 | [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md)           | Sequenced milestones and evidence required before moving to the next stage                           |
|    19 | [`SKILL_SOURCE_CATALOG.md`](SKILL_SOURCE_CATALOG.md)               | Skills researched, selected source paths and how their principles were adapted                       |
|    20 | [`AGENTS.md`](AGENTS.md)                                           | Repository-wide instructions for AI coding agents and human contributors                             |
|    21 | [`ADR_TEMPLATE.md`](ADR_TEMPLATE.md)                               | Template for recording significant product/architecture/security decisions                           |

Project-specific agent skills live under [`.agents/skills/`](.agents/skills/). They are original instructions tailored to this product; they do **not** vendor the upstream skill text. They cover visual engineering, design-system governance, forms/state machines, accessibility, motion/performance, verification/review, and reliable external side effects.

## Core engineering decisions

- **Language/runtime:** TypeScript on a supported Node.js LTS release; exact versions are pinned in lockfiles and updated deliberately.
- **Repository:** pnpm workspace + Turborepo monorepo, divided into apps and shared packages.
- **Bot:** discord.js, persistent Gateway process, slash commands and interactive components; message-content intent is not enabled by default.
- **Dashboard:** Next.js App Router, React, TypeScript, Tailwind CSS, accessible component primitives, React Hook Form for complex forms and TanStack Query for client-side server state where needed.
- **API:** Fastify with typed, validated request/response contracts. Route handlers remain thin; authorization occurs server-side in the application/domain layer.
- **Primary data:** managed PostgreSQL + Drizzle ORM and checked-in migrations.
- **Async work:** managed Redis + BullMQ workers for reminders, scheduled publication, workflow transitions and retryable jobs. PostgreSQL is the durable source of truth.
- **File assets:** S3-compatible object storage with private-by-default access for evidence and personal data.
- **Observability:** structured logs, metrics, traces, error reporting and auditable business events.
- **Initial deployment:** dashboard on a compatible Next.js host; long-running bot, API and queue workers on a container host; managed PostgreSQL, Redis and object storage. Containerized services must remain portable to a larger cloud later.

Treat these as the approved starting baseline unless an ADR (`docs/decisions/ADR-*.md`) records evidence for a change. This is not a reason to chase the newest tool for its own sake.

## Product rules that apply everywhere

1. Server tenants are isolated in the service layer and database access patterns; hiding another server in the UI is not security.
2. Platform authority and guild authority are different capabilities with different sessions/authorization rules.
3. The database is the source of truth for registrations, permissions, settings, match state, and audit records. Redis is not the only persistence layer for business-critical data.
4. Every user-visible asynchronous operation has an explicit state: idle, submitting, success, failure, retryable failure, or pending/processing where appropriate.
5. Destructive or high-impact actions require permission checks, confirmation and audit trails; where possible they also support preview, undo or a recovery plan.
6. Templates and game profiles are data/schema driven. A new game must not require copying every command implementation.
7. A feature is not done because the happy path works. Permission denial, empty data, Discord API failure, queue retry, duplicate request, restart recovery, mobile layout and accessibility must be considered.
8. Do not copy upstream design skills verbatim. Adapt principles to the product, preserve source links, and honor the licenses/attribution requirements of any material that is later copied into the codebase.

## Current status

- [x] Reviewed the submitted Nexus audit report as a reference inventory.
- [x] Researched the six provided design/agent-skill repositories and selected relevant skill documents.
- [x] Prepared this production-oriented specification pack and tailored agent skills.
- [ ] Reconcile audit claims against the original source code (source repository not attached).
- [ ] Create the actual GitHub repository and commit this pack.
- [ ] Approve the open product decisions listed in `PRODUCT_SCOPE.md` before public beta.
- [ ] Build and test the application. No bot/dashboard feature is implemented by this documentation pack alone.

## Main reference sources

See [`SKILL_SOURCE_CATALOG.md`](SKILL_SOURCE_CATALOG.md) for exact skill file links and adaptations. Current official technical references used to validate the stack should also be consulted during implementation, especially [Next.js App Router](https://nextjs.org/docs/app), [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication), [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/), and [Drizzle migrations](https://orm.drizzle.team/docs/migrations). Always check current official docs before implementing version-sensitive behavior.
