import { InvalidStateTransitionError } from "../errors.js";

export type MatchState =
  | "scheduled"
  | "open"
  | "ready"
  | "live"
  | "result_pending"
  | "confirmed"
  | "finalized"
  | "delayed"
  | "rescheduled"
  | "forfeit_pending"
  | "disputed"
  | "cancelled"
  | "voided";

export type MatchAction =
  | "open_checkin"
  | "ready_up"
  | "start_match"
  | "submit_result"
  | "confirm_result"
  | "finalize"
  | "delay"
  | "reschedule"
  | "mark_forfeit_pending"
  | "raise_dispute"
  | "resolve_dispute"
  | "cancel"
  | "void";

const TRANSITIONS: Record<
  MatchState,
  Partial<Record<MatchAction, MatchState>>
> = {
  scheduled: {
    open_checkin: "open",
    delay: "delayed",
    reschedule: "rescheduled",
    cancel: "cancelled",
  },
  delayed: {
    open_checkin: "open",
    reschedule: "rescheduled",
    cancel: "cancelled",
  },
  rescheduled: {
    open_checkin: "open",
    delay: "delayed",
    cancel: "cancelled",
  },
  open: {
    ready_up: "ready",
    mark_forfeit_pending: "forfeit_pending",
    cancel: "cancelled",
  },
  ready: {
    start_match: "live",
    mark_forfeit_pending: "forfeit_pending",
    cancel: "cancelled",
  },
  live: {
    submit_result: "result_pending",
    raise_dispute: "disputed",
    mark_forfeit_pending: "forfeit_pending",
    cancel: "cancelled",
  },
  result_pending: {
    confirm_result: "confirmed",
    raise_dispute: "disputed",
  },
  confirmed: {
    finalize: "finalized",
    raise_dispute: "disputed",
  },
  disputed: {
    resolve_dispute: "confirmed",
    void: "voided",
  },
  forfeit_pending: {
    submit_result: "result_pending",
    confirm_result: "confirmed",
    cancel: "cancelled",
  },
  finalized: {},
  cancelled: {},
  voided: {},
};

export function transitionMatch(
  currentState: MatchState,
  action: MatchAction,
): MatchState {
  const allowed = TRANSITIONS[currentState]?.[action];
  if (!allowed) {
    throw new InvalidStateTransitionError("Match", currentState, action);
  }
  return allowed;
}

export function canTransitionMatch(
  currentState: MatchState,
  action: MatchAction,
): boolean {
  return !!TRANSITIONS[currentState]?.[action];
}
