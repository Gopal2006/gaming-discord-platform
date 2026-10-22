import { z } from "zod";

export const GuildCapability = {
  // Guild Management
  GuildSettingsView: "guild.settings.view",
  GuildSettingsEdit: "guild.settings.edit",
  GuildModulesManage: "guild.modules.manage",
  GuildDiagnosticsView: "guild.diagnostics.view",
  GuildAuditView: "guild.audit.view",

  // Announcements
  AnnouncementCreate: "announcement.create",
  AnnouncementPreview: "announcement.preview",
  AnnouncementPublish: "announcement.publish",
  AnnouncementSchedule: "announcement.schedule",
  AnnouncementCancel: "announcement.cancel",

  // Moderation
  ModerationCaseView: "moderation.case.view",
  ModerationCaseCreate: "moderation.case.create",
  ModerationWarn: "moderation.warn",
  ModerationTimeout: "moderation.timeout",
  ModerationKick: "moderation.kick",
  ModerationBan: "moderation.ban",
  ModerationUnban: "moderation.unban",
  ModerationPurge: "moderation.purge",
  ModerationLock: "moderation.lock",

  // Tickets
  TicketCreate: "ticket.create",
  TicketView: "ticket.view",
  TicketAssign: "ticket.assign",
  TicketClose: "ticket.close",
  TicketArchive: "ticket.archive",

  // Polls & Giveaways
  PollCreate: "poll.create",
  PollVote: "poll.vote",
  PollClose: "poll.close",
  GiveawayCreate: "giveaway.create",
  GiveawayEnter: "giveaway.enter",
  GiveawayEnd: "giveaway.end",
  GiveawayReroll: "giveaway.reroll",

  // Gaming & Esports
  GameProfileView: "game_profile.view",
  GameProfileEdit: "game_profile.edit",
  RegistrationSubmit: "registration.submit",
  RegistrationReview: "registration.review",
  RegistrationCheckin: "registration.checkin",
  RegistrationExport: "registration.export",
  TournamentCreate: "tournament.create",
  TournamentManage: "tournament.manage",
  TournamentPublish: "tournament.publish",
  MatchView: "match.view",
  MatchReport: "match.report",
  MatchResultApprove: "match.result.approve",
  MatchDisputeResolve: "match.dispute.resolve",
  TeamCreate: "team.create",
  TeamManage: "team.manage",
  TeamRosterEdit: "team.roster.edit",
} as const;

export type GuildCapabilityType =
  (typeof GuildCapability)[keyof typeof GuildCapability];

export const PlatformCapability = {
  HealthView: "platform.health.view",
  OperatorsManage: "platform.operators.manage",
  FeaturesManage: "platform.features.manage",
  IncidentsManage: "platform.incidents.manage",
  SupportGrant: "platform.support.grant",
  GlobalTemplatesManage: "platform.templates.manage",
} as const;

export type PlatformCapabilityType =
  (typeof PlatformCapability)[keyof typeof PlatformCapability];

export const CapabilitySchema = z.string().min(3).max(128);
export const RealmSchema = z.enum(["guild", "platform"]);
export type Realm = z.infer<typeof RealmSchema>;
