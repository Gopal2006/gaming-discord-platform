# API, Event and Queue Contracts

## 1. API rules

- Base path: `/api/v1` for stable external/dashboard endpoints. Internal services may use typed functions rather than HTTP where process boundaries do not require it.
- Use JSON request/response contracts with explicit schemas and stable, documented DTOs. Do not expose ORM entities directly.
- Every request receives a correlation/request ID; return it in response headers and include it in internal logs.
- All protected resources are tenant scoped and authorization is evaluated server-side.
- Every collection endpoint has bounded pagination, sort/filter allowlists and tenant-aware query behavior.
- Mutating endpoints document idempotency, authorization capability, expected state and side effects.
- Use consistent errors without secrets or stack traces.

## 2. Error envelope

```json
{
  "error": {
    "code": "REGISTRATION_CLOSED",
    "message": "Registration for this event is closed.",
    "requestId": "req_...",
    "details": { "eventId": "..." }
  }
}
```

`details` are safe and schema-specific; they must not expose private fields, database internals or authorization grants. Use suitable HTTP status semantics: 400 invalid syntax/schema, 401 unauthenticated, 403 denied, 404 missing or intentionally concealed resource, 409 state conflict, 410 expired resource where useful, 413 payload too large, 422 semantically invalid request where distinguished from schema error, 429 rate limited, 5xx unexpected/dependency failure. Keep public error messages stable enough for UX/tests; internal logs contain sanitized detail.

## 3. API surface areas

- `/auth/discord/*` — OAuth start/callback, logout, current session and linked identity management.
- `/me`, `/me/guilds` — identity and manageable guild summaries, not all guilds the user has joined.
- `/guilds/:guildId/*` — server overview, settings, permissions, module state, diagnostics and audit search.
- `/guilds/:guildId/templates/*`, `/announcements/*` — authoring, preview, scheduled status, publish/cancel.
- `/guilds/:guildId/game-profiles/*`, `/events/*`, `/teams/*`, `/registrations/*`, `/tournaments/*`, `/matches/*`, `/disputes/*` — gaming domain.
- `/guilds/:guildId/moderation/*`, `/tickets/*`, `/polls/*`, `/giveaways/*` — community modules.
- `/platform/health`, `/platform/operators/*`, `/platform/feature-flags/*`, `/platform/incidents/*`, `/platform/support/*` — platform-only routes, separately guarded and audited.
- `/health/live`, `/health/ready`, `/metrics` — restricted operational endpoints; no sensitive infrastructure detail in public readiness responses.

Final endpoint names and verbs should be generated from use cases, not assumed from this illustrative map. Avoid route proliferation where subresources/actions are clearer.

## 4. Idempotency and concurrency

Use `Idempotency-Key` or a stable domain request ID for mutations that may be retried after timeouts: registration submission, team join/invite acceptance, announcement enqueue/publish, ticket creation, giveaway entry, check-in, result submission and export creation. Persist key + actor + guild + operation + outcome with an appropriate expiry and uniqueness scope.

A retry with the same key and same logical payload returns the same result. A reused key with a different payload fails with a conflict. Use optimistic concurrency (`version`/`If-Match`) for editing settings, templates, rosters and tournament configuration. Reject stale mutations with a clear conflict and reload/rebase path.

## 5. Event envelope

Internal domain events are versioned and minimally scoped:

```json
{
  "eventId": "evt_...",
  "type": "registration.accepted",
  "version": 1,
  "occurredAt": "2026-10-22T00:00:00.000Z",
  "guildId": "...",
  "aggregate": { "type": "registration", "id": "...", "version": 3 },
  "actor": { "type": "user", "id": "..." },
  "correlationId": "req_...",
  "data": { "eventId": "...", "registrationId": "..." }
}
```

Events should carry IDs and small stable facts, not full participant PII or secrets. Consumers reload authorized/durable state as needed. Schema evolution is additive/versioned; breaking changes use a new version or compatible migration path.

## 6. Queue job contract

Every job includes job type/version, tenant ID if applicable, resource IDs, idempotency key, enqueue time and correlation ID. The producer validates payload schema; worker validates again at runtime because queue contents can be old or malformed. Job options include timeout, bounded attempts, exponential backoff with jitter, retryable/non-retryable classification and job-level concurrency/rate limits.

Retryable examples: transient network failures, selected 5xx responses and explicit provider retry-after. Usually non-retryable without intervention: permission denied, invalid target, malformed payload, expired event or permanently deleted channel. Authorization and current state are rechecked on execution; permissions may have changed since scheduling.

Jobs must expose status, attempts, last error class, next attempt, completed timestamp and safe operator action. Never repeatedly retry an action that may have succeeded but lost its response without checking idempotency/current state first.

## 7. WebSockets and live updates

Use polling or server-sent events for simple operational status unless bidirectional real-time needs are justified. WebSocket access must authenticate, authorize each subscription to a specific tenant/resource and revalidate authorization when access is revoked. Never broadcast one tenant's events to all connected clients. Support reconnection/resume with event IDs and periodic full-state reconciliation; realtime is a hint, not the only source of truth.

## 8. External provider adapter

All Discord REST calls are behind an adapter that maps provider failures to typed categories and respects rate-limit information. Worker business logic does not duplicate ad hoc fetch/retry code. Store external message/channel IDs and outcome references. Mock provider responses in tests, but maintain staging tests against a dedicated test guild for permissions, embeds, components, Gateway recovery and real rate limits.

## 9. Audit event schema

Audit records include `eventId`, `realm`, optional `guildId`, `actorId`, actor type, action/capability, resource type/id, outcome, reason, request/correlation ID, timestamp, redacted diff/parameters and source (`dashboard`, `bot`, `worker`, `platform`). Avoid logging full message bodies/registration forms unless necessary and approved. Secret tokens, cookies, webhook URLs, signed object URLs and private evidence payloads are always redacted.

## 10. API documentation and contract gates

Generate OpenAPI from route schemas where possible. CI checks schema drift and validates sample clients/fixtures. Each endpoint documents authentication, capability, tenant boundary, idempotency, error codes, side effects, pagination and privacy classification. A new API route without authorization tests and response serialization is incomplete.
