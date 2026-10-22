---
name: design-system
description: Use when creating or changing shared UI components, design tokens, themes, charts, tables, buttons, dialogs, menus, navigation, or component documentation for Nexus.
---

# Nexus Design System Engineering

## Goal

Keep dashboard, control plane and public website coherent without forcing all surfaces into one layout. Maintain shared foundations while honoring different task density and audiences.

## Workflow

1. Read `DESIGN_SYSTEM.md`, current tokens, component library, related usage and tests.
2. Decide whether the need is a new component, a variant, or a documented usage pattern. Prefer extending a reusable primitive only when the semantic purpose genuinely matches.
3. Specify component purpose, anatomy, props/defaults, variants, all states, responsive behavior, keyboard/focus behavior, accessibility semantics, error/permission behavior and do/don't examples.
4. Implement tokens before hardcoded exceptions. If a deliberate exception is necessary, document why.
5. Test component in a state workbench/story/demo or dedicated test route, with realistic data and every relevant branch.
6. Run visual, interaction, accessibility and regression review before adoption.

## Required state matrix

At minimum consider default, hover, focus-visible, active, disabled, loading, success, error, empty, selected/expanded and permission-denied where meaningful. For forms also consider untouched, invalid, submitting, server rejection and preserved values after failure. For data components include stale data, no-results and partial results.

## Governance

- Tokens and shared primitives have clear maintainers and a change review path.
- Avoid adding duplicate components that differ only cosmetically.
- Document breaking prop/token changes and migrate consumers deliberately.
- Deprecated variants have a removal/migration note; do not silently remove an API used across apps.
- Tests cover behavior and accessibility, not only snapshots.
- Prefer evidence to taste: a visual inconsistency is a defect when it violates token/component contract; a deliberate style difference is not automatically wrong.

## Accessibility baseline

Use semantic HTML and accessible primitives. Keyboard navigation, focus restoration, correct disabled semantics, labels/names, status announcements and contrast are part of component correctness—not a post-launch patch. See `.agents/skills/accessibility/SKILL.md`.
