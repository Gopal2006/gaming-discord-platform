import { GuildCapability, type GuildCapabilityType } from "@nexus/contracts";

/**
 * Official Discord Permission Flags (as per Discord Developer Documentation API v10)
 */
export const DiscordPermissions = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  MANAGE_ROLES: 1n << 28n,
  MODERATE_MEMBERS: 1n << 40n,
} as const;

export type DiscordPermissionName = keyof typeof DiscordPermissions;

export interface CapabilityPermissionRequirement {
  capability: GuildCapabilityType;
  requiredPermissions: readonly DiscordPermissionName[];
  isDestructive: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  description: string;
}

/**
 * Verified Feature-to-Permission Manifest
 * Defines the exact Discord permissions needed for each platform capability.
 */
export const CAPABILITY_PERMISSION_MANIFEST: Record<
  GuildCapabilityType,
  CapabilityPermissionRequirement
> = {
  // Guild Management
  [GuildCapability.GuildSettingsView]: {
    capability: GuildCapability.GuildSettingsView,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Inspect server configuration and status",
  },
  [GuildCapability.GuildSettingsEdit]: {
    capability: GuildCapability.GuildSettingsEdit,
    requiredPermissions: ["MANAGE_GUILD"],
    isDestructive: false,
    riskLevel: "medium",
    description: "Modify server configuration and module toggles",
  },
  [GuildCapability.GuildModulesManage]: {
    capability: GuildCapability.GuildModulesManage,
    requiredPermissions: ["MANAGE_GUILD"],
    isDestructive: false,
    riskLevel: "medium",
    description: "Enable or disable platform feature modules",
  },
  [GuildCapability.GuildDiagnosticsView]: {
    capability: GuildCapability.GuildDiagnosticsView,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Check bot permissions and role hierarchy status",
  },
  [GuildCapability.GuildAuditView]: {
    capability: GuildCapability.GuildAuditView,
    requiredPermissions: ["VIEW_AUDIT_LOG"],
    isDestructive: false,
    riskLevel: "low",
    description: "Inspect durable server audit history",
  },

  // Announcements
  [GuildCapability.AnnouncementCreate]: {
    capability: GuildCapability.AnnouncementCreate,
    requiredPermissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    isDestructive: false,
    riskLevel: "low",
    description: "Create draft announcements",
  },
  [GuildCapability.AnnouncementPreview]: {
    capability: GuildCapability.AnnouncementPreview,
    requiredPermissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    isDestructive: false,
    riskLevel: "low",
    description: "Preview announcement formatting and mentions",
  },
  [GuildCapability.AnnouncementPublish]: {
    capability: GuildCapability.AnnouncementPublish,
    requiredPermissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    isDestructive: false,
    riskLevel: "medium",
    description: "Publish announcements to public channels",
  },
  [GuildCapability.AnnouncementSchedule]: {
    capability: GuildCapability.AnnouncementSchedule,
    requiredPermissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    isDestructive: false,
    riskLevel: "low",
    description: "Queue scheduled announcements in PostgreSQL",
  },
  [GuildCapability.AnnouncementCancel]: {
    capability: GuildCapability.AnnouncementCancel,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Cancel pending scheduled announcements",
  },

  // Moderation
  [GuildCapability.ModerationCaseView]: {
    capability: GuildCapability.ModerationCaseView,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "View member moderation history and cases",
  },
  [GuildCapability.ModerationCaseCreate]: {
    capability: GuildCapability.ModerationCaseCreate,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Log note or incident case for a member",
  },
  [GuildCapability.ModerationWarn]: {
    capability: GuildCapability.ModerationWarn,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Issue formal warning to a member",
  },
  [GuildCapability.ModerationTimeout]: {
    capability: GuildCapability.ModerationTimeout,
    requiredPermissions: ["MODERATE_MEMBERS"],
    isDestructive: true,
    riskLevel: "medium",
    description: "Apply temporary timeout / communication disabled to a member",
  },
  [GuildCapability.ModerationKick]: {
    capability: GuildCapability.ModerationKick,
    requiredPermissions: ["KICK_MEMBERS"],
    isDestructive: true,
    riskLevel: "high",
    description: "Kick a member from the Discord guild",
  },
  [GuildCapability.ModerationBan]: {
    capability: GuildCapability.ModerationBan,
    requiredPermissions: ["BAN_MEMBERS"],
    isDestructive: true,
    riskLevel: "critical",
    description: "Ban a member from the Discord guild",
  },
  [GuildCapability.ModerationUnban]: {
    capability: GuildCapability.ModerationUnban,
    requiredPermissions: ["BAN_MEMBERS"],
    isDestructive: false,
    riskLevel: "medium",
    description: "Revoke an existing member ban",
  },
  [GuildCapability.ModerationPurge]: {
    capability: GuildCapability.ModerationPurge,
    requiredPermissions: ["MANAGE_MESSAGES", "READ_MESSAGE_HISTORY"],
    isDestructive: true,
    riskLevel: "high",
    description: "Bulk delete messages in a channel up to safe limit",
  },
  [GuildCapability.ModerationLock]: {
    capability: GuildCapability.ModerationLock,
    requiredPermissions: ["MANAGE_CHANNELS", "MANAGE_ROLES"],
    isDestructive: true,
    riskLevel: "high",
    description: "Lock or unlock a channel to prevent member messages",
  },

  // Tickets
  [GuildCapability.TicketCreate]: {
    capability: GuildCapability.TicketCreate,
    requiredPermissions: ["MANAGE_CHANNELS", "VIEW_CHANNEL", "SEND_MESSAGES"],
    isDestructive: false,
    riskLevel: "low",
    description: "Open private support ticket channel",
  },
  [GuildCapability.TicketView]: {
    capability: GuildCapability.TicketView,
    requiredPermissions: ["VIEW_CHANNEL", "READ_MESSAGE_HISTORY"],
    isDestructive: false,
    riskLevel: "low",
    description: "View ticket details and conversation",
  },
  [GuildCapability.TicketAssign]: {
    capability: GuildCapability.TicketAssign,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Assign support staff to ticket",
  },
  [GuildCapability.TicketClose]: {
    capability: GuildCapability.TicketClose,
    requiredPermissions: ["MANAGE_CHANNELS"],
    isDestructive: false,
    riskLevel: "medium",
    description: "Close ticket and revoke member channel access",
  },
  [GuildCapability.TicketArchive]: {
    capability: GuildCapability.TicketArchive,
    requiredPermissions: ["MANAGE_CHANNELS"],
    isDestructive: true,
    riskLevel: "medium",
    description:
      "Archive and remove ticket channel after transcript persistence",
  },

  // Polls & Giveaways
  [GuildCapability.PollCreate]: {
    capability: GuildCapability.PollCreate,
    requiredPermissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "ADD_REACTIONS"],
    isDestructive: false,
    riskLevel: "low",
    description: "Create community poll",
  },
  [GuildCapability.PollVote]: {
    capability: GuildCapability.PollVote,
    requiredPermissions: ["VIEW_CHANNEL", "ADD_REACTIONS"],
    isDestructive: false,
    riskLevel: "low",
    description: "Cast vote in community poll",
  },
  [GuildCapability.PollClose]: {
    capability: GuildCapability.PollClose,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Close poll and calculate results",
  },
  [GuildCapability.GiveawayCreate]: {
    capability: GuildCapability.GiveawayCreate,
    requiredPermissions: [
      "VIEW_CHANNEL",
      "SEND_MESSAGES",
      "ADD_REACTIONS",
      "EMBED_LINKS",
    ],
    isDestructive: false,
    riskLevel: "low",
    description: "Start community giveaway",
  },
  [GuildCapability.GiveawayEnter]: {
    capability: GuildCapability.GiveawayEnter,
    requiredPermissions: ["VIEW_CHANNEL", "ADD_REACTIONS"],
    isDestructive: false,
    riskLevel: "low",
    description: "Enter active giveaway",
  },
  [GuildCapability.GiveawayEnd]: {
    capability: GuildCapability.GiveawayEnd,
    requiredPermissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
    isDestructive: false,
    riskLevel: "medium",
    description: "End giveaway and roll winners",
  },
  [GuildCapability.GiveawayReroll]: {
    capability: GuildCapability.GiveawayReroll,
    requiredPermissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
    isDestructive: false,
    riskLevel: "medium",
    description: "Reroll giveaway winners",
  },

  // Gaming & Esports
  [GuildCapability.GameProfileView]: {
    capability: GuildCapability.GameProfileView,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "View player game profile and ranks",
  },
  [GuildCapability.GameProfileEdit]: {
    capability: GuildCapability.GameProfileEdit,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Edit self game profile handles",
  },
  [GuildCapability.RegistrationSubmit]: {
    capability: GuildCapability.RegistrationSubmit,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Register for tournament",
  },
  [GuildCapability.RegistrationReview]: {
    capability: GuildCapability.RegistrationReview,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Review and approve tournament registrations",
  },
  [GuildCapability.RegistrationCheckin]: {
    capability: GuildCapability.RegistrationCheckin,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Check in to tournament before bracket generation",
  },
  [GuildCapability.RegistrationExport]: {
    capability: GuildCapability.RegistrationExport,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "medium",
    description: "Export tournament registration roster",
  },
  [GuildCapability.TournamentCreate]: {
    capability: GuildCapability.TournamentCreate,
    requiredPermissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    isDestructive: false,
    riskLevel: "medium",
    description: "Create tournament tournament bracket and rules",
  },
  [GuildCapability.TournamentManage]: {
    capability: GuildCapability.TournamentManage,
    requiredPermissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    isDestructive: false,
    riskLevel: "medium",
    description: "Manage tournament matches, seeding, and schedule",
  },
  [GuildCapability.TournamentPublish]: {
    capability: GuildCapability.TournamentPublish,
    requiredPermissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    isDestructive: false,
    riskLevel: "medium",
    description: "Publish tournament announcement and public standings",
  },
  [GuildCapability.MatchView]: {
    capability: GuildCapability.MatchView,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "View match details and lobby access",
  },
  [GuildCapability.MatchReport]: {
    capability: GuildCapability.MatchReport,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Submit match game scores",
  },
  [GuildCapability.MatchResultApprove]: {
    capability: GuildCapability.MatchResultApprove,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "medium",
    description: "Referee verification and approval of match scores",
  },
  [GuildCapability.MatchDisputeResolve]: {
    capability: GuildCapability.MatchDisputeResolve,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "medium",
    description: "Resolve match dispute or order match rematch",
  },
  [GuildCapability.TeamCreate]: {
    capability: GuildCapability.TeamCreate,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Create competitive team",
  },
  [GuildCapability.TeamManage]: {
    capability: GuildCapability.TeamManage,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Manage team settings and captains",
  },
  [GuildCapability.TeamRosterEdit]: {
    capability: GuildCapability.TeamRosterEdit,
    requiredPermissions: ["VIEW_CHANNEL"],
    isDestructive: false,
    riskLevel: "low",
    description: "Add or remove team roster members",
  },
};

