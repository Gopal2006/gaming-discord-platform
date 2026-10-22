import { describe, it, expect } from "vitest";
import {
  SnowflakeSchema,
  ApiErrorEnvelopeSchema,
  DomainEventEnvelopeSchema,
  AuditEventSchema,
  GuildCapability,
} from "../src/index.js";

describe("Contracts - Identifiers", () => {
  it("validates correct Discord snowflakes", () => {
    const validSnowflake = "123456789012345678";
    expect(SnowflakeSchema.safeParse(validSnowflake).success).toBe(true);
  });

  it("rejects invalid snowflakes (too short, letters, negative)", () => {
    expect(SnowflakeSchema.safeParse("12345").success).toBe(false);
    expect(SnowflakeSchema.safeParse("abcdefghijklmnopqr").success).toBe(false);
    expect(SnowflakeSchema.safeParse("-12345678901234567").success).toBe(false);
  });
});

describe("Contracts - Envelopes", () => {
  it("validates standard ApiErrorEnvelope", () => {
    const errorPayload = {
      error: {
        code: "REGISTRATION_CLOSED",
        message: "Registration for this event is closed.",
        requestId: "req_12345",
        details: { eventId: "evt_abc" },
      },
    };
    const result = ApiErrorEnvelopeSchema.safeParse(errorPayload);
    expect(result.success).toBe(true);
  });

  it("validates DomainEventEnvelope", () => {
    const event = {
      eventId: "evt_99999",
      type: "registration.accepted",
      version: 1,
      occurredAt: "2026-10-22T12:00:00.000Z",
      guildId: "123456789012345678",
      aggregate: { type: "registration", id: "reg_1", version: 2 },
      actor: { type: "user", id: "usr_1" },
      correlationId: "req_corr_1",
      data: { eventId: "evt_1" },
    };
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("validates AuditEventSchema", () => {
    const audit = {
      eventId: "aud_12345",
      realm: "guild" as const,
      guildId: "123456789012345678",
      actorId: "usr_mod",
      actorType: "user" as const,
      action: GuildCapability.ModerationBan,
      resourceType: "user",
      resourceId: "987654321098765432",
      outcome: "success" as const,
      reason: "Violated server rules",
      correlationId: "req_ban_1",
      occurredAt: "2026-10-22T12:00:00.000Z",
    };
    const result = AuditEventSchema.safeParse(audit);
    expect(result.success).toBe(true);
  });
});
