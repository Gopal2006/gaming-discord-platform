# Repository Instructions for AI Agents and Contributors

## 1. Mission

Build the multi-tenant gaming/esports Discord platform described in the product docs. Do not reduce the project to a basic moderation bot, and do not build broad features ahead of secure tenancy, shared domain contracts, tests and operational readiness.

## 2. Read first

Before nontrivial work, read:

1. `README.md` and `PRODUCT_SCOPE.md`.
2. The applicable domain spec (`BOT_SPEC.md`, `SERVER_DASHBOARD_SPEC.md`, `PLATFORM_CONTROL_PLANE_SPEC.md`, `GAMING_ESPORTS_DOMAIN.md`, etc.).
3. `ARCHITECTURE.md`, `AUTHORIZATION_SECURITY.md`, `DATA_MODEL.md` and `API_AND_EVENTS.md` where relevant.
4. The appropriate `.agents/skills/*/SKILL.md` files.
5. Existing code, package manifests, lockfile, component/tokens, tests and Git status before changing anything.

Treat `REQUIREMENTS.md` plus its focused companion specs as the source of truth. If they conflict, identify the exact conflict and propose an ADR; do not silently choose whichever is convenient.

## 3. Keep the task contract

Before coding, state internally or in the plan: exact outcome, files/systems in scope, constraints, authorized tools/actions, dependencies, acceptance evidence, risks and definition of done. Do not interpret "production quality" as permission to expand unrelated features. Make safe assumptions where possible; ask only when a missing decision materially changes correctness/security and cannot be resolved from documents.

## 4. Architecture rules

- TypeScript strict mode; use the pinned runtime and package manager.
- Keep domain/application policy independent from Discord.js, Fastify and React.
- Use canonical request/domain contracts and typed error categories.
- Every tenant-owned operation requires an explicit tenant context; query scope must be enforced on the server.
- All mutations authorize actor, realm, tenant, resource and action server-side.
- PostgreSQL holds durable business state; Redis jobs/cache are not the only source of truth.
- Critical side effects use transactions/outbox/reconciliation where appropriate and idempotent workers.
- Keep API handlers and Discord command adapters thin.
- Use checked-in, reviewed migrations; never run a destructive schema change without a migration/recovery plan.
- Do not add dependencies without reading the current package manifests and explaining the need; prefer existing dependency if it works.

## 5. Security rules

- Never write secrets, production PII, session cookies, signed URLs or raw evidence into source, screenshots, logs or fixture files.
- Do not request broad Discord permissions/intents without documented feature need.
- No platform capability is inherited from a guild role; no guild capability is inherited from a platform role.
- Treat external input, Discord component IDs, URL parameters and queued job data as untrusted.
- Add negative authorization and cross-tenant tests for every changed protected path.
- Do not expose raw ORM records; return explicit response DTOs.
- For destructive, bulk, high-reach or irreversible actions, implement preview/confirmation/audit/recovery as required by the specs.

## 6. UI and UX rules

- Read `DESIGN_SYSTEM.md` and existing tokens/components first. Do not build a generic dashboard from generic cards or random gradients.
- Establish intent, hierarchy, states and interaction contract before styling.
- Implement loading, empty, no-results, error, permission-denied, disabled, pending, partial-success and conflict states relevant to the component.
- Use persistent form labels, inline validation, preserved values on failure, and clear retry/recovery.
- Meet WCAG 2.2 AA target; check keyboard flow, focus, semantic names, contrast, reduced motion and responsive behavior.
- Use the smallest relevant custom skill set; never paste upstream skills wholesale.
- Verify rendered screens in a browser at relevant viewports. Screenshot-only review cannot establish interaction or accessibility correctness.
- Keep motion purposeful and profile performance/resource cleanup for animation, listeners, observers and timers.

## 7. Engineering workflow

1. Inspect worktree (`git status --short`) and current source.
2. Map request to requirement, domain objects, permission capability, state transition and API/Discord interface.
3. Write a short implementation plan and identify migrations/test changes before edit.
4. Implement the smallest complete slice, including failure paths and docs.
5. Run formatting, lint, typecheck, relevant unit/integration/e2e tests and build.
6. For database changes, test migrations and tenant-scoped behavior.
7. For UI changes, run browser QA and accessibility/state checks.
8. For Discord behavior, test with mocks plus staging-guild check when the change touches provider semantics.
9. Inspect full diff for scope, secrets, accidental unrelated edits and regressions.
10. Report exact files changed, tests/commands run, outcomes, screenshots/evidence and known gaps. Never claim a command/test passed if it was not run.

## 8. Verification gates

Translate phrases like "robust", "complete", "production-ready" and "polished" into acceptance checks. A feature is not done because its happy path renders. Check stale state, duplicate request, permission revocation, timeout after side effect, transient failure, missing Discord permission, restart/retry, data retention and responsive states as relevant.

Do not fix failures by deleting tests, broadening privileges, suppressing errors or hiding the UI. If the environment prevents a test, mark it unrun and explain the missing dependency.

## 9. Dependency and design choice policy

Check existing dependencies before suggesting a library. Add one library for a clear need, explain alternatives only when there is a real trade-off, and update lockfiles and docs. Match visual references intentionally while respecting usability, accessibility, security, current design-system conventions and the user's stated direction.

## 10. Done means

Implementation + authorization + validation + state handling + tests + observability/audit + migration/deployment implications + documentation + evidence. If one of these does not apply, state why. If it remains undone, say so explicitly rather than calling the task production-ready.
