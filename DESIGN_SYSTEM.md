# Design System and UI Engineering Standard

## 1. Purpose

Create one coherent, maintainable design language across the server dashboard, platform control plane and public website without making these three surfaces identical. A shared foundation should cover typography, tokens, primitive components, interaction states and accessibility. Product surfaces can vary in density and information architecture according to their tasks.

## 2. Design values

- **Distinct, not generic:** every color, layout, icon, chart and motion decision serves the product or user task. Avoid familiar generated patterns (stack of identical cards, arbitrary gradients, decorative noise, excessive glow, random rounded rectangles) unless the product brief supports them.
- **Task-first hierarchy:** the interface should make the primary action, current scope, current state and next step obvious.
- **Quiet confidence:** favor precise typography, consistent spacing, high-contrast status, clear navigation, restrained surfaces and meaningful data.
- **Operational truth:** charts and status indicators derive from real backend data and show range/freshness. Never invent metrics or imply a job is finished while it is pending.
- **Interaction before polish:** a visually perfect component with unclear behavior is not complete.
- **Consistent local rules:** any intentional exception is documented; the same interaction should not behave differently across pages without a meaningful reason.

## 3. Token architecture

Define tokens in source, not scattered magic values. Minimum groups:

- Color: background/surface tiers, foreground tiers, border, focus, primary, secondary, accent, success, warning, danger, info, and chart series. Every semantic status has text/icon semantics; color alone is insufficient.
- Typography: font families, scale, line heights, weights, letter spacing and numeric styles.
- Spacing: one documented base scale; layout gaps reference tokens.
- Radius: a small consistent scale for inputs, menus, panels, dialogs and large containers.
- Elevation: border/surface separation first; shadows only where they clarify stacking.
- Z-index/layers: menus, popovers, dialogs, toasts, global navigation and sticky headers.
- Motion: duration/easing for enter/exit, feedback, expansion and route transitions; reduced-motion override.
- Breakpoints/content widths: content-driven, shared where sensible.
- Data visualization: colorblind-safe categorical palette, sequential/diverging palettes, grid/axis/tooltip design.

Create semantic theme tokens such as `--surface-page`, `--surface-raised`, `--text-primary`, `--text-muted`, `--border-subtle`, `--status-danger` and `--focus-ring`. Components must consume tokens rather than hardcoded colors. Dark and light themes use the same semantic names.

## 4. Typography and density

Use a limited type scale that supports dense operational work: strong page title, descriptive section title, readable body, compact table/meta text and tabular numerals for counts/scores. Avoid shrinking critical text just to fit more columns. Keep line lengths comfortable and prevent long IDs/URLs from breaking layouts unexpectedly. Do not introduce a new font without a deliberate brand/accessibility reason and verified loading/fallback behavior.

Define density variants only where they serve real tasks (e.g. default and compact table rows). A compact variant must preserve target size, keyboard focus, touch support and legibility.

## 5. Component contract

Each shared component specification states:

1. Purpose and when not to use it.
2. Anatomy and semantic HTML element/role.
3. Props/API, default values and controlled/uncontrolled behavior.
4. Variants and supported sizes.
5. State matrix: default, hover, focus-visible, active, disabled, loading, success, error, empty or selected where applicable.
6. Keyboard, focus management, ARIA/screen-reader behavior and reduced motion.
7. Responsive behavior and overflow rules.
8. Validation/permission behavior if the component represents an action.
9. Examples and anti-patterns.
10. Tests for meaningful state/behavior.

Build with accessible primitives rather than re-implementing complex menu/dialog primitives unnecessarily. Inspect current dependencies before adding a new library. Recommend one fit-for-purpose dependency, explain trade-offs and avoid dependency churn.

## 6. Data display patterns

### Tables

Use for comparison, scanning and bulk work. Specify loading, empty, zero-results, error, selection, disabled-row, stale-data and partial-action states. Columns have explicit min/max widths and overflow behavior. Changing numbers should use tabular numerals. Sorting/filtering/pagination are accessible and reflected in URL/state when they should be shareable.

### Forms

Labels persist after typing. Helper text describes constraints. Errors identify how to fix the input. Required fields are clear. Complex forms group related questions, preserve values on failure and distinguish draft/save state from published state. Avoid a modal for long multi-step creation when a page/wizard is more appropriate.

### Charts and operational dashboards

Visualize a real question, not data for decoration. Display timeframe, units, empty state, freshness and accessible textual/table alternative. Never hide a critical status only in hover tooltips. Avoid 3D charts and misleading axes.

### Empty and error states

An empty state explains why nothing exists and the next action. A filtered-zero state offers filter reset. Permission denial tells the user what capability is required without leaking private content. Errors say what happened, likely reason where known, and next step/retry. Preserve entered data.

## 7. Motion system

Motion is purposeful and brief:

- Use it for direct feedback, orientation, panel/dialog transitions and status changes.
- Prefer transform and opacity for animations; measure layout/paint-heavy effects rather than assume they are cheap.
- Set durations/easing in named tokens and keep repeated actions consistent.
- Use exit animations only when they do not delay critical task completion or make state ambiguous.
- Respect `prefers-reduced-motion`; offer non-motion equivalents.
- Pause expensive or offscreen animations. Clean up timers, event handlers, observers, animation frames and WebGL resources on unmount/navigation.
- Avoid animating every value in dense tables or chart updates without a clear benefit.
- Do not add `will-change` indiscriminately; profile first.

## 8. Accessibility standard

Target WCAG 2.2 AA for user-facing web surfaces. Review with: keyboard-only task completion, visible focus, semantic landmarks/headings, accessible names/roles/states, labels and errors, focus management, text resize/zoom/reflow, contrast, status announcements, target size, reduced motion and screen-reader checks. Keep a non-color status indicator and textual summary. Bracket views, calendar controls, charts, tables and icon-only controls must have accessible alternatives.

## 9. UI creation workflow

1. Read `PRODUCT_SCOPE.md`, this file, existing components/tokens and the relevant screen spec.
2. Identify persona, job, primary action, state sources and success criteria.
3. Inspect any provided reference/site/source with enough detail to identify its layout and behavior; verify current platform/framework facts through official docs before making version-sensitive decisions.
4. Establish page structure and information hierarchy before styling.
5. If the visual direction is uncertain, prototype materially different alternatives, not cosmetic variations, and select a direction based on user/task fit.
6. Implement using existing tokens/primitives first.
7. Test all relevant component/route states and keyboard paths.
8. Render in a real browser at required viewport sizes; capture screenshots and compare with spec/reference.
9. Run accessibility, responsive and visual checks; fix defects, then repeat the render/check loop.
10. Submit a concise handoff: files changed, behavior, evidence/screenshots, tests run and remaining risks.

## 10. Design QA checklist

- [ ] Page has obvious title/current scope and one clear primary action.
- [ ] Content hierarchy, spacing, typography and tokens are consistent.
- [ ] No arbitrary decorative effect competes with core task.
- [ ] Every state listed in the route/component contract is rendered and reviewed.
- [ ] Controls work by keyboard and expose accessible names/states.
- [ ] Contrast, focus, zoom/reflow and reduced motion are checked.
- [ ] Mobile/narrow layout preserves primary task and critical columns.
- [ ] Loading/empty/error/permission denied/partial success states are intentional.
- [ ] Images/assets are optimized; animations and listeners are cleaned up.
- [ ] Screenshot/browser QA performed at supported viewports.
- [ ] No fake data in production path; no console errors or hydration warnings.
- [ ] Visual and interaction regression tests updated where appropriate.
