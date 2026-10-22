import { InvalidStateTransitionError } from "../errors.js";

export type AnnouncementState =
  | "draft"
  | "validated"
  | "scheduled"
  | "publishing"
  | "published"
  | "partially_published"
  | "failed_retryable"
  | "failed_terminal"
  | "cancelled";

export type AnnouncementAction =
  | "validate"
  | "schedule"
  | "start_publish"
  | "complete_publish"
  | "partial_publish"
  | "fail_retryable"
  | "fail_terminal"
  | "retry"
  | "cancel";

const TRANSITIONS: Record<
  AnnouncementState,
  Partial<Record<AnnouncementAction, AnnouncementState>>
> = {
  draft: {
    validate: "validated",
    cancel: "cancelled",
  },
  validated: {
    schedule: "scheduled",
    start_publish: "publishing",
    cancel: "cancelled",
  },
  scheduled: {
    start_publish: "publishing",
    cancel: "cancelled",
  },
  publishing: {
    complete_publish: "published",
    partial_publish: "partially_published",
    fail_retryable: "failed_retryable",
    fail_terminal: "failed_terminal",
  },
  failed_retryable: {
    retry: "publishing",
    cancel: "cancelled",
  },
  failed_terminal: {},
  published: {},
  partially_published: {},
  cancelled: {},
};

export function transitionAnnouncement(
  currentState: AnnouncementState,
  action: AnnouncementAction,
): AnnouncementState {
  const allowed = TRANSITIONS[currentState]?.[action];
  if (!allowed) {
    throw new InvalidStateTransitionError("Announcement", currentState, action);
  }
  return allowed;
}

export function canTransitionAnnouncement(
  currentState: AnnouncementState,
  action: AnnouncementAction,
): boolean {
  return !!TRANSITIONS[currentState]?.[action];
}
