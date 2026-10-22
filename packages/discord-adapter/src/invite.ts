import {
  DiscordPermissions,
  CAPABILITY_PERMISSION_MANIFEST,
  type DiscordPermissionName,
} from "@nexus/authorization";
import type { InviteUrlOptions } from "./types.js";

/**
 * Calculates the combined granular bitset required for all standard platform capabilities
 */
export function calculateGranularBitfield(): bigint {
  let bitfield = 0n;

  for (const requirement of Object.values(CAPABILITY_PERMISSION_MANIFEST)) {
    for (const permName of requirement.requiredPermissions) {
      const bit = DiscordPermissions[permName as DiscordPermissionName];
      if (bit) {
        bitfield |= bit;
      }
    }
  }

  return bitfield;
}

/**
 * Generates an official Discord OAuth2 bot invitation URL.
 *
 * Supports:
 * - Administrator Mode (`mode === "administrator"`): Requests 0x8 permission for full automated server management.
 * - Restricted Granular Mode (`mode === "granular"`): Requests only the minimal required bitset for enabled capabilities.
 */
export function generateInviteUrl(options: InviteUrlOptions): {
  url: string;
  permissionsBitfield: bigint;
  permissionsString: string;
  mode: "administrator" | "granular";
} {
  const {
    clientId,
    mode = "administrator",
    guildId,
    redirectUri,
    scopes = ["bot", "applications.commands"],
  } = options;

  let permissionsBitfield: bigint;

  if (mode === "administrator") {
    permissionsBitfield = DiscordPermissions.ADMINISTRATOR; // 0x8
  } else {
    permissionsBitfield = calculateGranularBitfield();
  }

  const queryParams = new URLSearchParams({
    client_id: clientId,
    scope: scopes.join(" "),
    permissions: permissionsBitfield.toString(),
  });

  if (guildId) {
    queryParams.set("guild_id", guildId);
  }

  if (redirectUri) {
    queryParams.set("redirect_uri", redirectUri);
    queryParams.set("response_type", "code");
  }

  const url = `https://discord.com/oauth2/authorize?${queryParams.toString()}`;

  return {
    url,
    permissionsBitfield,
    permissionsString: permissionsBitfield.toString(),
    mode,
  };
}
