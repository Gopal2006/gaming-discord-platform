import { describe, it, expect } from "vitest";
import {
  transitionAnnouncement,
  canTransitionAnnouncement,
  transitionTicket,
  transitionModerationCase,
  transitionRegistration,
  transitionTournament,
  transitionMatch,
  InvalidStateTransitionError,
  validateRegistrationCapacity,
  validateMatchScore,
  sanitizeMentions,
  InvariantViolationError,
} from "../src/index.js";

describe("Domain - Announcement State Machine", () => {
  it("follows the happy path: draft -> validated -> scheduled -> publishing -> published", () => {
    let state = transitionAnnouncement("draft", "validate");
    expect(state).toBe("validated");

    state = transitionAnnouncement(state, "schedule");
    expect(state).toBe("scheduled");

    state = transitionAnnouncement(state, "start_publish");
    expect(state).toBe("publishing");

    state = transitionAnnouncement(state, "complete_publish");
    expect(state).toBe("published");
  });

  it("rejects invalid transitions and throws InvalidStateTransitionError", () => {
    expect(() => transitionAnnouncement("draft", "complete_publish")).toThrow(
      InvalidStateTransitionError,
    );
    expect(canTransitionAnnouncement("published", "retry")).toBe(false);
  });

  it("supports retry on failed_retryable", () => {
    const state = transitionAnnouncement("failed_retryable", "retry");
    expect(state).toBe("publishing");
  });
});

describe("Domain - Ticket State Machine", () => {
  it("follows lifecycle: open -> claimed -> in_progress -> resolved -> archived", () => {
    let state = transitionTicket("open", "claim");
    expect(state).toBe("claimed");

    state = transitionTicket(state, "start_work");
    expect(state).toBe("in_progress");

    state = transitionTicket(state, "resolve");
    expect(state).toBe("resolved");

    state = transitionTicket(state, "archive");
    expect(state).toBe("archived");
  });

  it("allows reopening resolved ticket", () => {
    const state = transitionTicket("resolved", "reopen");
    expect(state).toBe("reopened");
  });

  it("prohibits direct archive from open", () => {
    expect(() => transitionTicket("open", "archive")).toThrow(
      InvalidStateTransitionError,
    );
  });
});

describe("Domain - Moderation State Machine", () => {
  it("follows execution: requested -> authorized -> executing -> applied -> notified", () => {
    let state = transitionModerationCase("requested", "authorize");
    expect(state).toBe("authorized");

    state = transitionModerationCase(state, "start_execution");
    expect(state).toBe("executing");

    state = transitionModerationCase(state, "apply_success");
    expect(state).toBe("applied");

    state = transitionModerationCase(state, "notify_success");
    expect(state).toBe("notified");
  });

  it("tracks execution failure separately", () => {
    const state = transitionModerationCase("executing", "apply_failure");
    expect(state).toBe("execution_failed");
  });
});

describe("Domain - Registration State Machine", () => {
  it("progresses: draft -> submitted -> pending_review -> accepted -> checked_in -> eligible", () => {
    let state = transitionRegistration("draft", "submit");
    expect(state).toBe("submitted");

    state = transitionRegistration(state, "send_to_review");
    expect(state).toBe("pending_review");

    state = transitionRegistration(state, "accept");
    expect(state).toBe("accepted");

    state = transitionRegistration(state, "check_in");
    expect(state).toBe("checked_in");

    state = transitionRegistration(state, "confirm_eligibility");
    expect(state).toBe("eligible");
  });

  it("allows waitlisting from submitted and later accepting", () => {
    let state = transitionRegistration("submitted", "waitlist");
    expect(state).toBe("waitlisted");

    state = transitionRegistration(state, "accept");
    expect(state).toBe("accepted");
  });
});

describe("Domain - Tournament and Match State Machines", () => {
  it("advances tournament lifecycle correctly", () => {
    let tState = transitionTournament("draft", "open_registration");
    expect(tState).toBe("registration_open");

    tState = transitionTournament(tState, "close_registration");
    expect(tState).toBe("registration_closed");

    tState = transitionTournament(tState, "start_check_in");
    expect(tState).toBe("check_in");

    tState = transitionTournament(tState, "finalize_check_in");
    expect(tState).toBe("ready");

    tState = transitionTournament(tState, "start_tournament");
    expect(tState).toBe("live");
  });

  it("advances match lifecycle and handles disputes", () => {
    let mState = transitionMatch("live", "submit_result");
    expect(mState).toBe("result_pending");

    mState = transitionMatch(mState, "raise_dispute");
    expect(mState).toBe("disputed");

    mState = transitionMatch(mState, "resolve_dispute");
    expect(mState).toBe("confirmed");

    mState = transitionMatch(mState, "finalize");
    expect(mState).toBe("finalized");
  });
});

describe("Domain - Invariants", () => {
  it("enforces registration capacity bounds", () => {
    expect(() =>
      validateRegistrationCapacity({ maxCap: 16, currentAccepted: 16 }),
    ).toThrow(InvariantViolationError);

    expect(() =>
      validateRegistrationCapacity({ maxCap: 16, currentAccepted: 15 }),
    ).not.toThrow();
  });

  it("validates match scores", () => {
    expect(() =>
      validateMatchScore({ participantAScore: -1, participantBScore: 2 }),
    ).toThrow(InvariantViolationError);

    expect(() =>
      validateMatchScore({
        participantAScore: 2,
        participantBScore: 2,
        allowDraw: false,
      }),
    ).toThrow(InvariantViolationError);

    expect(() =>
      validateMatchScore({
        participantAScore: 2,
        participantBScore: 1,
        allowDraw: false,
      }),
    ).not.toThrow();
  });

  it("sanitizes dangerous @everyone / @here mentions", () => {
    const text = "Hello @everyone and @here!";
    const sanitized = sanitizeMentions(text, {
      allowEveryone: false,
      allowHere: false,
      allowRoles: true,
    });
    expect(sanitized).not.toContain("@everyone");
    expect(sanitized).not.toContain("@here");
    expect(sanitized).toContain("@\u200beveryone");
  });
});
