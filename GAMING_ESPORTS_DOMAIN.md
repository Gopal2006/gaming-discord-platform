# Gaming and Esports Domain Workflows

## 1. Design objective

Support different games and tournament formats through a composable domain model. Do not create a separate bot command implementation for every game. A game profile defines fields and supported rules; shared event/tournament services own consistent state transitions and audit requirements.

## 2. Main concepts

- **GameDefinition:** platform-owned defaults describing supported formats, roster options, participant fields, scores and announcement bindings.
- **GuildGameProfile:** server-owned clone/customization of a definition or entirely custom profile, with owner and version.
- **PlayerProfile:** server-scoped identity and permitted game identifiers; no assumption that a Riot ID, BGMI UID or Free Fire ID proves real-world identity.
- **Team:** guild-scoped team, captain, roster members, substitutes, metadata and status.
- **Event:** event identity, publisher, category, public/private settings, schedule, timezone and life-cycle state.
- **RegistrationFormVersion:** immutable schema used by a specific set of registrations.
- **Registration:** participant/team entry, validated answers, schema version, submission state and audit history.
- **Competition:** competition identity and rules; may contain several stages.
- **Stage:** compatible format and progression rules.
- **Match:** competitors, schedule, assigned referee, state, result revisions and evidence references.
- **ResultSubmission:** a claim with submitter, score, evidence, status and timestamp.
- **Dispute:** disagreement over a result or eligibility decision, evidence, assignee and resolution.
- **AnnouncementJob:** rendered message snapshot, target, scheduling/publication state and external Discord message ID.

## 3. Extensible game profile schema

Each profile defines:

- Name, slug, icon/banner, description and platform/region choices.
- Supported event formats (solo, team sizes, battle royale scoring, 5v5 series, etc.); the backend validates support explicitly.
- Player-level fields with stable field IDs, labels, type, required flag, validation constraints, visibility and retention classification.
- Team-level fields separately from player-level fields.
- Roster rules: size/minimum/substitutes, captain requirements, eligibility and lock point.
- Registration options: open/approval/invite-only, cap, waitlist, deadline, edit policy and check-in window.
- Match metadata: lobby/room references, map, server/region, series type; secret credentials are private and time-limited.
- Score model and tie-breaker definitions for supported formats.
- Announcement template bindings: game name, event title, team size, dates, registration URL, prize/rules and channel.
- Optional integration declaration with required permissions, API availability and failure behavior.

Use JSON Schema-compatible validation where possible; apply strict bounds and safe default handling. Admin-created schemas cannot execute scripts, query databases or access arbitrary network resources. Each schema has a version and immutable snapshots. Migrations are explicit for semantic changes.

## 4. Event state machine

Proposed event states:
`draft → scheduled/open → registration_open → registration_closed → check_in_open → check_in_closed → ready → live → completed → archived`.

Additional states: `cancelled`, `paused`, `under_review` when necessary. Transitions have guards (capability, time, entrants, roster validation, stage configuration) and side effects (announcement, notification, bracket generation). A server cannot jump directly from `draft` to `completed`. Re-opening registration after closure is an explicit transition with audit and participant notification when relevant.

## 5. Registration state machine

`draft → submitted → pending_review → accepted | waitlisted | rejected → checked_in → eligible → withdrawn | disqualified`.

Not all transitions apply to every registration policy. Every transition records actor/reason, time, source and schema version. Duplicate event/player entries are prevented by configurable unique constraints and idempotency keys. Repeated button clicks return the existing result instead of creating duplicates. A player can see their own confirmation/status; staff can see fields allowed by their capability.

## 6. Team and roster rules

- Team names/tags have guild-scoped uniqueness rules and sanitization.
- Captain changes, invitations, acceptance, leaving, removal, substitute swaps and roster locks are explicit actions.
- Team changes after event lock follow event policy and preserve roster history.
- Server admins can set limits, but cannot alter locked roster history without an explicit, audited override.
- A player identifier may belong to a user-defined account only under documented rules; do not claim official game verification unless integration proves it.

## 7. Tournament engine

Support a common stage model with pluggable format strategies. Start with a tested minimum set: single-elimination brackets and round-robin/group stages. Add double-elimination and Swiss only after pairing/progression rules and test fixtures are complete. Formats are not merely a display component; they have deterministic progression logic.

Required concepts:

- Entrant eligibility, seeding policy, byes, tie-breakers, best-of formats and default advancement policy.
- Stage creation and transition, roster snapshot at lock time, match assignment, schedule constraints and referee assignment.
- Result submissions and conflict workflow.
- Bracket generation/version, audit and recomputation strategy. Do not silently regenerate after results exist; preview the impact and preserve an immutable prior revision.
- Pause/cancel/forfeit/reschedule rules.
- Publishable standings/results that are derived from authoritative match state.

## 8. Match and result workflow

1. Match is scheduled and competitors receive authorized notice.
2. Before start, the assigned participants/referee can confirm availability or report a problem.
3. Result submission validates that the actor is a competitor or assigned/referee staff, match is in a compatible state, score schema and attachment constraints are valid.
4. If both sides submit agreeing results, apply configured automatic confirmation; otherwise enter `disputed`/`review_required`.
5. Referee/organizer reviews evidence, records rationale, accepts/corrects/forfeits the result and optionally attaches a private note.
6. Approved result advances bracket/standings transactionally and enqueues public announcement.
7. If a later correction is allowed, create a new result revision and recompute downstream derived state with a visible impact preview and audit.

Evidence assets are private by default, virus/size checked where feasible, accessed via short-lived signed links and retained per policy. A result screenshot is not an automatic proof of authenticity; the workflow communicates its verification level.

## 9. Scrims

Scrim workflow includes team availability/preferences, request, accept/decline, rescheduling, match setup, reminders, result history and cancellations. Availability discovery is opt-in. Do not reveal private schedules or player contact details by default. Matching should start rule-based and transparent; recommendation/skill rating systems require explicit data model, opt-in and anti-abuse decisions.

## 10. Announcements and templates

Templates render from named, validated variables. Provide built-in starter templates and tenant-cloned versions for registration open/closing soon, team roster, check-in open, bracket published, match schedule, lobby details, result pending, final standings, scrim request and event cancellation. Use preview and allowlist mentions. Snapshot rendered content at publication time so later template edits don't alter history. Any private match/lobby details must be audience-restricted and scheduled for appropriate reveal time.

## 11. Race conditions and invariants

- One participant cannot exceed configured registration/roster limits because two concurrent requests raced.
- A closed registration rejects new submissions even when a job/command was queued earlier.
- Check-in is idempotent and honors the server's canonical deadline/time zone.
- Only eligible actors can submit or approve a match result.
- A match can have only one current authoritative accepted result, with history of revisions.
- A cancelled/archived event cannot trigger stale reminders or reopen itself from a retried job.
- Bracket advancement and standing update are transactionally consistent or recoverable via reconciliation.
- A duplicate Discord interaction/job does not create duplicate messages/registrations/teams.

## 12. Minimum v1 scope

V1 should support a custom game profile, registration form, solo/team registration, basic roster management, event announcements, caps/deadlines, check-in, a competition with single-elimination or round-robin format, manual/participant result submission, referee/organizer review, basic standings, participant export and audit trail. More advanced formats are added only when each format passes property-based and fixture tests.
