# Command and Interaction Catalog

**Status:** proposed target catalog. Names are not final Discord registrations; they must be validated against Discord's current command constraints and actual implementation. This catalog describes intended product capability, not currently shipped commands.

## 1. Conventions

- Slash commands are the primary command surface; commands are namespaced by product domain.
- Complex authoring and bulk configuration belongs in the dashboard; Discord commands provide concise operation and status.
- Final command registration schema is generated from typed definitions and included in docs/CI verification where practical.
- Every command specifies guild-only/DM support, actor capability, arguments/types/defaults, output visibility, effects, audit class, cooldown/rate-limit, idempotency and all failure outcomes.
- A command should not expose every database knob. Prefer a small number of domain actions with validated options.

## 2. Target commands by domain

### General, setup and diagnostics

| Command            | Capability                                             | Default access                                   |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------ |
| `/help`            | Discover usable commands and help                      | All users; permission-aware output               |
| `/status`          | View bot/feature status for current guild              | Public summary; sensitive diagnostics restricted |
| `/setup start`     | Start guided server setup                              | Guild owner or delegated setup capability        |
| `/setup status`    | View prerequisites and setup steps                     | Setup/read-config capability                     |
| `/setup repair`    | Repair selected safe mappings/config                   | Separate repair capability; preview/audit        |
| `/config view`     | Read settings summary                                  | Config-read capability                           |
| `/diagnostics`     | Diagnose bot permissions, hierarchy, channels, modules | Config-read/security-diagnostics capability      |
| `/server overview` | Server overview stats                                  | Configured visibility policy                     |
| `/bot invite`      | Link to add the bot                                    | Public                                           |

### Permissions and access

| Command               | Capability                                            | Default access                                               |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `/permissions view`   | Show effective capabilities                           | Self-check or config-read capability                         |
| `/permissions grant`  | Grant a delegated capability                          | Server owner or grant-authorized admin; cannot self-escalate |
| `/permissions revoke` | Revoke a grant                                        | Server owner or grant-authorized admin                       |
| `/permissions test`   | Evaluate whether a principal can perform a capability | Config-read/test-access capability                           |
| `/access list`        | List delegations and expiry                           | Server owner/access manager                                  |
| `/access revoke`      | Emergency revocation of a delegation                  | Server owner/access manager                                  |

### Moderation and safety

`/mod warn`, `/mod timeout`, `/mod untimeout`, `/mod kick`, `/mod ban`, `/mod unban`, `/mod history`, `/mod case`, `/mod note`, `/mod purge`, `/mod slowmode`, `/mod lock`, `/mod unlock`, `/report create`, `/report status`, `/appeal create`, `/appeal status`, `/security status`, `/security verify`, `/security quarantine`, `/security review`, `/security incident`.

Every punitive action has a required reason and actor/target/bot hierarchy checks. Broad anti-raid actions require explicit capability and configured safe response. A `security incident` command starts a predefined, bounded workflow; it does not mean a universal one-shot nuke/lockdown.

### Announcements and templates

`/announce create`, `/announce preview`, `/announce publish`, `/announce schedule`, `/announce list`, `/announce cancel`, `/template list`, `/template preview`, `/template clone`, `/reminder create`, `/reminder list`, `/reminder cancel`.

Full template field editing is dashboard-first. Commands are for common actions and quick operations. Publishing validates channel capability, allowed mentions, links/assets and workflow state.

### Game/event/registration

`/game list`, `/game profile`, `/event list`, `/event view`, `/event register`, `/event unregister`, `/event status`, `/event check-in`, `/team create`, `/team invite`, `/team join`, `/team leave`, `/team roster`, `/team captain`, `/tournament list`, `/tournament view`, `/tournament check-in`, `/tournament my-matches`, `/tournament standings`, `/match report-score`, `/match dispute`, `/scrim request`, `/scrim list`, `/scrim accept`, `/scrim decline`, `/scrim cancel`.

Participant-facing commands show only information that is public or authorized for that participant. The dashboard owns complex game profile, form schema and bracket editing. Match commands are restricted to participants, assigned officials or specific organizers as policy dictates.

### Tickets and engagement

`/ticket open`, `/ticket claim`, `/ticket close`, `/ticket reopen`, `/ticket add`, `/ticket remove`, `/ticket transcript`, `/poll create`, `/poll close`, `/poll results`, `/giveaway create`, `/giveaway end`, `/giveaway reroll`, `/giveaway list`, `/suggestion submit`, `/suggestion status`, `/faq search`, `/member profile`, `/role menu`.

Ticket closing archives and controls access according to policy; channel deletion is a distinct retention-controlled operation. Giveaway eligibility and results are auditable. Public feedback features honor the server's anonymous/attributed policy.

## 3. Legacy reference commands requiring reconciliation

The attachment reports these current/legacy commands: `/setupbot`, `/set-botrole`, `/remove-botrole`, `/set-welcome`, `/set-leave`, `/set-log`, `/set-cmdlog`, `/config`, `/serverstats`, `/set-status`, `addnp`, `removenp`, `nplist`, `sync`, `invite`, `/kick`, `/ban`, `/unban`, `/mute`, `/unmute`, `/warn`, `/warnings`, `/clearwarns`, `/purge`, `/slowmode`, `/lock`, `/unlock`, `/announce`, `/dm-user`/`/dm`, `/dm-role`, `/giveaway start|end|reroll|list`, `/poll`, `/endpoll`, `/ticket setup|set-role|close|add|remove`.

Rebuild equivalents using the new authorization, durability and usability model. Do not port the custom no-prefix dispatcher by default. Global presence management becomes a platform-only control-plane operation, not a guild command. Clear-warning and delete-ticket operations need explicit audit/retention semantics.

## 4. Non-command interactions

- Persistent announcement/ticket/poll/event panels with signed or versioned references, but never authorization encoded solely in custom IDs.
- Modals for short, structured inputs; long forms use the web dashboard.
- Select menus for roles, channels, game profiles, events and teams where valid choices are bounded.
- Buttons for register, check in, vote, open ticket, confirm/decline invitations and view authorized status.
- Notifications for deadline reminders, match schedule changes, accepted registrations, staff decisions and security incidents.
- Context-menu actions only when they improve discovery and have clear target-scope constraints.

## 5. Documentation requirement per command

Use this schema in generated command docs:

- Name/description/category/version;
- invocation examples and all options (type, required, default, constraints);
- guild/DM restrictions;
- required capability and Discord permission bit(s);
- target hierarchy/rules;
- privacy/output visibility;
- preconditions/state guards;
- state mutation and external side effects;
- audit event and reason policy;
- cooldown/rate-limit/idempotency;
- errors and user recovery;
- tests and source implementation location.
