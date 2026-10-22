# Platform Control Plane Specification

## 1. Purpose and boundary

The control plane is the internal interface for operating the product across all customer guilds. It is not simply a dashboard with an additional `superadmin` flag. It requires its own navigation, capability namespace, session policies, audit, risk controls and support-access workflow.

## 2. Primary sections

1. **Operations overview:** service health, incident state, bot Gateway/shard health, queue backlog, job failure rate, database pool and latency, external API errors and deploy version.
2. **Guild directory:** connected guild metadata needed for support, bot status, installed/enabled modules, last activity, configuration health and support case links. Avoid displaying member-level PII unless support case and capability require it.
3. **Feature governance:** global feature registry, prerequisites, default state, tenant eligibility, staged rollout percentage/allowlist, kill switch and change history. A global switch must not corrupt tenant configuration.
4. **Template library:** platform default game profiles/announcement templates with versioning, approval and compatibility checks. Tenant-specific changes never mutate a shared default.
5. **Identity and access:** named platform operators, teams, capabilities, session revocation, elevated-access policy and review of dormant accounts.
6. **Support:** case assignment, sanitized diagnostics, severity, approved temporary access request, support action history and customer-visible status where relevant.
7. **Incidents:** timeline, severity, affected services/tenants, owner, mitigation actions, communication and postmortem links.
8. **Release management:** current version, migration status, feature-flagged rollout, rollback eligibility and release notes. Deploy credentials remain in CI/hosting platform, not the browser.
9. **Data governance:** retention policy versions, export/deletion requests, policy jobs and completion status. Operators cannot make ad hoc raw database edits through the console.
10. **Service limits and later billing:** entitlements and quota definitions only when commercial plans are approved. Do not use an unapproved payment flow in P0.

## 3. Operator roles

- **Owner:** ultimate governance authority; protected with strong auth and audit.
- **Security administrator:** security, account review, incident response and temporary access approvals.
- **Operations administrator:** deployment state, health, configuration and incident mitigation.
- **Support operator:** assigned support cases with least-privilege diagnostics.
- **Analyst:** aggregate product/service metrics.
- **Read-only auditor:** audit records and compliance evidence without mutation privileges.

Capabilities should be granted separately (e.g. `platform.guild.inspect`, `platform.support.grant_tenant_access`, `platform.feature_flag.rollout`, `platform.operator.revoke`, `platform.incident.lockdown`). The UI should show why access exists and who granted it.

## 4. Cross-tenant support access

Support access to guild data is denied by default. An approved workflow records purpose, ticket, requested guild, requested resource/capability, requester, approver if required, expiry and resulting audit trace. Prefer sanitized diagnostics to direct content access. Temporary access expires automatically; termination and all access are audited. A support operator must not impersonate a user or silently change guild roles.

## 5. Global changes and feature flags

- Global template or policy changes have draft, reviewed, published and rolled-back states.
- Global changes show the number/segment of tenants affected and compatibility status.
- Staged rollout targets can be internal guilds, opt-in beta guilds or a measured percentage; no random rollout without a way to identify target tenants.
- Kill switches disable the affected capability safely while preserving data and giving tenants an explanation.
- Tenant override precedence is documented and versioned; disabling a global feature must not silently erase tenant custom configuration.
- Record actor, reason, before/after revision, rollout scope and outcome.

## 6. Operational console requirements

- Display freshness and source timestamp on health metrics.
- Separate live incident status from historic analytics.
- Show whether an action is read-only, reversible, tenant-impacting or service-impacting.
- Require confirmation and reason for global changes, bulk tenant mutations or incident lockdown.
- Expose logs/trace IDs and safe diagnostic links, not environment variables, tokens, raw session cookies or unrestricted query consoles.
- All long-running actions (data export, cleanup, rollout) use durable job state and can be inspected/retried/cancelled where safe.

## 7. Control-plane acceptance gates

- A guild admin cannot reach platform routes or query platform data.
- A platform support operator cannot view private tenant data without the required grant.
- Expired/revoked temporary access stops working on the next request and invalidates cached privileges.
- Platform identity changes and privileged sessions are auditable.
- Global feature changes can be previewed, staged, halted and rolled back when the change is reversible.
- Emergency operation and credential rotation have been rehearsed in staging.
