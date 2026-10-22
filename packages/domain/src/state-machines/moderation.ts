import { InvalidStateTransitionError } from "../errors.js";

export type ModerationCaseState =
  | "requested"
  | "authorized"
  | "executing"
  | "applied"
  | "notified"
  | "denied"
  | "execution_failed"
  | "applied_notification_failed"
  | "expired"
  | "reversed";

export type ModerationAction =
  | "authorize"
  | "deny"
  | "start_execution"
  | "apply_success"
  | "apply_failure"
  | "notify_success"
  | "notify_failure"
  | "expire"
  | "reverse";

const TRANSITIONS: Record<
  ModerationCaseState,
  Partial<Record<ModerationAction, ModerationCaseState>>
> = {
  requested: {
    authorize: "authorized",
    deny: "denied",
  },
  authorized: {
    start_execution: "executing",
  },
  executing: {
    apply_success: "applied",
    apply_failure: "execution_failed",
  },
  applied: {
    notify_success: "notified",
    notify_failure: "applied_notification_failed",
    expire: "expired",
    reverse: "reversed",
  },
  notified: {
    expire: "expired",
    reverse: "reversed",
  },
  applied_notification_failed: {
    expire: "expired",
    reverse: "reversed",
  },
  denied: {},
  execution_failed: {},
  expired: {},
  reversed: {},
};

export function transitionModerationCase(
  currentState: ModerationCaseState,
  action: ModerationAction,
): ModerationCaseState {
  const allowed = TRANSITIONS[currentState]?.[action];
  if (!allowed) {
    throw new InvalidStateTransitionError(
      "ModerationCase",
      currentState,
      action,
    );
  }
  return allowed;
}

export function canTransitionModerationCase(
  currentState: ModerationCaseState,
  action: ModerationAction,
): boolean {
  return !!TRANSITIONS[currentState]?.[action];
}
