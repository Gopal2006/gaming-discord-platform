import type { Realm } from "@nexus/contracts";

export interface ActorContext {
  readonly actorId: string;
  readonly actorType: "user" | "system" | "bot" | "platform_operator";
  readonly realm: Realm;
  readonly guildId?: string | null;
  readonly roleIds?: string[];
  readonly isGuildOwner?: boolean;
}

export interface ResourceScope {
  readonly resourceType: string;
  readonly resourceId: string;
}

export interface AuthorizationRequest {
  readonly actor: ActorContext;
  readonly capability: string;
  readonly targetRealm: Realm;
  readonly targetGuildId?: string | null;
  readonly resourceScope?: ResourceScope | null;
  readonly now?: Date;
}

export interface PermissionGrant {
  readonly id: string;
  readonly principalType: "user" | "role" | "platform_operator" | "guild_owner";
  readonly principalId: string;
  readonly realm: Realm;
  readonly guildId?: string | null;
  readonly capability: string;
  readonly resourceScope?: ResourceScope | null;
  readonly effect: "allow" | "deny";
  readonly expiresAt?: string | Date | null;
}

export type AuthorizationReasonCode =
  | "ALLOWED"
  | "ALLOWED_GUILD_OWNER"
  | "DENIED_BY_DEFAULT"
  | "DENIED_EXPLICIT"
  | "DENIED_REALM_MISMATCH"
  | "DENIED_TENANT_MISMATCH"
  | "DENIED_GRANT_EXPIRED"
  | "DENIED_SCOPE_MISMATCH";

export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly reasonCode: AuthorizationReasonCode;
  readonly matchedGrantId?: string;
}
