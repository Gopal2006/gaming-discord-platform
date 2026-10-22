# Authorization, Security and Tenant Isolation

**Release-blocking document.** No public beta is allowed while any tenant-boundary, authentication, secret-management or privilege-escalation test is failing.

## 1. Security objectives

1. A server owner or delegate can only access that guild's data and capabilities.
2. A platform operator has no implicit permission to act as a server administrator. Cross-tenant support access is separate, explicit, time-bounded where practical, and audited.
3. The bot asks for no more Discord permissions or Gateway intents than enabled features require.
4. Every mutation is authorized on the server side at the time of action, with actor, tenant, object and action in scope.
5. Sensitive data is minimized, protected at rest/in transit, redacted from logs and removed according to an approved retention policy.
6. Security controls fail closed for privileged actions. Availability failures must not silently bypass authorization.

## 2. Trust boundaries

- Discord interaction payload → bot adapter.
- Browser → Next.js/API; browser fields and route params are untrusted.
- Platform session → control-plane APIs.
- Tenant-owned data → PostgreSQL queries/repositories.
- API/job enqueue → Redis/BullMQ.
- Worker → Discord REST API or object storage.
- Uploaded participant evidence/assets → object storage and any preview/processing pipeline.
- Production operator/CI credential → infrastructure, releases and secrets.

Validate identity and the tenant context at each boundary. OAuth login proves identity, not authorization to a guild, object or action. A Discord role name, client-supplied permission list, button custom ID, form hidden field, object storage URL or route path is never trusted as a capability.

## 3. Two authorization realms

### Guild realm

Guild authorization is evaluated against a durable grant model and relevant live Discord facts. It includes guild membership, current owner identity where verified, explicitly granted platform capabilities within the guild, role-derived grants and configured policy restrictions. It covers a named `guild_id`, resource type/ID and action.

### Platform realm

Platform users are separate from guild roles. Their capabilities include only operational actions such as viewing health, managing feature flags, responding to support, changing global templates, issuing a temporary audited support-access grant, handling incidents or changing platform operator accounts. The system must not infer a platform role from a Discord server role or a guild owner flag.

## 4. Authorization model

Use RBAC to manage assignable groups plus capability-based checks at the action boundary. A permission grant should identify:

- `principal_type`: user, Discord role, platform team or service identity.
- `principal_id` and realm.
- `guild_id` for guild grants; null only for explicitly platform-scoped grants.
- `capability` (stable identifier such as `announcement.publish`, not display text).
- Optional resource scope: resource type and ID, channel, event, tournament or assigned match.
- Effect: allow or deny; define deterministic conflict resolution. Explicit deny must not be overridden by a broad role allow.
- Grantor, created/updated timestamps, expiration, reason and revocation metadata.
- Policy version or grant revision for cache invalidation.

The permission service receives an explicit immutable actor context and resource context. It returns allow/deny plus reason codes safe for internal auditing. UI code may hide a control for usability, but the API/domain operation is the enforcement point.

### Permission evaluation order

1. Authenticate actor and validate the session/token.
2. Validate request origin/CSRF rules for cookie-authenticated mutations.
3. Resolve realm and verified tenant context.
4. Load resource through a tenant-scoped repository method.
5. Verify resource belongs to the resolved guild/realm.
6. Evaluate capability grant, explicit deny, scope, expiry and policy restrictions.
7. For Discord mutations, verify live bot permission, bot role hierarchy and target rules immediately before the external action.
8. Perform state transition transactionally with audit/outbox event.
9. Return a minimized DTO; never serialize internal grant/session/secrets.

## 5. Proposed platform roles

Roles are presets that map to capabilities; each server/platform may refine them only within the limits of the realm. These are not hardcoded universal superuser aliases.

- **Platform Owner:** full platform governance and break-glass authority; mandatory audit for high-impact operations; cannot erase audit history to conceal actions.
- **Platform Security Administrator:** manages identity, security policy, incident response and suspicious access; no default right to edit billing or tenant content unless separately granted.
- **Platform Operations Administrator:** deployments/configuration/health and controlled operational changes; no default unrestricted access to participant content.
- **Platform Support Operator:** handles support cases and approved diagnostic views; tenant-data access requires an explicit purpose, scope and expiry when feasible.
- **Platform Analyst:** aggregated and privacy-aware product analytics; no access to raw participant data by default.
- **Server Owner:** canonical guild owner resolved from Discord; can delegate guild capabilities, set guild policy and revoke delegates. Cannot modify platform-wide settings.
- **Server Administrator:** configurable bundle of guild configuration and delegated capabilities; do not assume the Discord `Administrator` permission automatically grants every bot capability.
- **Security Moderator / Moderator:** moderation or incident capabilities limited by policy and hierarchy. Destructive/global configuration stays outside this preset.
- **Tournament Organizer:** create/manage competitions and participant operations; no moderation or platform access by default.
- **Referee:** view/act on assigned matches and resolve/submit results within a defined scope; cannot change tournament rules after lock unless granted.
- **Registrar:** participant registration, roster and check-in operations; no result approval or moderation by default.
- **Announcement Publisher:** edit/use approved templates and publish to allowed channels/mention scopes; not automatically allowed to change templates or send broad role DMs.
- **Support Staff:** access assigned tickets; private content visibility limited to ticket assignment/policy.
- **Analytics Viewer:** see defined summaries only.
- **Custom Guild Role:** grant a subset of supported capabilities; cannot grant platform capabilities and cannot grant a capability the grantor is not authorized to delegate.

