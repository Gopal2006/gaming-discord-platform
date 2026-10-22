import { z } from "zod";
import {
  EntityIdSchema,
  GuildIdSchema,
  RequestIdSchema,
} from "./identifiers.js";

/**
 * Standard API error payload adhering to API_AND_EVENTS.md Section 2.
 */
export const ApiErrorPayloadSchema = z.object({
  code: z.string().min(1).max(64),
  message: z.string().min(1),
  requestId: RequestIdSchema,
  details: z.record(z.unknown()).optional(),
});
export type ApiErrorPayload = z.infer<typeof ApiErrorPayloadSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  error: ApiErrorPayloadSchema,
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

/**
 * Standard API success response envelope.
 */
export function createApiSuccessEnvelopeSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
) {
  return z.object({
    data: dataSchema,
    meta: z
      .object({
        requestId: RequestIdSchema,
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().optional(),
        total: z.number().int().nonnegative().optional(),
      })
      .optional(),
  });
}

/**
 * Domain Event Envelope adhering to API_AND_EVENTS.md Section 5.
 */
export const DomainEventEnvelopeSchema = z.object({
  eventId: z.string().startsWith("evt_"),
  type: z.string().min(3).max(128),
  version: z.number().int().positive(),
  occurredAt: z.string().datetime(),
  guildId: GuildIdSchema.nullable(),
  aggregate: z.object({
    type: z.string().min(1).max(64),
    id: EntityIdSchema,
    version: z.number().int().nonnegative(),
  }),
  actor: z.object({
    type: z.enum(["user", "system", "bot", "operator"]),
    id: z.string().min(1).max(64),
  }),
  correlationId: RequestIdSchema,
  data: z.record(z.unknown()),
});
export type DomainEventEnvelope = z.infer<typeof DomainEventEnvelopeSchema>;

/**
 * Audit Event Schema adhering to AUTHORIZATION_SECURITY.md and API_AND_EVENTS.md.
 */
export const AuditEventSchema = z.object({
  eventId: z.string().startsWith("aud_"),
  realm: z.enum(["guild", "platform"]),
  guildId: GuildIdSchema.nullable(),
  actorId: z.string().min(1).max(64),
  actorType: z.enum(["user", "system", "bot", "platform_operator"]),
  action: z.string().min(1).max(128),
  resourceType: z.string().min(1).max(64),
  resourceId: z.string().min(1).max(64),
  outcome: z.enum(["success", "denied", "failed"]),
  reason: z.string().max(1024).nullable().optional(),
  correlationId: RequestIdSchema,
  occurredAt: z.string().datetime(),
  details: z.record(z.unknown()).optional(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

/**
 * Outbox Event Schema for reliable asynchronous publishing.
 */
export const OutboxEventSchema = z.object({
  id: EntityIdSchema,
  eventType: z.string().min(1).max(128),
  eventVersion: z.number().int().positive(),
  guildId: GuildIdSchema.nullable(),
  aggregateType: z.string().min(1).max(64),
  aggregateId: EntityIdSchema,
  payload: z.record(z.unknown()),
  status: z.enum([
    "pending",
    "dispatched",
    "acknowledged",
    "retry_wait",
    "dead_letter",
  ]),
  attempts: z.number().int().nonnegative(),
  availableAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type OutboxEvent = z.infer<typeof OutboxEventSchema>;
