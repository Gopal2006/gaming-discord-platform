export interface TenantContext {
  readonly guildId: string;
}

export class TenantIsolationViolationError extends Error {
  constructor(
    public readonly tenantGuildId: string,
    public readonly accessedResourceGuildId: string | null | undefined,
  ) {
    super(
      `Cross-tenant access violation: tenant '${tenantGuildId}' cannot access resource owned by '${accessedResourceGuildId}'`,
    );
    this.name = "TenantIsolationViolationError";
  }
}

/**
 * Asserts that a target resource belongs to the current tenant context.
 * Throws TenantIsolationViolationError if tenant boundaries are violated.
 */
export function assertTenantBoundary(
  tenant: TenantContext,
  resourceGuildId: string | null | undefined,
): void {
  if (!resourceGuildId || resourceGuildId !== tenant.guildId) {
    throw new TenantIsolationViolationError(tenant.guildId, resourceGuildId);
  }
}
