# Testing Strategy and Quality Gates

## 1. Testing philosophy

A green build is necessary but not sufficient. The platform's highest-risk failures are cross-tenant data exposure, incorrect delegated permission, duplicate external actions, lost scheduled work, invalid tournament progression and dashboard UI states that encourage the wrong action. Tests should be layered around domain invariants, boundaries and critical user workflows.

## 2. Test layers

### Static and build checks

- TypeScript strict type check with no unexplained `any` in boundaries/security-sensitive code.
- Lint/format and production build for each app/package.
- Import-boundary/layer checks where maintainable.
- Secret scan, dependency audit, license policy and generated API/schema drift.
- Migration lint/review and schema compatibility checks.

### Unit tests

- Domain state transitions, scoring, eligibility, tie-breakers, role/capability evaluation, rate-limit policy and template rendering.
- Time-based behavior with an injected clock; no sleep-based fragile tests.
- State-machine properties: invalid transition rejected; terminal states cannot reopen implicitly; accepted result invariants hold.
- Sanitization, allowed mentions, game-profile validation and dynamic form schema constraints.

### Database integration tests

Use disposable PostgreSQL with real migrations. Test transactions and constraints, tenant-scoped queries, duplicate registrations, caps under concurrency, roster lock, permissions revision, outbox durability and migration/backfill behavior. Tests must not rely solely on mocked repository methods for integrity rules.

### Queue/worker tests

Test delayed jobs, retryable/non-retryable errors, timeouts, cancellation, job replay, idempotency, stale job after state change, outbox reconciliation, worker shutdown and a provider action succeeding while the response is lost. Verify no duplicate announcement/notification is generated.

### API tests

Cover authentication, session expiry/revocation, request/response schema validation, tenant scoping, capability denial, response redaction, CORS/CSRF policy, rate limits, idempotency and conflict handling. Include list/detail/search/export/download routes, not only update endpoints.

### Bot adapter tests

Mock Discord REST/Gateway interfaces for permission loss, unknown channel/member, hierarchy failure, REST rate-limit responses, interaction timeout, duplicate component clicks, deleted messages, restart and partial external success. Maintain a dedicated staging guild for high-value live API checks.

### Browser end-to-end tests

Use Playwright for complete flows:

- OAuth/login → guild select → setup diagnostics → configure minimal module.
- Grant and revoke delegated capability; verify prohibited action fails at API boundary.
- Create/edit/preview/publish/schedule/cancel announcement.
- Create game profile/form → register player/team → close registration → check in.
- Create tournament → confirm bracket → report and approve match → publish standings.
- Ticket open/assign/close/archive; moderation case with audit.
- Platform support access request/expiry; feature flag staged rollout/kill switch.
- Mobile/narrow view, keyboard-only workflow and reduced-motion mode.

### Visual and accessibility tests

- Screenshot baseline for high-value routes across agreed viewports and themes; inspect differences rather than blindly accepting snapshots.
- Check loading, empty, zero-results, error, permission-denied, disabled, pending, partial-success and conflict states.
- Automated accessibility scans as a supplement—not a replacement—for keyboard and screen-reader checks.
- Manual keyboard-only walkthrough of all critical user flows and screen-reader spot checks.
- Check zoom/reflow, contrast, focus visibility, labels, error announcement, table semantics and accessible alternatives for charts/brackets.

## 3. Security test matrix

| Test area          | Required cases                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tenant isolation   | Replace guild ID/resource ID in every request; list, search, export, attachment and job status must never cross guild boundary                         |
| Role/capability    | Allowed action, missing grant, explicit deny, expired grant, revoked grant, role removed, attempted self-escalation, peer/superior moderator target    |
| Platform realm     | Guild admin denied platform endpoints; support operator denied tenant content without grant; expired support grant no longer works                     |
| Session            | Invalid OAuth state, replayed callback, revoked session, cookie policy, redirect allowlist and privilege change session rotation                       |
| Data/serialization | Unknown properties rejected/ignored by policy; response DTO omits secrets/internal fields; logs redact credentials and signed URLs                     |
| Uploads            | Size/type mismatch, dangerous names, unauthorized download, expired signed URL, cross-guild evidence access and oversize rejection                     |
| Rate limits        | Login abuse, API abuse, per-guild fanout and queue pressure are bounded; rate limiting never bypasses authorization                                    |
| Actions            | Duplicate/replayed command/job, timeout after side effect, state changed before delayed job, broad mention attempt and destructive-action confirmation |
| Audit              | Denied actions recorded safely where appropriate; successful privileged action audit is durable; tenant cannot rewrite history                         |

## 4. Quality gates by change type

### Every pull request

- CI passes: lint, typecheck, relevant unit/integration tests, build and security scans.
- New/changed domain behavior has tests, not merely snapshots.
- API/DB authorization changes have negative tests.
- UI changes include relevant states and screen/browser evidence.
- Migrations and config changes have an operational plan.

### Security-sensitive pull request

Requires designated review; threat/permission impact summary; tenant-boundary and denied-actor tests; audit/log redaction review; migration/session/cache invalidation review where applicable.

### UI/interaction pull request

Requires rendered/browser review at affected sizes; keyboard interaction; accessibility/state checklist; performance check for new animation/chart/table complexity; no unexplained visual-system deviations.

### Public beta gate

- No unresolved critical/high security issue without a written, time-bounded risk acceptance by the designated security owner.
- OAuth, tenant isolation, owner/delegate authorization, module setup, audit, data export/retention and incident controls verified.
- Backup restore tested and RPO/RTO selected.
- Essential commands and dashboard workflows e2e passed in staging.
- All P0 features have documented failure modes and support/runbook path.
- Metrics/alerts are working; support/operator access is auditable.
- Privacy policy, terms, permission explanation and current capability list match the shipped product.

## 5. Test data and fixtures

Use synthetic guild/users/teams, realistic but non-sensitive identifiers, seeded tournament brackets and known result sets. Never copy raw production member data into local tests. Create a reusable matrix of small/large roster sizes, byes, ties, incomplete matches, schema changes, deleted Discord resources and permission revocation mid-session.

## 6. Test reliability

Prefer deterministic fixtures, fake clocks, controlled network adapters and unique disposable tenant IDs. Avoid arbitrary sleeps and test order dependence. If a test is flaky, fix its synchronization or isolate the cause; do not silently mark it optional. Visual diffs must be reviewed by a person or an explicit documented threshold because rendering changes can be meaningful or harmless depending on context.
