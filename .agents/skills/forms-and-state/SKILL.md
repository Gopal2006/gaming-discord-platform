---
name: forms-and-state
description: Use for dashboard forms, modals, dynamic registration schemas, configuration editors, async buttons, tables, tickets, announcements and any component with multiple states or side effects.
---

# Nexus Forms, Async UX and State Machines

## Core rule

State must be explicit and legal. Do not model important workflows as loosely related booleans if they can produce impossible combinations. Read `WORKFLOW_STATE_MACHINES.md` and the relevant domain spec before adding a new state.

## Form contract

- Every field has a persistent label; placeholder is example content only, never the only label.
- Group related fields, use appropriate input types, explain formats and limits and distinguish required from optional.
- Validate client-side for immediate feedback and server-side as the authoritative check.
- Preserve entered values after a server/network failure. Show errors next to fields and a form-level summary where useful.
- Prevent duplicate submission while pending, but do not assume disabled buttons guarantee idempotency; use backend idempotency for consequential creates/actions.
- Complex forms use draft/save/publish states, clear unsaved-change handling and preview mode where users publish content or custom schemas.
- Dynamic fields retain schema version. Never reinterpret historic answers because the admin edited today's schema.

## Async action contract

Every asynchronous action has explicit pending/success/failure/retryable/partial state as appropriate. A toast is not the only indicator for a long-running job. Keep the durable job ID/status where users must track progress. On timeout, don't claim failure if the server might have completed; reconcile before retry.

## State modelling

For each component/workflow list:

- states and terminal states;
- events that trigger transitions;
- guards/capabilities and required inputs;
- side effects and transaction boundaries;
- invalid transitions and conflict behavior;
- idempotency/retry semantics;
- user-visible result and recovery path;
- audit events.

Cover data and access states: loading, populated, empty, filtered-zero, stale/conflict, denied, disabled feature, missing prerequisite, partial result, server failure and revoked access. For long-running jobs add scheduled, queued, active, retry_wait and terminal-failure where meaningful.

## Dangerous actions

Display target and impact count; explain consequences; require capability and confirmation; collect reason if policy requires; use undo/archive where possible. On bulk operations, show per-target success/failure rather than one misleading all-or-nothing message when the provider can partially complete.

## Testing

Test valid and invalid input, concurrent duplicate submit, permission revoked mid-session, stale object, retry after uncertain timeout, preserved values after failure and every allowed/disallowed state transition. Use fake clock/event hooks; avoid sleep-based tests.
