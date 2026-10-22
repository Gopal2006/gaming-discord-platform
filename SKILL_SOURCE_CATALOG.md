# Design and Agent Skill Source Catalog

This catalog records the relevant `SKILL.md` sources found in the six requested repositories, why they apply, and the project-specific instruction derived for Nexus. Repository trees and the relevant skill-file contents were inspected to classify applicability and extract core workflow principles; this was not an exhaustive audit of every auxiliary file in all six repositories. Their complete text has **not** been copied or vendored into this repository. The files under `.agents/skills/` are independently written, tailored instructions.

## Selection rule

Use source skills where their scope matches a real task. A skill is not a reason to install a tool or introduce an effect. First inspect the repo, existing package/library, user goal, design contract and current official technology docs. Adapt the underlying method into measurable project gates. Treat visual taste as a hypothesis that needs user/task fit and rendered-browser evidence; don't treat every deliberate style choice as a defect.

## Tier 1 — direct references for recurring dashboard work

### Emil Kowalski — design engineering, component craft and motion

Repository: https://github.com/emilkowalski/skills (MIT metadata at inspection).

- [`emil-design-eng`](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md) — craft philosophy, component behavior, meaningful detail, interaction consistency. Adapted into `DESIGN_SYSTEM.md` and `.agents/skills/visual-engineering/SKILL.md`.
- [`animation-performance`](https://github.com/emilkowalski/skills/blob/main/skills/animation-performance/SKILL.md) — measure frame behavior; understand layout/paint/composite costs; avoid overusing `will-change`; profile. Adapted into `DESIGN_SYSTEM.md` and `.agents/skills/motion-performance/SKILL.md`.
- [`improve-animations`](https://github.com/emilkowalski/skills/blob/main/skills/improve-animations/SKILL.md) — read-only audit, rank animation work by leverage, provide executable plan. Adapted into motion audit procedure; do not add decorative motion by default.
- [`pick-ui-library`](https://github.com/emilkowalski/skills/blob/main/skills/pick-ui-library/SKILL.md) — inspect current dependencies first, select one appropriate tool, avoid dependency churn. Adapted into `AGENTS.md` and design-system workflow.
- [`prototype`](https://github.com/emilkowalski/skills/blob/main/skills/prototype/SKILL.md) — build materially different alternatives when direction is uncertain. Adapted to optional dashboard/prototype exploration before committing to a visual direction.

### Garden Skills — browser-rendered design engineering

Repository: https://github.com/ConardLi/garden-skills (MIT metadata at inspection).

- [`web-design-engineer`](https://github.com/ConardLi/garden-skills/blob/main/skills/web-design-engineer/SKILL.md) — visual front-end deliverables, verify product/technology facts, inspect a real browser-rendered result, design system coherence and QA. Primary source for the browser-render-review loop in `DESIGN_SYSTEM.md` and `.agents/skills/visual-engineering/SKILL.md`.

### Elaya Design — landing page and conversion clarity

Repository: https://github.com/elayadesign/ai-design-skills (MIT metadata at inspection).

- [`landing-page-design`](https://github.com/elayadesign/ai-design-skills/blob/main/skills/landing-page-design/SKILL.md) — define one audience, one offer, one primary action; establish page structure before visual choices. Applied only to `PUBLIC_SITE_SPEC.md`. Marketing conversion tactics do not override admin-dashboard usability, access transparency or safety.

### Meng To — design-first prompting and verification

Repository: https://github.com/MengTo/Skills (MIT metadata at inspection).

- [`design-first-ui-prompting`](https://github.com/MengTo/Skills/blob/main/agent-skills/ui/design-first-ui-prompting/SKILL.md) — turn fuzzy ideas into explicit format, hierarchy, typography, constraints and copy. Adapted into UI task contracts and `AGENTS.md`.
- [`no-ai-design-slop`](https://github.com/MengTo/Skills/blob/main/agent-skills/ui/no-ai-design-slop/SKILL.md) — judge the actual result, preserve product direction, reject reflexive generic patterns. Adapted into design QA without forcing a fashionable style.
- [`iterate-until-verified`](https://github.com/MengTo/Skills/blob/main/agent-skills/codex/iterate-until-verified/SKILL.md) — preserve original outcome and convert quality claims into observable gates. Adapted into all implementation tasks and `IMPLEMENTATION_ROADMAP.md`.
- [`optimize-web-animations`](https://github.com/MengTo/Skills/blob/main/agent-skills/codex/optimize-web-animations/SKILL.md) — inspect animation/listener/observer/timer lifecycle, measure a baseline, clean up offscreen/unmounted work and validate after changes. Adapted into `.agents/skills/motion-performance/SKILL.md`.
- [`landing-page`](https://github.com/MengTo/Skills/blob/main/agent-skills/web-design/landing-page/SKILL.md) — single-action landing-page structure and proof. Supporting source for `PUBLIC_SITE_SPEC.md`.
- [`performance-profiling`](https://github.com/MengTo/Skills/blob/main/agent-skills/codex/performance-profiling/SKILL.md) is Apple-platform specific rather than a web performance playbook; it was inspected but is **not** used as a normative web tool procedure. Use browser/Node/Postgres profiling tools appropriate to this stack instead.

### Jakub Krehel — evidence-based interface quality

Repository: https://github.com/jakubkrehel/skills (MIT metadata at inspection).

- [`better-interface`](https://github.com/jakubkrehel/skills/blob/main/skills/better-interface/SKILL.md) — coordinate quality reviews across disciplines, use evidence and severity rather than taste alone. Adapted into `.agents/skills/verification-and-review/SKILL.md`.
- [`better-ui`](https://github.com/jakubkrehel/skills/blob/main/skills/better-ui/SKILL.md) — consistent optical polish and motion after interaction behavior is sound. Adapted to post-functionality polish, not first priority.
- [`better-accessibility`](https://github.com/jakubkrehel/skills/blob/main/skills/better-accessibility/SKILL.md) — keyboard-only and screen-reader walks against WCAG criteria. Adapted into `.agents/skills/accessibility/SKILL.md`.
- [`better-typography`](https://github.com/jakubkrehel/skills/blob/main/skills/better-typography/SKILL.md) — measurable line-height, wrapping, numerals and consistent type scale. Adapted to `DESIGN_SYSTEM.md`.
- [`build-design`](https://github.com/jakubkrehel/skills/blob/main/skills/build-design/SKILL.md) — implement against the supplied design/source, preserve intentional decisions and report conflicts. Adapted into handoff rules.
- [`interface-review`](https://github.com/jakubkrehel/skills/blob/main/skills/interface-review/SKILL.md) — review changes against the diff and affected surfaces, report regressions with evidence. Adapted into pull-request review skill.
- [`state-machine`](https://github.com/jakubkrehel/skills/blob/main/skills/state-machine/SKILL.md) — render/test component state variations explicitly. Adapted into `.agents/skills/forms-and-state/SKILL.md` and `WORKFLOW_STATE_MACHINES.md`.

### Owl-Listener — design systems, interaction design and design operations

Repository: https://github.com/Owl-Listener/designer-skills (MIT metadata at inspection).

- [`design-system-governance`](https://github.com/Owl-Listener/designer-skills/blob/main/design-systems/skills/design-system-governance/SKILL.md) — ownership, contribution, versioning, deprecation and review. Adapted into token/component governance.
- [`component-spec`](https://github.com/Owl-Listener/designer-skills/blob/main/design-systems/skills/component-spec/SKILL.md) — anatomy, variants, props, states, accessibility and usage rules. Adapted into component acceptance contract.
- [`accessibility-audit`](https://github.com/Owl-Listener/designer-skills/blob/main/design-systems/skills/accessibility-audit/SKILL.md) — severity and WCAG-focused remediation. Adapted into QA gates.
- [`design-qa-checklist`](https://github.com/Owl-Listener/designer-skills/blob/main/design-ops/skills/design-qa-checklist/SKILL.md) — visual accuracy, layout, interaction, content and accessibility checks. Adapted into `DESIGN_SYSTEM.md`.
- [`error-handling-ux`](https://github.com/Owl-Listener/designer-skills/blob/main/interaction-design/skills/error-handling-ux/SKILL.md) — prevention, detection, clear explanation and recovery. Adapted into forms and API error contracts.
- [`form-design`](https://github.com/Owl-Listener/designer-skills/blob/main/interaction-design/skills/form-design/SKILL.md) — field grouping, durable labels, validation and completion behavior. Adapted into dashboard forms.
- [`loading-states`](https://github.com/Owl-Listener/designer-skills/blob/main/interaction-design/skills/loading-states/SKILL.md) — progressive loading, skeletons, optimistic updates and rollback. Adapted into `SERVER_DASHBOARD_SPEC.md`.
- [`navigation-patterns`](https://github.com/Owl-Listener/designer-skills/blob/main/interaction-design/skills/navigation-patterns/SKILL.md) — navigation type matched to IA and task complexity. Adapted into dashboard navigation.
- [`onboarding-design`](https://github.com/Owl-Listener/designer-skills/blob/main/interaction-design/skills/onboarding-design/SKILL.md) — first value, progressive disclosure and confidence. Adapted into install/setup flow.
- [`state-machine`](https://github.com/Owl-Listener/designer-skills/blob/main/interaction-design/skills/state-machine/SKILL.md) — explicit states, events, guards and transitions. Adapted into `WORKFLOW_STATE_MACHINES.md`.
- [`responsive-design`](https://github.com/Owl-Listener/designer-skills/blob/main/ui-design/skills/responsive-design/SKILL.md) — fluid/adaptive/content-driven responsive behavior. Adapted into mobile dashboard requirements.
- [`visual-hierarchy`](https://github.com/Owl-Listener/designer-skills/blob/main/ui-design/skills/visual-hierarchy/SKILL.md) — size, weight, contrast, spacing and position guide scanning. Adapted into `DESIGN_SYSTEM.md`.
- [`information-architecture`](https://github.com/Owl-Listener/designer-skills/blob/main/ux-strategy/skills/information-architecture/SKILL.md) — content inventory, hierarchy and navigation depth. Adapted into server/control-plane structure.
- [`handoff-spec`](https://github.com/Owl-Listener/designer-skills/blob/main/design-ops/skills/handoff-spec/SKILL.md) — specify design measurements, behavior, assets, states and edge cases. Adapted into component and screen handoffs.
- [`design-critique`](https://github.com/Owl-Listener/designer-skills/blob/main/design-ops/skills/design-critique/SKILL.md) — structured critique process; relevant to design review, with product-level constraints in this project taking precedence.

## Tier 2 — useful only when the task calls for it

- Emil [`review-animations`](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/SKILL.md) when auditing an existing motion implementation.
- Emil [`find-animation-opportunities`](https://github.com/emilkowalski/skills/blob/main/skills/find-animation-opportunities/SKILL.md) when motion is explicitly part of a user experience need.
- Emil [`animation-vocabulary`](https://github.com/emilkowalski/skills/blob/main/skills/animation-vocabulary/SKILL.md) for naming/communicating motion behavior.
- Owl [`test-scenario`](https://github.com/Owl-Listener/designer-skills/blob/main/prototyping-testing/skills/test-scenario/SKILL.md), [`user-flow-diagram`](https://github.com/Owl-Listener/designer-skills/blob/main/prototyping-testing/skills/user-flow-diagram/SKILL.md) and [`wireframe-spec`](https://github.com/Owl-Listener/designer-skills/blob/main/prototyping-testing/skills/wireframe-spec/SKILL.md) for testing and handoff when real beta participants are available. If a path changes upstream, check the repository's `INDEX.md` before relying on it.

## What we deliberately do not adopt

- Do not use all skills on every task; use the smallest relevant set.
- Do not copy custom system prompts/initial-response scripts into project behavior.
- Do not accept fixed color/radius/motion values from a source as universal law. Use the chosen design tokens and test evidence.
- Do not turn marketing conversion tactics into admin UI patterns.
- Do not install every library mentioned by a curated skill; inspect the existing stack and use an ADR for meaningful dependency changes.
- Do not claim a UI is excellent from screenshot alone. Review actual interaction, responsive states, accessibility and backend truth.
- Do not replace tests/security review with a visual design review; each discipline keeps its own gate.

## Source freshness and attribution

These repositories can change. Before later installing or invoking a specific upstream skill, re-check the current `SKILL.md`, license, path and scope. The project-specific skills here are summaries and workflow adaptations written for our own product; they are not substitutes for upstream text and do not imply endorsement by those authors.