## 6. Separation of duties and privileged access

- Platform account administration, security incident response, production deployment and customer-content support should have distinct capability sets.
- No shared platform passcodes. Use named accounts, server-side sessions, short/appropriate session expiry, secure cookies, revocation, re-authentication for high-risk actions and MFA/step-up auth for privileged platform users where supported.
- Break-glass is exceptional: require strong re-authentication, reason, narrow scope, short expiry, immutable audit trail and post-incident review. It must not be the everyday support workflow.
- An operator who can change global auth policy should not be able to silently remove their own audit trail.
- Platform configuration changes that affect many tenants require preview of impact, confirmation and preferably staged rollout.

## 7. Tenant isolation requirements

- Every tenant-owned record carries `guild_id` or has a foreign-key path to a tenant-owned parent.
- Every repository method for tenant data requires `TenantContext`; avoid generic `findById(id)` calls that bypass scope for web requests.
- Every lookup with client-provided IDs checks the record's guild ownership after loading with a tenant-scoped predicate.
- Unique constraints are tenant scoped where duplicate IDs/labels across guilds are expected.
- Cache keys contain realm and tenant identifiers and any relevant actor/policy version.
- Queue job payloads include tenant ID and object IDs; the worker reloads and reauthorizes the current state instead of trusting old permissions captured at enqueue time.
- Private evidence/assets use short-lived signed URLs or authenticated proxy delivery; object names are non-guessable and never treated as authorization.
- Global templates are immutable defaults; a server clone receives tenant-owned identifiers.
- Cross-tenant support access is explicit and leaves a durable audit event.
- Test horizontal privilege escalation for every list/detail/update/delete/export path, not only the main API route.

## 8. Threat controls

### Authentication and session

Use the official Discord OAuth2 flow with state and PKCE where applicable, exact redirect URI allowlists, secure server-side session storage, HttpOnly/Secure/SameSite cookies, rotation on login/privilege change, idle/absolute expiry and revocation on logout or suspected compromise. Don't place access tokens, bot tokens or refresh tokens in localStorage. Minimize OAuth scopes and do not collect Discord passwords. Validate OAuth callback state and bind session to the expected browser flow.

### API and browser protections

- Strict request schemas, response schemas, maximum body size, pagination limits and safe serialization.
- CSRF protection for cookie-authenticated state changes; appropriate CORS allowlists; CSP and secure response headers.
- Rate limits keyed by account, IP/network context and tenant as appropriate; use more restrictive limits for auth, exports, mass actions and high-cost endpoints.
- Validate uploaded file size, MIME/signature, extension, ownership and download permissions. Avoid remote URL fetching unless a tightly controlled SSRF-safe feature is approved.
- Prevent IDOR/BOLA via tenant-scoped reads and capability checks.
- Escape/encode user-provided template content safely; avoid arbitrary HTML or code execution in templates.
- Prevent open redirects from OAuth and dashboard navigation flows.

### Secrets and supply chain

- Secrets only in managed runtime secret storage; `.env.example` contains placeholders, never values.
- Rotate bot tokens and provider credentials promptly on exposure; maintain documented procedure.
- Separate CI, staging and production credentials; grant deploy workflow only needed access.
- Pin package manager and lockfile; automated dependency updates with tests; dependency/license/secret scans; review direct and transitive risky packages.
- Protect default branch with required CI, review, no direct production hotfix without a tracked emergency process.

### Bot and Discord-specific risks

#### Discord Permissions & Administrator Installation Model

