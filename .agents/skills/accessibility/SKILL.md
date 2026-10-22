---
name: accessibility
description: Use whenever creating or reviewing web routes, custom interactive components, tables, charts, dialogs, forms, navigation or motion for Nexus. Target WCAG 2.2 AA.
---

# Nexus Accessibility Engineering

## Required review methods

1. **Keyboard-only pass:** complete the intended workflow without a mouse. Confirm logical tab order, visible focus, keyboard-operable menus/dialogs, Escape behavior and focus restoration.
2. **Semantic/assistive technology pass:** controls expose a meaningful name, role and state; headings and landmarks are ordered; validation/status changes are announced appropriately. Use a screen reader for critical flows when available.
3. **Visual/access pass:** contrast, zoom/reflow, readable text, target size, reduced motion, status not conveyed by color alone and responsive layout are checked.
4. **State pass:** disabled, loading, error, selected, expanded, permission denied and validation states remain understandable and operable as intended.

## Rules

- Prefer semantic HTML and established accessible primitives over custom ARIA-heavy widgets.
- Icon-only controls need names; decorative icons must not be announced as meaningful content.
- Every form control has an associated visible label. Errors are associated with the field and describe a corrective action.
- Dialogs trap focus appropriately, expose title/description, close predictably and restore focus to the invoker where sensible.
- Tables have headers and understandable sort/filter semantics. Dense data needs a mobile/readable alternative; charts need a text/table summary.
- Bracket, calendar and custom select widgets require a keyboard-accessible mode or alternate list/table interaction.
- Focus cannot rely on color-only hover, and status cannot rely on color alone.
- Respect `prefers-reduced-motion`; avoid motion that blocks task completion or creates seizure risk.
- Keep text zoom/reflow viable and prevent critical buttons/values from clipping at narrow widths.

## Finding format

For each failure report: location, user impact, reproducible path, relevant WCAG 2.2 criterion where known, severity, correction and verification step. Do not claim a criterion violation without evidence; separate blocking failures from enhancements.

## Done

Automated scans may supplement but do not replace actual keyboard and assistive-technology checks. Document any testing that could not be performed; do not mark an untested component fully accessible.
