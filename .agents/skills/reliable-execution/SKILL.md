---
name: reliable-execution
description: Use for any feature involving external side effects, scheduling, queue jobs, state transitions, database writes, retries, Discord API calls, registrations, results, permissions or deployment changes.
---

# Nexus Reliable Execution

## Required design before code

Describe source state, target state, actor capability, guards, transaction, external side effect, durable audit event, idempotency key, retry behavior, terminal errors and reconciliation. Refer to `WORKFLOW_STATE_MACHINES.md` and `API_AND_EVENTS.md`.

## Rules

- PostgreSQL is authoritative for business intent/state; Redis is not the only durable record.
- Use a transaction for related DB state changes and an outbox for important external side effects.
- Queue messages are at-least-once. Consumers validate schema, re-check current state/permissions and use idempotency before performing the effect.
- A timeout after a provider call means outcome may be unknown. Reconcile before retry to avoid duplicate messages or actions.
- Bound attempts, timeouts, fanout, concurrency and rate. Use backoff/jitter for transient errors; do not retry permanent permission/configuration failures indefinitely.
- Report partial external success precisely. Discord cannot atomically update many channels/users; record per-action result when practical.
- A background job is not complete just because it was enqueued. Track scheduled, queued, running, retrying, completed, failed and cancelled outcomes where relevant.
- Persist IDs/time/version needed to recover after process restart. Avoid correctness depending on in-memory timers or arrays.
- Authorization may expire/change after enqueue; worker checks current grant/state before private/bulk actions.

## Verification

Test duplicate delivery, provider success followed by lost response, concurrent requests, cancellation, permission revocation, deleted Discord destination, queue outage, worker restart, retryable and terminal errors, stale jobs and database rollback. Provide a reconciliation/repair path for stuck records and alert on growing backlog.
