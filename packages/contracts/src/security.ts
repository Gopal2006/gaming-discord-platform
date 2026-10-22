import { z } from "zod";
import { SnowflakeSchema } from "./identifiers.js";

export const ActionRiskLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);
export type ActionRiskLevel = z.infer<typeof ActionRiskLevelSchema>;

export const ConfirmationTokenPayloadSchema = z.object({
  token: z.string().min(16),
  guildId: SnowflakeSchema,
  actorId: SnowflakeSchema,
  operationType: z.string().min(1),
  targetFingerprint: z.string().min(1),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type ConfirmationTokenPayload = z.infer<
  typeof ConfirmationTokenPayloadSchema
>;

export const EmergencyStatusSchema = z.object({
  isEmergencyStopped: z.boolean(),
  stoppedAt: z.string().datetime().nullable().optional(),
  stoppedByActorId: SnowflakeSchema.nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
});
export type EmergencyStatus = z.infer<typeof EmergencyStatusSchema>;

export const TargetHierarchySchema = z.object({
  targetType: z.enum([
    "user",
    "role",
    "channel",
    "guild",
    "tournament",
    "ticket",
  ]),
  targetId: SnowflakeSchema,
  targetRolePosition: z.number().int().nonnegative().optional(),
  isGuildOwner: z.boolean().optional(),
  isBotSelf: z.boolean().optional(),
});
export type TargetHierarchy = z.infer<typeof TargetHierarchySchema>;

export const ActionOperationSchema = z.object({
  type: z.string().min(1),
  riskLevel: ActionRiskLevelSchema,
  isDestructive: z.boolean().default(false),
  bulkCount: z.number().int().nonnegative().optional(),
  target: TargetHierarchySchema.optional(),
  mentions: z
    .object({
      everyone: z.boolean().default(false),
      here: z.boolean().default(false),
      roles: z.array(SnowflakeSchema).optional().default([]),
    })
    .optional(),
});
export type ActionOperation = z.infer<typeof ActionOperationSchema>;