- **Product Policy Decision:** Nexus supports an Administrator-capable installation mode (`0x8`) to unlock its full automation capability (dynamic channel creation, bracket management, server locks, and deep moderation) without requiring manual per-channel permission overrides.
- **Granular Restricted Mode:** Nexus simultaneously retains a restricted-permissions installation option for risk-sensitive communities, requiring only explicit granular bitsets (e.g. `BAN_MEMBERS`, `MANAGE_MESSAGES`, `MODERATE_MEMBERS`).
- **Internal Action-Safety Boundary:** External Discord permissions (including `ADMINISTRATOR`) are treated strictly as transport capabilities, NEVER as internal authorization. The central `ActionPolicyEngine` enforces:
  1. Internal actor grants / RBAC capabilities.
  2. Role hierarchy (cannot ban guild owner, cannot ban bot self, cannot ban superior/equal role).
  3. Per-guild and global emergency kill-switches.
  4. Conservative bulk limits (e.g. max 100 purge).
  5. Cryptographic single-use confirmation tokens for destructive actions.
  6. Default mass mention suppression.
- Keep Message Content and Presence intents disabled unless an approved feature requires them.
- Permission changes, role hierarchy, channel existence and target validity can change after setup; check before action and offer diagnostics.
- Treat buttons/modals as untrusted commands: validate actor, guild, object, nonce/version and valid state transition on every interaction.

## 9. Destructive operations, bulk limits and confirmations

Any action that can remove data, notify a large group, change permissions, lock channels, or ban members must pass through the `ActionPolicyEngine`:

- **Explicit capability and scope check:** The actor must possess an unexpired internal grant.
- **Role Hierarchy Guard:** Refuses actions against the guild owner, the bot itself, or equal/superior role positions.
- **Bulk Limits:** Hard configurable ceiling (default 100 messages for purge) prevents runaway or automated mass destruction.
- **Impact preview & confirmation tokens:** Destructive operations require an impact preview and an ephemeral, single-use cryptographic confirmation token (`InMemoryConfirmationService`).
  - Tokens are bound to the exact `guildId`, `actorId`, `operationType`, and target fingerprint.
  - Expire in 60 seconds (configurable TTL).
  - Strictly consumed on first use; replayed or mismatched tokens fail with `DENIED_CONFIRMATION_INVALID`.
- **Mass Mention Suppression:** `@everyone` and `@here` are stripped or denied by default unless the action explicitly holds the `announcement.publish` capability and confirmation.
- **Durable audit entry:** Recorded transactionally with correlation ID, actor, target, parameters, and outcome.

## 10. Incident response & emergency controls

### Emergency Kill-Switches

- **Per-Guild Emergency Stop:** Guild owners/administrators can execute `manageEmergencyStopWorkflow` (or `POST /api/v1/guilds/:guildId/emergency-stop`). Once active:
  - All new state-changing bot operations in the guild fail closed with `DENIED_GUILD_EMERGENCY_STOP`.
  - The outbox worker defers pending event publishing for that guild.
  - Can be lifted only by authorized administrators through explicit emergency management operations.
- **Global Emergency Stop:** Platform operators can pause bot operations across all tenants (`DENIED_GLOBAL_EMERGENCY_STOP`), halting worker dispatches immediately.
- **Critical Boundary Note:** Application-level emergency stops halt Nexus software execution. They CANNOT prevent an external attacker who has stolen the raw Discord Bot Token from directly invoking the Discord REST API. Token compromise requires immediate revocation in the Discord Developer Portal.

### Bot Token Rotation Runbook

1. **Detection & Triage:** Identify leaked token or suspicious API traffic.
2. **Immediate Token Reset:** Navigate to the Discord Developer Portal -> Bot -> Click **Reset Token**. This immediately invalidates the compromised token with Discord's gateway.
3. **Application Emergency Stop:** Enable the global emergency stop in Nexus configuration to pause dispatch loops and loggers.
4. **Credential Update:** Update the secret manager / deployment environment with the newly generated bot token.
5. **Worker Restart & Drain:** Restart bot instances and outbox dispatchers, verifying clean authentication with Discord Gateway v10.
6. **Audit & Reconciliation:** Review `audit_events` and Discord Audit Log to identify any unauthorized mutations executed during the compromise window.

## 11. Privacy and retention

Before public beta, define published retention periods for audit logs, moderation cases, tickets/transcripts, registration answers, evidence uploads, exports, sessions and backups. Provide server disconnect/export/deletion workflows consistent with legal obligations and the published policy. Do not retain more data merely because storage is cheap. Avoid storing unnecessary IP addresses/user-agent fingerprints; if collected for security, restrict access and define retention.

## 12. Security release gates

- Automated tenant-isolation tests cover read, list, update, delete, export, search and file access.
- Authorization matrix tests cover all role/capability presets plus explicit deny/expired grant/revocation cases.
- OWASP-style auth, access-control, validation, upload, session, rate-limit and secret checks completed.
- No critical/high unresolved security issue; high-severity exceptions require written risk acceptance and expiry.
- Audit, alert and recovery procedure tested in staging.
