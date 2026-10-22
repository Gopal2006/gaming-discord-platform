import { InvariantViolationError } from "./errors.js";

export interface RegistrationCapacityRule {
  maxCap: number;
  currentAccepted: number;
}

export function validateRegistrationCapacity(
  rule: RegistrationCapacityRule,
): void {
  if (rule.maxCap <= 0) {
    throw new InvariantViolationError(
      "Registration capacity must be greater than zero",
      {
        maxCap: rule.maxCap,
      },
    );
  }
  if (rule.currentAccepted >= rule.maxCap) {
    throw new InvariantViolationError(
      "Registration capacity reached; cannot accept more entrants",
      {
        maxCap: rule.maxCap,
        currentAccepted: rule.currentAccepted,
      },
    );
  }
}

export interface TeamRosterRule {
  minPlayers: number;
  maxPlayers: number;
  currentCount: number;
}

export function validateTeamRosterSize(rule: TeamRosterRule): void {
  if (rule.minPlayers < 1) {
    throw new InvariantViolationError(
      "Minimum team size must be at least 1 player",
    );
  }
  if (rule.maxPlayers < rule.minPlayers) {
    throw new InvariantViolationError(
      "Maximum team size cannot be less than minimum team size",
    );
  }
  if (rule.currentCount > rule.maxPlayers) {
    throw new InvariantViolationError(
      "Team exceeds maximum player roster limit",
      {
        max: rule.maxPlayers,
        current: rule.currentCount,
      },
    );
  }
}

export interface MatchScoreSubmission {
  participantAScore: number;
  participantBScore: number;
  allowDraw?: boolean;
}

export function validateMatchScore(submission: MatchScoreSubmission): void {
  if (submission.participantAScore < 0 || submission.participantBScore < 0) {
    throw new InvariantViolationError("Scores cannot be negative", {
      ...submission,
    });
  }
  if (
    !submission.allowDraw &&
    submission.participantAScore === submission.participantBScore &&
    submission.participantAScore > 0
  ) {
    throw new InvariantViolationError(
      "Match cannot end in a draw for this tournament stage",
      { ...submission },
    );
  }
}

export interface MentionPolicy {
  allowEveryone: boolean;
  allowHere: boolean;
  allowRoles: boolean;
}

export function sanitizeMentions(text: string, policy: MentionPolicy): string {
  let sanitized = text;
  if (!policy.allowEveryone) {
    sanitized = sanitized.replace(/@everyone/g, "@\u200beveryone");
  }
  if (!policy.allowHere) {
    sanitized = sanitized.replace(/@here/g, "@\u200bhere");
  }
  return sanitized;
}
