# Server Dashboard UX and Functional Specification

## 1. Product job

Help a Discord server owner or delegated staff member configure their server, operate community workflows and run gaming events without memorizing dozens of commands. The dashboard is the main workspace for high-complexity tasks; Discord remains the convenient in-context surface. Every feature shown in the UI maps to a real capability and a shared backend use case.

## 2. Design direction

Build a serious gaming-operations product: precise, high-signal, professional and custom rather than a generic neon gaming template. Use a restrained dark-first visual direction with an accessible light theme if it can be maintained consistently. Choose accent color and brand typography in a product design decision after reviewing target audience and visual references. Do not use gradients, glass panels, glowing borders, motion or decorative cards by reflex.

Use information hierarchy to help users answer: Which server am I in? What needs attention? What can I do here? Did the action succeed? Which permissions/prerequisites are blocking me? Favor meaningful data and operational status over decorative dashboards full of invented metrics.

## 3. Navigation / information architecture

### Global shell

- **Server switcher:** list guilds for which the user has a valid dashboard grant, with search, connection/permission status and last-used server. Never show a server as manageable only because the user is a member of it.
- **Primary sidebar:** Overview; Setup & Health; Modules; Moderation & Safety; Announcements; Community; Tickets; Games & Profiles; Events; Teams & Players; Tournaments; Scrims; Analytics; Audit Log; Settings.
- **Utility area:** help/docs, status indicator, notification center, profile/session actions.
- **Breadcrumbs:** indicate server and resource context, especially nested event/match screens.
- **Page-level actions:** primary action visible in a predictable location; secondary/destructive actions separated from safe actions.

### Server overview

Show actionable configuration status, enabled modules, issues that need attention, upcoming events, recently published announcements and a small set of truthful operational metrics. Every metric links to a corresponding data view. Do not expose participant personal details on the overview by default.

### Setup & health

Guided checklist: bot connected; expected permissions; role hierarchy; log destination; server timezone; selected modules; administrator grants; announcement defaults; data/privacy policy. Every failed check explains impact, minimum required permission and steps to fix. Offer safe repair operations with a preview and audit event.

### Module directory

Each module has a purpose, prerequisites, enabled/disabled state, configured/missing state, capability requirements and link to setup. Enabling a module must show the required permissions, data it collects, any new channels/roles it creates and the effect on users before confirmation.

### Configuration pages

Group settings by the administrator's mental model rather than source-code modules: permissions/access; channels/roles; templates/branding; moderation/safety; notifications; privacy/retention; integrations; operational limits. Provide search and `unsaved changes` handling.

### Event workspace

A structured flow with Overview, Game & Format, Registration, Teams/Rosters, Schedule, Bracket/Stages, Matches, Results/Disputes, Announcements and Audit. Disable or warn about incompatible transitions with a clear reason. Provide list and table views for dense tasks without forcing every operation into a wizard.

## 4. Roles and permission-aware navigation

Navigation is capability-aware, but direct-route enforcement remains server-side. If the user lacks access, display a permission-denied screen explaining the capability they need and, where safe, the owner/admin who can grant it. Do not reveal private resource names/content to an unauthorized user simply because their URL is valid.

A capability editor supports selecting users/roles, scopes, allowed actions and expiry. Include a clear effective-access summary and a "why can/can't this person do this?" evaluator. Warn when a broad grant gives access to multiple dangerous capabilities. The UI must prevent privilege escalation: a grantor cannot delegate a capability they do not have authority to delegate.

## 5. Interaction patterns

### Forms

- Single-column form layout by default; group related fields into clear sections.
- Persistent labels (never placeholder-only), examples/constraints, inline validation and summary for multi-field errors.
- Distinguish required and optional fields.
- Preserve form values when a request fails; show retry where safe.
- For complex tournament/game forms, autosave drafts or warn before navigation, and make the current save state visible.
- Show dynamic registration fields from the versioned game schema and preview participant-facing form as a separate mode.

### Tables and bulk operations

Tables need loading skeleton, empty state, filtered-no-results state, error/retry state, selection count, accessible sort controls, pagination, filter chips and stable row actions. Bulk mutations show an impact preview, authorization and confirmation. Preserve filters when returning from a detail view. Use virtualization only when real item counts and performance data justify it.

### Feedback

Every mutation communicates `saving`, `saved`, `pending`, `success`, `partial success`, `failed`, or `cancelled` as appropriate. Use toast for brief non-critical feedback and inline status for job progress or persistent failures. Include request/reference ID in technical failure details when useful; never show stack traces or secrets to end users.

