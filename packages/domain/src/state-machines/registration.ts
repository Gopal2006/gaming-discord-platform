import { InvalidStateTransitionError } from "../errors.js";

export type RegistrationState =
  | "draft"
  | "submitted"
  | "pending_review"
  | "accepted"
  | "waitlisted"
  | "rejected"
  | "checked_in"
  | "eligible"
  | "withdrawn"
  | "disqualified"
  | "expired";

export type RegistrationAction =
  | "submit"
  | "send_to_review"
  | "accept"
  | "waitlist"
  | "reject"
  | "check_in"
  | "confirm_eligibility"
  | "withdraw"
  | "disqualify"
  | "expire";

const TRANSITIONS: Record<
  RegistrationState,
  Partial<Record<RegistrationAction, RegistrationState>>
> = {
  draft: {
    submit: "submitted",
    withdraw: "withdrawn",
  },
  submitted: {
    send_to_review: "pending_review",
    accept: "accepted",
    waitlist: "waitlisted",
    reject: "rejected",
    withdraw: "withdrawn",
    expire: "expired",
  },
  pending_review: {
    accept: "accepted",
    waitlist: "waitlisted",
    reject: "rejected",
    withdraw: "withdrawn",
    expire: "expired",
  },
  waitlisted: {
    accept: "accepted",
    reject: "rejected",
    withdraw: "withdrawn",
    expire: "expired",
  },
  accepted: {
    check_in: "checked_in",
    withdraw: "withdrawn",
    disqualify: "disqualified",
    expire: "expired",
  },
  checked_in: {
    confirm_eligibility: "eligible",
    disqualify: "disqualified",
  },
  eligible: {
    disqualify: "disqualified",
  },
  rejected: {},
  withdrawn: {},
  disqualified: {},
  expired: {},
};

export function transitionRegistration(
  currentState: RegistrationState,
  action: RegistrationAction,
): RegistrationState {
  const allowed = TRANSITIONS[currentState]?.[action];
  if (!allowed) {
    throw new InvalidStateTransitionError("Registration", currentState, action);
  }
  return allowed;
}

export function canTransitionRegistration(
  currentState: RegistrationState,
  action: RegistrationAction,
): boolean {
  return !!TRANSITIONS[currentState]?.[action];
}
