import { InvalidStateTransitionError } from "../errors.js";

export type TournamentState =
  | "draft"
  | "scheduled"
  | "registration_open"
  | "registration_closed"
  | "check_in"
  | "ready"
  | "live"
  | "completed"
  | "archived"
  | "paused"
  | "cancelled"
  | "under_review";

export type TournamentAction =
  | "schedule"
  | "open_registration"
  | "close_registration"
  | "start_check_in"
  | "finalize_check_in"
  | "start_tournament"
  | "complete"
  | "archive"
  | "pause"
  | "resume"
  | "place_under_review"
  | "cancel";

const TRANSITIONS: Record<
  TournamentState,
  Partial<Record<TournamentAction, TournamentState>>
> = {
  draft: {
    schedule: "scheduled",
    open_registration: "registration_open",
    cancel: "cancelled",
  },
  scheduled: {
    open_registration: "registration_open",
    cancel: "cancelled",
  },
  registration_open: {
    close_registration: "registration_closed",
    cancel: "cancelled",
  },
  registration_closed: {
    start_check_in: "check_in",
    cancel: "cancelled",
  },
  check_in: {
    finalize_check_in: "ready",
    cancel: "cancelled",
  },
  ready: {
    start_tournament: "live",
    cancel: "cancelled",
  },
  live: {
    complete: "completed",
    pause: "paused",
    place_under_review: "under_review",
    cancel: "cancelled",
  },
  paused: {
    resume: "live",
    cancel: "cancelled",
  },
  under_review: {
    resume: "live",
    complete: "completed",
    cancel: "cancelled",
  },
  completed: {
    archive: "archived",
  },
  archived: {},
  cancelled: {},
};

export function transitionTournament(
  currentState: TournamentState,
  action: TournamentAction,
): TournamentState {
  const allowed = TRANSITIONS[currentState]?.[action];
  if (!allowed) {
    throw new InvalidStateTransitionError("Tournament", currentState, action);
  }
  return allowed;
}

export function canTransitionTournament(
  currentState: TournamentState,
  action: TournamentAction,
): boolean {
  return !!TRANSITIONS[currentState]?.[action];
}