### Dangerous actions

Use a confirmation dialog that names the actual object/scope and likely effects. For large audience sends or irreversible changes, display recipient/item count and require stronger confirmation. Prefer archive, undo or scheduled deletion over immediate permanent deletion where possible.

### Navigation and deep links

Use stable links into guild-scoped resources. The API must reauthorize on every request regardless of prior navigation. Deep links handle unavailable/deleted records and removed permissions gracefully. Preserve user context after OAuth redirect and return to a safe, allowlisted path.

## 6. Critical user flows

### First install

1. User chooses "Add to Discord" or logs in.
2. Explain Discord OAuth scopes and invite permissions, then redirect through official OAuth.
3. Resolve guilds and verify the user's current authorization; include only manageable guilds in the server picker.
4. Select a guild; run a read-only diagnostics check.
5. Guide through modules and minimum permissions with clear consequences.
6. Establish required server grants and log destinations.
7. Test one low-impact action, e.g. preview a welcome card in a selected channel.
8. Show ready checklist and next recommended tasks; do not force a tour of every feature.

### Create announcement

1. Choose built-in/server template or blank draft.
2. Fill validated variables and target channel; constrain allowed mentions.
3. Preview actual rendered embed, image/button, links and mobile-ish Discord presentation.
4. Run permission and asset validation; for high-reach sends, require approval.
5. Publish now or schedule; show a durable job status.
6. Show final message link and accurate outcome; failed publication remains retriable/cancellable.

### Build game registration

1. Select a built-in or custom game profile.
2. Configure supported team size, fields, required values, validation and visibility.
3. Preview the form as a player sees it; test a submission.
4. Set caps, deadlines, eligibility and check-in policy.
5. Select notification/announcement templates and channels.
6. Publish; persist schema version with each response.
7. Show entrants, duplicates/validation failures, roster status, waitlist and export controls governed by capabilities.

### Create tournament

1. Choose game profile and a compatible competition format.
2. Define stages, roster rules, scheduling, scoring and tie-breakers.
3. Configure registration and check-in deadlines.
4. Preview event page/announcement and permissions; validate no missing required fields.
5. Publish and open registration.
6. Close registration/check in participants and lock rosters according to policy.
7. Generate/confirm bracket or schedule; assign referees.
8. Collect results, evidence and disputes, then finalize and publish results.
9. Archive event and apply retention policy.

### Incident lockdown

1. Authorized user opens incident controls.
2. Show configured safe actions and affected resource scope.
3. Require reason and confirmation for broad changes.
4. Execute a predefined response plan with per-action results; do not claim atomicity across Discord operations.
5. Keep a visible incident timeline, owner and next steps.
6. Recovery requires appropriate capability and post-action audit.

## 7. Responsive and accessible behavior

Desktop is the main high-density management workspace; mobile must still support event status, incident alert viewing, quick moderation, participant lookup and approval actions. Dense tables become readable cards or horizontal scrolling with clear labels, not clipped critical columns. Establish responsive breakpoints based on content, not device names alone.

Meet WCAG 2.2 AA as the target: keyboard operation, visible focus, semantic landmarks, labels, accessible names/states, contrast, zoom/reflow, status announcements and reduced-motion support. Color never carries status alone. Dialogs trap/restore focus correctly. Tables, calendars, brackets and custom widgets require keyboard alternatives or accessible tabular views.

## 8. Required state inventory for every route

At minimum specify and test:

- initial/loading;
- populated/normal;
- empty account/guild/resource;
- no search results;
- permission denied/revoked during session;
- data validation failure;
- server/API/network failure with retry;
- stale/conflicting update;
- partially completed multi-step action;
- long-running job with progress/status;
- disabled module or missing Discord prerequisite;
- mobile/narrow layout;
- keyboard-only and reduced-motion behavior.

## 9. Product and visual quality rules

- Start from the actual user task and information hierarchy before choosing the visual style.
- Read existing tokens/components before adding dependencies or new patterns.
- Each page needs one obvious primary action and a coherent focus; avoid a card for every line of information.
- Prefer real product data and realistic fixtures for design review; no fake analytics or lorem ipsum in production paths.
- Animation is functional feedback, not ornament. Prefer transform/opacity and stop offscreen/unused animations; obey reduced-motion preferences.
- Capture screenshots for key routes/viewports in review; compare actual render with the design spec and inspect interactions, not just JSX.
- New components document props, variants, states, validation/permissions, accessibility and responsive behavior.
