# Workflow State Machines and Transition Contracts

This document defines minimum explicit states for business workflows. Exact states can evolve through an ADR, but implementation must never encode consequential workflows as loosely related booleans without a documented invariant.

## 1. Scheduled announcement

`draft → validated → scheduled → publishing → published`

Alternate outcomes: `cancelled`, `failed_retryable`, `failed_terminal`, `partially_published` for multi-target delivery. A retry is permitted only when the external outcome is known or deduplicated. Published content is an immutable snapshot of the rendered template, target and mention policy at send time. Template edits do not rewrite sent messages.

## 2. Ticket

`open → claimed → in_progress → pending_user | pending_staff → resolved → archived`

Alternate states: `reopened`, `cancelled`, `retention_expired`. `claimed` can be optional based on workflow. Channel deletion is separate from ticket resolution/archive. Access is recalculated on every access-changing action. Transcript generation is a separate job whose outcome is tracked. Closing must not imply transcript exists unless the transcript job completed.

## 3. Moderation case

`requested → authorized → executing → applied → notified`

Alternative outcomes: `denied`, `execution_failed`, `applied_notification_failed`, `expired`, `reversed`. The external moderation effect and best-effort DM outcome are stored separately. A failed DM must not invalidate a confirmed timeout/ban; an uncertain API result triggers reconciliation before retry.

## 4. Giveaway

`draft → scheduled/active → closed_for_entries → selecting_winners → ended`

Alternates: `cancelled`, `selection_failed`, `reroll_pending`. Eligibility policy is snapshotted or versioned at start. Winner selection records eligible entry IDs, algorithm version and actor/process metadata sufficient to audit the process. A reroll is a new auditable outcome, not a silent rewrite. Use a cryptographically appropriate random source if the product's trust model requires it; make the policy clear and test it.

## 5. Poll

`draft → scheduled/active → closed → results_published → archived`

Alternates: `cancelled`, `moderated`. One canonical vote per poll/user; vote change policy is explicit. `active` can be indefinite only by intentional configuration. Votes and poll settings retain a versioned policy for eligibility and visibility.

## 6. Registration

`draft → submitted → pending_review → accepted | waitlisted | rejected → checked_in → eligible`

Alternates: `withdrawn`, `disqualified`, `expired`. State transitions are constrained by event state, capacities, eligibility and check-in deadlines. Status history is immutable; a staff override records actor and reason. If team-based, registration may belong to a team application and all roster eligibility rules must be validated atomically.

## 7. Tournament

`draft → scheduled → registration_open → registration_closed → check_in → ready → live → completed → archived`

Alternates: `paused`, `cancelled`, `under_review`. Publishing requires a valid format, schema version, timezone, deadlines, scoring/tie-break rules and allowed roster policy. Opening/closing state schedules durable jobs and communications. A stale job must reload state and no-op if the transition already happened or event was cancelled.

## 8. Match and result

Match state: `scheduled → check_in/open → ready → live → result_pending → confirmed → finalized`.

Alternates: `delayed`, `rescheduled`, `forfeit_pending`, `disputed`, `cancelled`, `voided`. Result submission state: `submitted → awaiting_opponent | awaiting_referee → accepted | rejected → superseded`.

Only one current authoritative result per match. Corrections create revisions and recalculate derived standings/bracket advancement under an explicit correction workflow. Evidence is access-controlled. Dispute decisions require reason and record evidence references. Never auto-finalize from a single conflicting submission.

## 9. Incident

`detected → triaged → containing → contained → recovering → monitoring → resolved → postmortem_complete`.

Alternate: `false_positive`, `reopened`. Every state change has owner, timestamp, reason/source and next action. Incident controls are predefined and scope-limited. Cross-Discord operations may partially succeed; report per-action result and reconcile instead of claiming an atomic all-or-nothing lockdown.

## 10. Outbox/job

Outbox: `pending → dispatched → acknowledged`, with `retry_wait` and `dead_letter` states. Job: `waiting → active → completed`, or `delayed`, `retry_wait`, `failed_terminal`, `cancelled`.

Workers use idempotency, bounded retries, stale-state checks and safe failure classification. Reconciliation jobs inspect stuck records and surface to operators; they do not blindly replay potentially irreversible operations.

## 11. State-machine contract for implementation

For every transition document: source states, triggering event/actor, capability, guard, side effects, transaction boundary, audit record, emitted events, retry semantics, idempotency key, user-visible response, invalid transition response and recovery. Unit tests must include each allowed transition, each prohibited transition, each terminal/alternate state, and duplicate/concurrent requests.
