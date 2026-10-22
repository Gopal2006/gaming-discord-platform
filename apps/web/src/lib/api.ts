import { GuildCapability } from "@nexus/contracts";

export interface GuildListItem {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  botInstalled: boolean;
  installationMode: "administrator" | "granular";
  healthStatus: "healthy" | "degraded" | "unconfigured";
  lastActive: string;
}

export interface GuildModule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: "operations" | "esports" | "community";
  requiredCapability: string;
  prerequisites: string[];
}

export interface AuditEventItem {
  id: string;
  action: string;
  actorTag: string;
  actorId: string;
  timestamp: string;
  status: "success" | "failure";
  details: Record<string, unknown>;
}

export interface GuildOverviewData {
  guild: GuildListItem;
  emergencyActive: boolean;
  stats: {
    activeEvents: number;
    openDisputes: number;
    modCases24h: number;
    auditEventsTotal: number;
  };
  modules: GuildModule[];
  recentActivity: AuditEventItem[];
}

export interface GuildSetupChecklist {
  botConnected: boolean;
  gatewayLatencyMs: number;
  installationMode: "administrator" | "granular";
  roleHierarchyOk: boolean;
  botRolePosition: number;
  targetRolePosition: number;
  channels: {
    auditLog: { id: string | null; name: string; exists: boolean };
    announcements: { id: string | null; name: string; exists: boolean };
    modLog: { id: string | null; name: string; exists: boolean };
  };
}

export interface GuildRoleCapability {
  roleId: string;
  roleName: string;
  roleColor: string;
  isDiscordAdmin: boolean;
  capabilities: string[];
}

// Realistic fixtures for operational dashboard
export const MOCK_GUILDS: GuildListItem[] = [
  {
    id: "123456789012345678",
    name: "Apex Legends Pro League",
    icon: "⚡",
    memberCount: 4250,
    botInstalled: true,
    installationMode: "administrator",
    healthStatus: "healthy",
    lastActive: "Just now",
  },
  {
    id: "234567890123456789",
    name: "Valorant Champions Community",
    icon: "🎯",
    memberCount: 1820,
    botInstalled: true,
    installationMode: "granular",
    healthStatus: "healthy",
    lastActive: "5m ago",
  },
  {
    id: "345678901234567890",
    name: "Overwatch Scrim Hub",
    icon: "🛡️",
    memberCount: 950,
    botInstalled: true,
    installationMode: "granular",
    healthStatus: "degraded",
    lastActive: "2h ago",
  },
];

export const MOCK_MODULES: GuildModule[] = [
  {
    id: "tournaments",
    name: "Tournament & Bracket Engine",
    description:
      "Automated brackets (Single/Double Elimination, Swiss), check-in lifecycle, and match disputes.",
    enabled: true,
    category: "esports",
    requiredCapability: GuildCapability.TournamentManage,
    prerequisites: ["Manage Channels", "Send Messages"],
  },
  {
    id: "scrims",
    name: "Scrims & Ranked Matchmaking",
    description:
      "Auto-queue lobbies, captain draft pick, and automated team voice channel provisioning.",
    enabled: true,
    category: "esports",
    requiredCapability: GuildCapability.MatchReport,
    prerequisites: ["Manage Channels", "Move Members"],
  },
  {
    id: "moderation",
    name: "Moderation & Safety Shield",
    description:
      "Bounded action-safety enforcement, safe purges, timeout escalation, and audit logging.",
    enabled: true,
    category: "operations",
    requiredCapability: GuildCapability.ModerationCaseCreate,
    prerequisites: ["Moderate Members", "Manage Messages"],
  },
  {
    id: "announcements",
    name: "Broadcast Announcements",
    description:
      "Rich Discord embed designer, high-reach broadcast confirmation, and multi-channel publishing.",
    enabled: true,
    category: "community",
    requiredCapability: GuildCapability.AnnouncementPublish,
    prerequisites: ["Send Messages", "Embed Links"],
  },
  {
    id: "tickets",
    name: "Support & Referee Tickets",
    description:
      "Private match dispute channels, referee assignment queues, and HTML/text transcript exports.",
    enabled: false,
    category: "operations",
    requiredCapability: GuildCapability.TicketCreate,
    prerequisites: ["Manage Channels", "Manage Roles"],
  },
];

