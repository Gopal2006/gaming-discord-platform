---
name: verification-and-review
description: Use for reviewing pull requests or completing substantial feature work across Nexus. Requires evidence-based findings, full-diff review, appropriate testing and explicit completion status.
---

# Nexus Verification and Review

## Lock the task

Keep the user requirement authoritative. Identify intended outcome, changed surfaces, constraints, data/security impact, acceptance gates and tests. Do not silently replace the requested product behavior or broaden scope.

## Review approach

1. Inspect `git status --short`, whole relevant diff, related source and tests before forming a verdict.
2. Trace each changed UI/API/Discord path to domain rules and persistence as relevant.
3. Check permissions/tenant context, input validation, response serialization, state transitions, idempotency and error handling.
4. Run the appropriate lint/typecheck/build/test commands; record actual outcomes.
5. For UI changes, render relevant routes/states and inspect real browser interactions, responsive layout and accessibility.
6. Classify findings as blocker/critical/high/medium/low or note; include evidence, impact, reproduction and correction.
7. Distinguish introduced regressions from pre-existing issues. Scope review to affected surfaces but mention a serious pre-existing blocker if it directly invalidates safety or release.
8. Re-test after fixes; inspect final diff.

## Evidence standard

A claim that a feature, test, route or state works must be tied to a test run, observed behavior or direct code evidence. Do not claim to have rendered/tested a route if the browser/runtime was unavailable. Don't report a visual preference as a defect unless it violates a project requirement, design contract, accessibility criterion or clear task outcome.

## Risk-based review

Give priority to tenant isolation, auth/session, privilege escalation, data loss, duplicate external side effects, dangerous mass actions, migrations, data retention and public/private content. Then correctness/performance/UX and visual polish. A beautiful screenshot does not pass security. Passing unit tests does not prove UI usability.

## Final report

List files changed; behavior implemented; commands/tests run with pass/fail/unrun; browser/visual/accessibility evidence when relevant; migrations/deployment notes; known gaps and residual risks. No vague "looks good" and no fabricated verification.
