import type {
  GuildCapabilityType,
  ActionOperation,
  ConfirmationTokenPayload,
  EmergencyStatus,
} from "@nexus/contracts";
import type { ActorContext, PermissionGrant } from "./types.js";
import type { DiscordPermissionName } from "./manifest.js";

export interface BotPermissionsContext {
  readonly rawBitfield?: bigint | string | number | null;
  readonly botRolePosition?: number;
}

export interface GuildStateContext {
  readonly isEmergencyStopped?: boolean;
  readonly emergencyStopReason?: string | null;
  readonly featuresEnabled?: Record<string, boolean>;
}

export interface GlobalStateContext {
  readonly isEmergencyStopped?: boolean;
  readonly emergencyStopReason?: string | null;
}

export interface ActionPolicyRequest {
  readonly actor: ActorContext;
  readonly targetGuildId: string;
  readonly capability: GuildCapabilityType;
  readonly operation: ActionOperation;
  readonly grants: readonly PermissionGrant[];
  readonly botPermissions?: BotPermissionsContext;
  readonly guildState?: GuildStateContext;
  readonly globalState?: GlobalStateContext;
  readonly confirmationToken?: ConfirmationTokenPayload;
  readonly now?: Date;
  readonly safetyLimits?: {
    readonly maxBulkPurge?: number;
  };
}

export type ActionPolicyReasonCode =
  | "ALLOWED"
  | "DENIED_GLOBAL_EMERGENCY_STOP"
  | "DENIED_GUILD_EMERGENCY_STOP"
  | "DENIED_UNAUTHORIZED"
  | "DENIED_ROLE_HIERARCHY"
  | "DENIED_MISSING_DISCORD_PERMISSIONS"
  | "DENIED_BULK_LIMIT_EXCEEDED"
  | "DENIED_MASS_MENTION_UNAUTHORIZED"
  | "DENIED_CONFIRMATION_REQUIRED"
  | "DENIED_CONFIRMATION_INVALID"
  | "DENIED_FAIL_CLOSED";

export interface ActionImpactPreview {
  readonly operationType: string;
  readonly targetCount: number;
  readonly description: string;
  readonly isDestructive: boolean;
  readonly requiresConfirmation: boolean;
}

export interface ActionPolicyDecision {
  readonly allowed: boolean;
  readonly reasonCode: ActionPolicyReasonCode;
  readonly message?: string;
  readonly details?: Record<string, unknown>;
  readonly missingDiscordPermissions?: DiscordPermissionName[];
  readonly hasAdminBit?: boolean;
  readonly impactPreview?: ActionImpactPreview;
}
