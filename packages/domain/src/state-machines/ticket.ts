import { InvalidStateTransitionError } from "../errors.js";

export type TicketState =
  | "open"
  | "claimed"
  | "in_progress"
  | "pending_user"
  | "pending_staff"
  | "resolved"
  | "archived"
  | "reopened"
  | "cancelled"
  | "retention_expired";

export type TicketAction =
  | "claim"
  | "start_work"
  | "wait_for_user"
  | "wait_for_staff"
  | "resolve"
  | "archive"
  | "reopen"
  | "cancel"
  | "expire_retention";

const TRANSITIONS: Record<
  TicketState,
  Partial<Record<TicketAction, TicketState>>
> = {
  open: {
    claim: "claimed",
    start_work: "in_progress",
    resolve: "resolved",
    cancel: "cancelled",
  },
  claimed: {
    start_work: "in_progress",
    wait_for_user: "pending_user",
    resolve: "resolved",
    cancel: "cancelled",
  },
  in_progress: {
    wait_for_user: "pending_user",
    wait_for_staff: "pending_staff",
    resolve: "resolved",
    cancel: "cancelled",
  },
  pending_user: {
    start_work: "in_progress",
    resolve: "resolved",
    cancel: "cancelled",
  },
  pending_staff: {
    start_work: "in_progress",
    resolve: "resolved",
    cancel: "cancelled",
  },
  resolved: {
    archive: "archived",
    reopen: "reopened",
  },
  reopened: {
    claim: "claimed",
    start_work: "in_progress",
    resolve: "resolved",
    cancel: "cancelled",
  },
  archived: {
    expire_retention: "retention_expired",
  },
  cancelled: {
    archive: "archived",
  },
  retention_expired: {},
};

export function transitionTicket(
  currentState: TicketState,
  action: TicketAction,
): TicketState {
  const allowed = TRANSITIONS[currentState]?.[action];
  if (!allowed) {
    throw new InvalidStateTransitionError("Ticket", currentState, action);
  }
  return allowed;
}

export function canTransitionTicket(
  currentState: TicketState,
  action: TicketAction,
): boolean {
  return !!TRANSITIONS[currentState]?.[action];
}
