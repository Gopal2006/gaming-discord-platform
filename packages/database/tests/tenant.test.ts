import { describe, it, expect } from "vitest";
import {
  assertTenantBoundary,
  TenantIsolationViolationError,
  type TenantContext,
  guilds,
  moderationCases,
  tickets,
  tournaments,
  permissionGrants,
  outboxEvents,
} from "../src/index.js";
import { getTableName } from "drizzle-orm";

describe("Database - Tenant Boundary Protection", () => {
  const tenant: TenantContext = { guildId: "123456789012345678" };

  it("allows access when tenant ID matches resource guild ID", () => {
    expect(() =>
      assertTenantBoundary(tenant, "123456789012345678"),
    ).not.toThrow();
  });

  it("throws TenantIsolationViolationError when resource guild ID belongs to another tenant", () => {
    expect(() => assertTenantBoundary(tenant, "999999999999999999")).toThrow(
      TenantIsolationViolationError,
    );
  });

  it("throws TenantIsolationViolationError when resource guild ID is null or undefined", () => {
    expect(() => assertTenantBoundary(tenant, null)).toThrow(
      TenantIsolationViolationError,
    );
    expect(() => assertTenantBoundary(tenant, undefined)).toThrow(
      TenantIsolationViolationError,
    );
  });
});

describe("Database - Schema Definitions Integrity", () => {
  it("defines expected table names", () => {
    expect(getTableName(guilds)).toBe("guilds");
    expect(getTableName(moderationCases)).toBe("moderation_cases");
    expect(getTableName(tickets)).toBe("tickets");
    expect(getTableName(tournaments)).toBe("tournaments");
    expect(getTableName(permissionGrants)).toBe("permission_grants");
    expect(getTableName(outboxEvents)).toBe("outbox_events");
  });
});