/**
 * Normalizes any bigint, string, or number bitfield to BigInt safely
 */
export function toBigIntBitfield(
  raw: bigint | string | number | undefined | null,
): bigint {
  if (raw === undefined || raw === null) return 0n;
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number") return BigInt(Math.trunc(raw));
  try {
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

/**
 * Checks if a bitfield has the ADMINISTRATOR permission (0x8)
 */
export function hasAdministrator(
  rawBitfield: bigint | string | number | undefined | null,
): boolean {
  const bitfield = toBigIntBitfield(rawBitfield);
  return (bitfield & DiscordPermissions.ADMINISTRATOR) !== 0n;
}

/**
 * Checks if a bitfield contains a specific permission bit
 */
export function hasDiscordPermission(
  rawBitfield: bigint | string | number | undefined | null,
  permission: DiscordPermissionName,
): boolean {
  const bitfield = toBigIntBitfield(rawBitfield);
  if ((bitfield & DiscordPermissions.ADMINISTRATOR) !== 0n) {
    return true;
  }
  const requiredBit = DiscordPermissions[permission];
  return (bitfield & requiredBit) !== 0n;
}

/**
 * Evaluates whether the bot's permission bitfield satisfies the requirements of a capability.
 * Returns true if the bot has Administrator, or if all required granular permissions are present.
 */
export function checkCapabilityPermissions(
  rawBitfield: bigint | string | number | undefined | null,
  capability: GuildCapabilityType,
): {
  satisfies: boolean;
  hasAdminBit: boolean;
  missingPermissions: DiscordPermissionName[];
} {
  const bitfield = toBigIntBitfield(rawBitfield);
  const hasAdmin = (bitfield & DiscordPermissions.ADMINISTRATOR) !== 0n;

  if (hasAdmin) {
    return {
      satisfies: true,
      hasAdminBit: true,
      missingPermissions: [],
    };
  }

  const requirement = CAPABILITY_PERMISSION_MANIFEST[capability];
  if (!requirement) {
    // If not mapped, fail closed
    return {
      satisfies: false,
      hasAdminBit: false,
      missingPermissions: [],
    };
  }

  const missing: DiscordPermissionName[] = [];
  for (const perm of requirement.requiredPermissions) {
    const bit = DiscordPermissions[perm];
    if ((bitfield & bit) === 0n) {
      missing.push(perm);
    }
  }

  return {
    satisfies: missing.length === 0,
    hasAdminBit: false,
    missingPermissions: missing,
  };
}
