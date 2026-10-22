---
name: visual-engineering
description: Use when designing or implementing a Nexus dashboard/control-plane screen, component, page layout, responsive view, visual prototype, or public website section. Enforce product-specific art direction, hierarchy, and browser-verified interaction rather than generic dashboard output.
---

# Nexus Visual Engineering

## Mission

Build UI that is distinctive, clear, functional and verifiably correct for a gaming/esports operations product. Craft matters, but correctness, access transparency and task success outrank decorative polish.

## Before editing

1. Read `DESIGN_SYSTEM.md` and the relevant screen spec.
2. Inspect existing tokens, components, route structure, package dependencies, current design intent and `git status --short`.
3. Name the persona, job, primary action, scope (which guild/resource), and success criteria.
4. Identify data sources and all relevant states. Never invent metrics or placeholder content that can survive into production.
5. If a brand/style decision is ambiguous, propose two or three materially different directions and compare them against audience, task and brand; don't ship random novelty by default.

## Implementation rules

- Use existing tokens/components before creating new visual primitives.
- Compose from an intentional layout grid; keep current guild/resource context visible.
- Make primary action clear; group related settings; keep destructive/bulk actions visually and behaviorally separate.
- Use restrained, purposeful visual hierarchy. Do not add arbitrary gradients, glow, glass, cards or motion simply because a gaming product might use them.
- Design realistic content density: real labels, long names, missing values, statuses, counts, timestamps and large tables.
- New components follow the component contract in `DESIGN_SYSTEM.md`; no one-off button/menu/dialog behavior if a shared primitive already serves the need.
- Add only libraries justified by a real gap. Check current packages first.

## Verification loop

1. Implement function and states.
2. Run lint/typecheck/tests relevant to the change.
3. Run the app and navigate to the exact route.
4. Inspect desktop and narrow viewports; verify loading/empty/error/permission-denied/pending/partial states.
5. Test actual click/keyboard behavior and browser console/network errors.
6. Capture a screenshot or recording when layout/motion materially changes; compare against the spec and fix observed issues.
7. Report changes and the evidence actually gathered.

## Done

No generic placeholder design; correct data and authorization states; no broken overflow; all primary actions work; design tokens are consistent; keyboard/focus/responsive behavior is checked; evidence is included. A rendered screenshot is not proof that backend authorization or accessibility is correct.
