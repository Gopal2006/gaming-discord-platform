# Reliability, Deployment and Operations Runbook

## 1. Deployment topology

### Initial production topology

- **Web dashboard:** Next.js App Router on a host with supported Node/Next deployment and preview environments (Vercel is a candidate).
- **Bot:** persistent Node.js container/service maintaining Discord Gateway connection (Railway or equivalent always-on container host is a candidate). Not a short-lived serverless function.
- **API:** persistent container/service or platform-supported server runtime for Fastify. Deploy independently from the web app when necessary.
- **Worker:** separate persistent process(es) for BullMQ jobs, with graceful shutdown and concurrency/rate limits.
- **Database:** managed PostgreSQL with encrypted connections, automated backups and tested restore.
- **Queue/cache:** managed Redis with private networking where possible, authentication/TLS and durability/configuration appropriate for BullMQ. It remains rebuildable; PostgreSQL/outbox is authoritative for critical state.
- **Assets:** S3-compatible object storage with private buckets for evidence/exports and a lifecycle policy.
- **Observability:** centralized structured logs, error reports, metrics and traces.

Use environment portability and Dockerfiles for bot/API/worker. Keep provider-specific details in deployment manifests/adapters, not domain logic. A later move to ECS/Fargate or another orchestration platform should not require a domain rewrite.

## 2. Environments

- `local`: developer credentials and isolated services; no production data.
- `test`: disposable Postgres/Redis and deterministic fakes/fixtures.
- `staging`: separate Discord application/bot where possible, a dedicated staging guild, isolated data and production-like deployment/migration flow.
- `production`: isolated credentials, database, Redis, bucket and alerting.

No shared production token in developer `.env` files. `.env.example` lists names and placeholders only. Build step must not expose server-only secrets through `NEXT_PUBLIC_*` or compiled browser bundles. Require a pre-deploy check that all required environment variables are validated and that optional integration variables behave intentionally when absent.

## 3. CI/CD pipeline

On every pull request:

1. Install from lockfile with pinned Node/pnpm.
2. Formatting/lint, type check and compile/build.
3. Unit tests and domain invariants.
4. API/DB integration tests with ephemeral PostgreSQL; queue tests with isolated Redis or test adapter.
5. Security checks: secrets, dependency audit, license policy, static checks and tenant-isolation test suite.
6. Database migration validation against an empty and previous schema.
7. Web e2e/smoke tests and (where available) visual screenshot comparisons.
8. Build container images and validate runtime health-check behavior.

On merge/release:

- Publish immutable artifacts by commit SHA.
- Deploy to staging and apply migration once via a controlled job.
- Run smoke, auth, critical workflow and staging-guild tests.
- Promote by explicit approval or protected release rule.
- Deploy backward-compatible code; use expand/contract schema rollout.
- Verify health/error/job metrics; automatically halt or rollback on release-gate breach when safe.
- Record release, migration version and operator/automation identity.

Rollback must account for DB schema/data changes. If a migration is not reversible, use a tested forward-fix/recovery procedure instead of promising an unsafe application rollback.

## 3.1 Proposed beta service objectives (approve and validate before public beta)

These are **starting targets**, not existing guarantees. Validate cost and feasibility in staging/pilot and adjust through a written SLO decision before public beta:

- Dashboard/API monthly availability: **99.5%**, excluding explicitly announced planned maintenance if the policy defines it.
- Normal API read latency: p95 under **500 ms** at agreed baseline load, excluding endpoints that wait on Discord or other external providers.
- Scheduled job start: at least **99%** of eligible scheduled jobs start within **60 seconds** of due time while dependencies are healthy and backlog is within the tested load envelope.
- Critical outbox/job reconciliation: detect stuck critical work within **5 minutes** and surface an actionable alert.
- Initial recovery targets: **RPO ≤ 24 hours** and **RTO ≤ 8 hours** for the pilot, until the business chooses a stronger target and funds the required design.
- No numeric target substitutes for correct behavior: tenant-isolation, authorization, idempotency and data integrity invariants are zero-tolerance release gates.

