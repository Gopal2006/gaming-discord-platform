---
name: motion-performance
description: Use when adding/reviewing transitions, scroll animation, charts, canvas/WebGL, timers, observers, requestAnimationFrame loops or investigating jank and long-session memory/performance issues in Nexus web apps.
---

# Nexus Motion and Frontend Performance

## Intent gate

Every animation must answer: what feedback/orientation does it provide? If removing it improves clarity or performance without hurting comprehension, omit it. Do not add decorative motion just to signal polish.

## Before changing code

- Read current implementation, dependencies, `DESIGN_SYSTEM.md` and related route/component state machine.
- Capture a baseline in the real browser with representative data and route interactions.
- Search for CSS keyframes/transitions, `requestAnimationFrame`, timers, observers, event listeners, media, canvas/WebGL and animation-library timelines.
- Identify whether work affects style, layout, paint or compositing; profile instead of guessing.

## Implementation rules

- Prefer transform/opacity for simple transitions when visually appropriate.
- Respect reduced-motion preferences; provide static/low-motion equivalent.
- Pause offscreen/hidden work if it has meaningful cost and resume correctly when visible.
- Clean up RAF loops, timeouts/intervals, event listeners, observers and animation-library contexts on unmount/route transition.
- Avoid React state updates on every frame unless needed; separate animation from expensive data render paths.
- Don't apply `will-change` globally or add canvas/WebGL for simple UI.
- Motion should not block primary actions, prevent an announcement from being perceived, or keep a screen reader in an ambiguous state.

## Verify

Reproduce the route/action, compare baseline to modified build, inspect frame drops/CPU/memory and check route unmount/remount or long-session behavior when relevant. Confirm the animation appears only in intended states, respects reduced motion, cleans up resources and has no console errors. State measured results; do not promise a frame rate without evidence.
