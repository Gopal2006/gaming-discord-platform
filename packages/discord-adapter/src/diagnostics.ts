import {
  hasAdministrator,
  checkCapabilityPermissions,
  CAPABILITY_PERMISSION_MANIFEST,
  type DiscordPermissionName,
} from "@nexus/authorization";
import type { GuildCapabilityType } from "@nexus/contracts";

export interface CapabilityDiagnostic {
  capability: GuildCapabilityType;
  satisfies: boolean;
  missingPermissions: DiscordPermissionName[];
  riskLevel: "low" | "medium" | "high" | "critical";
  description: string;
}

export interface GuildDiagnosticsReport {
  hasAdministrator: boolean;
  installationMode: "administrator" | "granular";
  botRolePosition: number;
  totalCapabilities: number;
  satisfiedCount: number;
  missingCount: number;
  isFullyOperational: boolean;
  capabilities: CapabilityDiagnostic[];
  missingPermissionsSet: DiscordPermissionName[];
  summary: string;
}

/**
 * Runs a thorough diagnostics inspection on a guild's bot permissions and hierarchy.
 */
export function runGuildDiagnostics(
  rawBitfield: bigint | string | number | undefined | null,
  botRolePosition = 0,
): GuildDiagnosticsReport {
  const isAdmin = hasAdministrator(rawBitfield);
  const capabilities: CapabilityDiagnostic[] = [];
  const missingPermsSet = new Set<DiscordPermissionName>();

  for (const [capKey, req] of Object.entries(CAPABILITY_PERMISSION_MANIFEST)) {
    const capability = capKey as GuildCapabilityType;
    const check = checkCapabilityPermissions(rawBitfield, capability);

    if (!check.satisfies) {
      for (const p of check.missingPermissions) {
        missingPermsSet.add(p);
      }
    }

    capabilities.push({
      capability,
      satisfies: check.satisfies,
      missingPermissions: check.missingPermissions,
      riskLevel: req.riskLevel,
      description: req.description,
    });
  }

  const satisfiedCount = capabilities.filter((c) => c.satisfies).length;
  const missingCount = capabilities.length - satisfiedCount;
  const isFullyOperational = missingCount === 0;

  let summary: string;
  if (isAdmin) {
    summary =
      "Nexus is installed with Administrator permissions (0x8). All capability transport requirements are satisfied. Internal action-safety boundaries govern execution.";
  } else if (isFullyOperational) {
    summary =
      "Nexus is installed in Restricted Granular Mode with 100% of required Discord permissions satisfied.";
  } else {
    summary = `Nexus is running with degraded capabilities in Restricted Granular Mode. Missing ${missingPermsSet.size} Discord permission(s) across ${missingCount} capability/capabilities.`;
  }

  return {
    hasAdministrator: isAdmin,
    installationMode: isAdmin ? "administrator" : "granular",
    botRolePosition,
    totalCapabilities: capabilities.length,
    satisfiedCount,
    missingCount,
    isFullyOperational,
    capabilities,
    missingPermissionsSet: Array.from(missingPermsSet),
    summary,
  };
}