Measure at least two pilot cycles, report actual performance and error budget, and define whether these targets become contractual or internal service-level objectives.

## 4. Process and shutdown rules

- Bot performs graceful Gateway disconnect and checkpoints/reconciles in-flight work where possible.
- API stops accepting new work, completes bounded in-flight requests and closes DB/Redis connections.
- Worker stops claiming jobs, finishes or safely releases leased jobs, then closes dependencies.
- Job processing is idempotent so interrupted jobs can be retried.
- Readiness goes false before shutdown; liveness only reports whether the process itself is responsive.
- Do not make health checks depend on every optional external provider if that would trigger restart loops during provider outage. Expose dependency health separately.

## 5. Observability

### Logs

Structured JSON with timestamp, level, service, version, request/correlation ID, actor/tenant references when appropriate, action category, resource IDs and safe error class. Redact tokens, session cookies, authorization headers, signed URLs, webhook URLs, private evidence links and unnecessary user content. Logs must not be the only record of business state.

### Metrics

- API request counts, latency distributions, error rates and rate limiting.
- Discord Gateway connection/reconnect, REST error classes, rate-limit waits and missing permission events.
- Queue waiting/active/completed/failed counts, oldest job age, attempts and dead-letter count.
- Database connection pool saturation, query latency, lock waits and storage trend.
- Registration/tournament workflow counts and failed transitions.
- OAuth callback failures and authorization-denied trends without logging secrets.
- Bot/API/worker resource usage and deployment version.

### Alerts

Alert on user-visible failure, not just process failure: rising failed announcements, growing stuck jobs, DB saturation, repeated tenant-authz failures, loss of Gateway connection, failed scheduled deadlines, failed backups, elevated 5xx, and unusual privileged actions. Use rate thresholds and deduplication to avoid alert storms.

## 6. Backups and recovery

- Set RPO/RTO after the owner chooses acceptable loss/downtime for the pilot.
- Enable managed Postgres backups and validate restore into an isolated environment on a scheduled cadence.
- Define object-store versioning/lifecycle/backups for evidence and exports where required.
- Keep migration release notes and recovery steps.
- After restore, reconcile outbox and scheduled jobs, ensure no old announcement re-sends, revalidate OAuth sessions/credentials as required and confirm bot state.
- Backups are encrypted and access restricted; backup retention differs from ordinary retention policy and must be documented.

## 7. Rate limits and queue operations

- Per-guild and per-feature concurrency limits protect a single active server from consuming all worker capacity.
- Discord API calls honor current limits and response retry windows. No unbounded fanout on role-wide operations.
- Scheduled jobs are partitioned by expected workload; long exports must not starve time-sensitive check-ins and announcements.
- Job retry policy uses bounded attempts, backoff/jitter and terminal failure classification. Invalid permission/config errors do not retry forever.
- Provide operator views for failed/stuck jobs, safe retry, cancel, and inspect. Retrying a partially completed external action must first check whether the action already occurred.

## 8. Release management

Feature flags are versioned configuration, not a substitute for authorization. High-risk features launch to internal/staging guilds first. Any migration affecting registrations, tournament brackets, permissions or templates requires a data migration test and a rollback/forward-fix plan. Use canary/gradual rollout only when the deployment platform and tenant targeting can support it reliably.

## 9. Runbooks required before beta

- Discord token leakage and rotation.
- OAuth app/session compromise.
- Unauthorized cross-tenant access.
- Bot loses required guild permissions or role hierarchy.
- Discord REST/Gateway outage or rate-limit spike.
- Queue backlog / worker crash / duplicate-job report.
- Bad application release or database migration.
- Database outage, accidental deletion and restore.
- Object storage exposure or evidence link leak.
- Mass spam/raid or suspicious admin action.
- Failed scheduled tournament deadline/result publication.
- Platform operator compromise and break-glass access.

Every runbook identifies the incident commander/decision owner, severity, immediate containment, evidence to preserve, safe communication, recovery verification and post-incident review.