export const MOCK_AUDIT_LOGS: AuditEventItem[] = [
  {
    id: "aud_01",
    action: "tournament.match.approved",
    actorTag: "RefereeZero#0001",
    actorId: "usr_ref_1",
    timestamp: "2026-10-22T21:40:00Z",
    status: "success",
    details: { matchId: "m_finals_01", winner: "Team Liquid", score: "2-1" },
  },
  {
    id: "aud_02",
    action: "guild.setup.repaired",
    actorTag: "ServerOwner#1337",
    actorId: "usr_owner_1",
    timestamp: "2026-10-22T20:15:00Z",
    status: "success",
    details: { restoredChannels: ["#announcements"] },
  },
  {
    id: "aud_03",
    action: "announcement.published",
    actorTag: "CommunityLead#4242",
    actorId: "usr_staff_2",
    timestamp: "2026-10-22T19:00:00Z",
    status: "success",
    details: { channel: "#announcements", targetCount: 4250 },
  },
  {
    id: "aud_04",
    action: "moderation.purge.rejected",
    actorTag: "ModTrainee#9999",
    actorId: "usr_mod_3",
    timestamp: "2026-10-22T18:30:00Z",
    status: "failure",
    details: {
      reason: "SAFETY_LIMIT_EXCEEDED",
      requestedCount: 250,
      maxAllowed: 100,
    },
  },
  {
    id: "aud_05",
    action: "auth.role_capability.granted",
    actorTag: "ServerOwner#1337",
    actorId: "usr_owner_1",
    timestamp: "2026-10-22T17:10:00Z",
    status: "success",
    details: {
      targetRole: "Head Referee",
      capability: "match.dispute.resolve",
    },
  },
];

export const MOCK_ROLES: GuildRoleCapability[] = [
  {
    roleId: "role_admin",
    roleName: "Tournament Director",
    roleColor: "#f59e0b",
    isDiscordAdmin: true,
    capabilities: [
      GuildCapability.GuildSettingsEdit,
      GuildCapability.GuildModulesManage,
      GuildCapability.TournamentManage,
      GuildCapability.MatchDisputeResolve,
      GuildCapability.AnnouncementPublish,
      GuildCapability.GuildAuditView,
    ],
  },
  {
    roleId: "role_referee",
    roleName: "Senior Referee",
    roleColor: "#38bdf8",
    isDiscordAdmin: false,
    capabilities: [
      GuildCapability.MatchView,
      GuildCapability.MatchReport,
      GuildCapability.MatchResultApprove,
      GuildCapability.MatchDisputeResolve,
      GuildCapability.TicketView,
    ],
  },
  {
    roleId: "role_moderator",
    roleName: "Safety Moderator",
    roleColor: "#10b981",
    isDiscordAdmin: false,
    capabilities: [
      GuildCapability.ModerationCaseCreate,
      GuildCapability.ModerationWarn,
      GuildCapability.ModerationTimeout,
      GuildCapability.ModerationPurge,
      GuildCapability.GuildAuditView,
    ],
  },
  {
    roleId: "role_captain",
    roleName: "Team Captain",
    roleColor: "#a855f7",
    isDiscordAdmin: false,
    capabilities: [
      GuildCapability.RegistrationSubmit,
      GuildCapability.RegistrationCheckin,
      GuildCapability.MatchReport,
    ],
  },
];

export function getGuildOverview(guildId: string): GuildOverviewData | null {
  const guild = MOCK_GUILDS.find((g) => g.id === guildId) || MOCK_GUILDS[0];
  if (!guild) return null;

  return {
    guild,
    emergencyActive: false,
    stats: {
      activeEvents: 3,
      openDisputes: 1,
      modCases24h: 12,
      auditEventsTotal: 1420,
    },
    modules: MOCK_MODULES,
    recentActivity: MOCK_AUDIT_LOGS,
  };
}

export function getGuildSetup(guildId: string): GuildSetupChecklist {
  const isApex = guildId === "123456789012345678";
  return {
    botConnected: true,
    gatewayLatencyMs: 38,
    installationMode: isApex ? "administrator" : "granular",
    roleHierarchyOk: true,
    botRolePosition: 15,
    targetRolePosition: 10,
    channels: {
      auditLog: { id: "c_audit_01", name: "nexus-audit-log", exists: true },
      announcements: {
        id: "c_ann_01",
        name: "nexus-announcements",
        exists: true,
      },
      modLog: { id: "c_mod_01", name: "nexus-mod-log", exists: isApex },
    },
  };
}
