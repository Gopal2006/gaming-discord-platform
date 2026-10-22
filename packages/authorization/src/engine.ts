import type {
  AuthorizationRequest,
  AuthorizationDecision,
  PermissionGrant,
  ResourceScope,
} from "./types.js";

function matchesScope(
  grantScope?: ResourceScope | null,
  targetScope?: ResourceScope | null,
): boolean {
  if (!grantScope) {
    // Unconstrained grant applies to all resources within capability
    return true;
  }
  if (!targetScope) {
    // Grant is constrained to a specific resource, but target is general
    return false;
  }
  return (
    grantScope.resourceType === targetScope.resourceType &&
    grantScope.resourceId === targetScope.resourceId
  );
}

function isGrantExpired(grant: PermissionGrant, now: Date): boolean {
  if (!grant.expiresAt) return false;
  const expiry =
    typeof grant.expiresAt === "string"
      ? new Date(grant.expiresAt)
      : grant.expiresAt;
  return expiry.getTime() <= now.getTime();
}

export function evaluateAuthorization(
  request: AuthorizationRequest,
  grants: readonly PermissionGrant[],
): AuthorizationDecision {
  const now = request.now ?? new Date();
  const { actor, capability, targetRealm, targetGuildId, resourceScope } =
    request;

  // 1. Guard Realm Boundaries
  if (targetRealm === "platform" && actor.realm !== "platform") {
    return {
      allowed: false,
      reasonCode: "DENIED_REALM_MISMATCH",
    };
  }

  // 2. Guard Tenant Isolation (for Guild Realm)
  if (targetRealm === "guild") {
    if (!targetGuildId) {
      return {
        allowed: false,
        reasonCode: "DENIED_TENANT_MISMATCH",
      };
    }
    // Actor must match target tenant unless platform operator with explicit cross-tenant grant
    if (actor.realm === "guild" && actor.guildId !== targetGuildId) {
      return {
        allowed: false,
        reasonCode: "DENIED_TENANT_MISMATCH",
      };
    }
  }

  // 3. Find all applicable grants for this actor
  const applicableGrants: PermissionGrant[] = [];

  for (const grant of grants) {
    // Realm check
    if (grant.realm !== targetRealm) continue;

    // Tenant check (for guild realm)
    if (
      targetRealm === "guild" &&
      grant.guildId &&
      grant.guildId !== targetGuildId
    )
      continue;

    // Principal check
    let principalMatches = false;
    if (grant.principalType === "user" && grant.principalId === actor.actorId) {
      principalMatches = true;
    } else if (
      grant.principalType === "role" &&
      actor.roleIds &&
      actor.roleIds.includes(grant.principalId)
    ) {
      principalMatches = true;
    } else if (
      grant.principalType === "platform_operator" &&
      actor.realm === "platform" &&
      grant.principalId === actor.actorId
    ) {
      principalMatches = true;
    } else if (grant.principalType === "guild_owner" && actor.isGuildOwner) {
      principalMatches = true;
    }

    if (!principalMatches) continue;

    // Capability check (exact match or wildcard prefix e.g. "guild.*")
    const capabilityMatches =
      grant.capability === capability ||
      grant.capability === "*" ||
      (grant.capability.endsWith(".*") &&
        capability.startsWith(grant.capability.slice(0, -2)));

    if (!capabilityMatches) continue;

    // Resource scope check
    if (!matchesScope(grant.resourceScope, resourceScope)) continue;

    // Expiration check
    if (isGrantExpired(grant, now)) {
      continue;
    }

    applicableGrants.push(grant);
  }

  // 4. Rule: Explicit Deny ALWAYS takes precedence
  const explicitDeny = applicableGrants.find((g) => g.effect === "deny");
  if (explicitDeny) {
    return {
      allowed: false,
      reasonCode: "DENIED_EXPLICIT",
      matchedGrantId: explicitDeny.id,
    };
  }

  // 5. Rule: Explicit Allow
  const explicitAllow = applicableGrants.find((g) => g.effect === "allow");
  if (explicitAllow) {
    return {
      allowed: true,
      reasonCode: "ALLOWED",
      matchedGrantId: explicitAllow.id,
    };
  }

  // 6. Guild owner default authority for guild-scoped actions (unless explicit deny exists)
  if (
    targetRealm === "guild" &&
    actor.isGuildOwner &&
    actor.guildId === targetGuildId
  ) {
    return {
      allowed: true,
      reasonCode: "ALLOWED_GUILD_OWNER",
    };
  }

  // 7. Fail closed: Deny by default
  return {
    allowed: false,
    reasonCode: "DENIED_BY_DEFAULT",
  };
}
