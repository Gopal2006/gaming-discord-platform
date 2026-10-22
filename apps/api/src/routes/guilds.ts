import type { FastifyPluginAsync } from "fastify";
import type { IUnitOfWork } from "@nexus/database";
import type { ISessionStore } from "../auth/session-manager.js";
import { createAuthHooks } from "../middleware/auth.js";
import {
  updateGuildSettingsWorkflow,
  createAnnouncementWorkflow,
  submitRegistrationWorkflow,
  openTicketWorkflow,
  transitionTicketWorkflow,
  manageEmergencyStopWorkflow,
  executeModerationWorkflow,
  createPollWorkflow,
  votePollWorkflow,
  closePollWorkflow,
  createGiveawayWorkflow,
  enterGiveawayWorkflow,
  endGiveawayWorkflow,
  rerollGiveawayWorkflow,
  type IConfirmationService,
  InMemoryConfirmationService,
  type ModerationActionType,
} from "@nexus/application";
import type { ConfirmationTokenPayload } from "@nexus/contracts";

export interface GuildRoutesOptions {
  uow: IUnitOfWork;
  sessionStore: ISessionStore;
  confirmationService?: IConfirmationService;
}

export function createGuildRoutes(
  options: GuildRoutesOptions,
): FastifyPluginAsync {
  const {
    uow,
    sessionStore,
    confirmationService = new InMemoryConfirmationService(),
  } = options;
  const { authenticate, requireGuildTenant } = createAuthHooks(sessionStore);

  return async (app) => {
    // 1. Get Guild Settings
    app.get<{ Params: { guildId: string } }>(
      "/api/v1/guilds/:guildId/settings",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const settings = await uow
          .getRepositories()
          .guildSettings.getSettings(tenant);
        return { settings };
      },
    );

    // 2. Patch Guild Settings
    app.patch<{
      Params: { guildId: string };
      Body: {
        welcomeChannelId?: string | null;
        welcomeMessageTemplate?: string | null;
        logChannelId?: string | null;
        modLogChannelId?: string | null;
      };
    }>(
      "/api/v1/guilds/:guildId/settings",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];

        const updated = await updateGuildSettingsWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          patch: request.body,
        });

        return { settings: updated };
      },
    );

    // 3. List Announcements
    app.get<{ Params: { guildId: string } }>(
      "/api/v1/guilds/:guildId/announcements",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const announcements = await uow
          .getRepositories()
          .announcements.list(tenant);
        return { announcements };
      },
    );

    // 4. Create Announcement
    app.post<{
      Params: { guildId: string };
      Body: {
        id: string;
        channelId: string;
        title: string;
        content: string;
        allowEveryone?: boolean;
        allowHere?: boolean;
      };
    }>(
      "/api/v1/guilds/:guildId/announcements",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request, reply) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];

        const announcement = await createAnnouncementWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          data: request.body,
        });

        reply.status(201);
        return { announcement };
      },
    );

    // 5. Submit Tournament Registration
    app.post<{
      Params: { guildId: string; tournamentId: string };
      Body: {
        id: string;
        entrantId: string;
        entrantType: "user" | "team";
        answersJson?: Record<string, unknown>;
      };
    }>(
      "/api/v1/guilds/:guildId/tournaments/:tournamentId/registrations",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request, reply) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];
        const { tournamentId } = request.params;

        const registration = await submitRegistrationWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          data: {
            ...request.body,
            tournamentId,
          },
        });

        reply.status(201);
        return { registration };
      },
    );

    // 6. Transition Ticket
    app.post<{
      Params: { guildId: string; ticketId: string };
      Body: {
        action:
          | "claim"
          | "start_work"
          | "wait_for_user"
          | "wait_for_staff"
          | "resolve"
          | "archive"
          | "reopen"
          | "cancel";
      };
    }>(
      "/api/v1/guilds/:guildId/tickets/:ticketId/transition",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];
        const { ticketId } = request.params;

        const ticket = await transitionTicketWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          ticketId,
          action: request.body.action,
        });

        return { ticket };
      },
    );

    // 7. Request Confirmation Token for Destructive Action
    app.post<{
      Params: { guildId: string };
      Body: {
        operationType: string;
        targetFingerprint: string;
        ttlSeconds?: number;
      };
    }>(
      "/api/v1/guilds/:guildId/confirmations",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request, reply) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const { operationType, targetFingerprint, ttlSeconds } = request.body;

        const tokenResult = confirmationService.createToken({
          guildId: tenant.guildId,
          actorId: actor.actorId,
          operationType,
          targetFingerprint,
          ttlSeconds,
        });

        reply.status(201);
        return tokenResult;
      },
    );

    // 8. Emergency Stop Trigger / Lift
    app.post<{
      Params: { guildId: string };
      Body: {
        action: "stop" | "lift";
        reason?: string;
        confirmationToken?: ConfirmationTokenPayload;
      };
    }>(
      "/api/v1/guilds/:guildId/emergency-stop",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];
        const { action, reason, confirmationToken } = request.body;

        const settings = await manageEmergencyStopWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          action,
          reason,
          confirmationToken,
        });

        return { settings };
      },
    );

    // 9. Execute Moderation Action (Ban, Kick, Timeout, Purge)
    app.post<{
      Params: { guildId: string };
      Body: {
        action: ModerationActionType;
        targetId: string;
        reason: string;
        isGuildOwner?: boolean;
        isBotSelf?: boolean;
        targetRolePosition?: number;
        bulkCount?: number;
        durationSeconds?: number;
        botPermissions?: {
          rawBitfield?: string;
          botRolePosition?: number;
        };
        confirmationToken?: ConfirmationTokenPayload;
      };
    }>(
      "/api/v1/guilds/:guildId/moderation",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request, reply) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];
        const body = request.body;

        const result = await executeModerationWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          action: body.action,
          target: {
            targetId: body.targetId,
            isGuildOwner: body.isGuildOwner,
            isBotSelf: body.isBotSelf,
            targetRolePosition: body.targetRolePosition,
          },
          reason: body.reason,
          bulkCount: body.bulkCount,
          durationSeconds: body.durationSeconds,
          botPermissions: body.botPermissions,
          confirmationToken: body.confirmationToken,
        });

        reply.status(200);
        return { result };
      },
    );

    // 10. List Moderation Cases
    app.get<{
      Params: { guildId: string };
      Querystring: { targetUserId?: string; limit?: number };
    }>(
      "/api/v1/guilds/:guildId/moderation/cases",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const { targetUserId, limit } = request.query;
        const repos = uow.getRepositories();
        const cases = targetUserId
          ? await repos.moderationCases.listByTarget(tenant, targetUserId)
          : await repos.moderationCases.list(tenant, limit);
        return { cases };
      },
    );

    // 11. List Tickets
    app.get<{
      Params: { guildId: string };
    }>(
      "/api/v1/guilds/:guildId/tickets",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const tickets = await uow.getRepositories().tickets.list(tenant);
        return { tickets };
      },
    );

    // 12. Open Ticket
    app.post<{
      Params: { guildId: string };
      Body: {
        category?: string;
        channelId?: string;
      };
    }>(
      "/api/v1/guilds/:guildId/tickets",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request, reply) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];

        const ticket = await openTicketWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          category: request.body.category,
          channelId: request.body.channelId,
        });

        reply.status(201);
        return { ticket };
      },
    );

    // 13. List Polls
    app.get<{
      Params: { guildId: string };
    }>(
      "/api/v1/guilds/:guildId/polls",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const polls = await uow.getRepositories().polls.list(tenant);
        return { polls };
      },
    );

    // 14. Create Poll
    app.post<{
      Params: { guildId: string };
      Body: {
        question: string;
        options: string[];
        channelId: string;
        durationMinutes?: number;
      };
    }>(
      "/api/v1/guilds/:guildId/polls",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request, reply) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];

        const poll = await createPollWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          question: request.body.question,
          options: request.body.options,
          channelId: request.body.channelId,
          durationMinutes: request.body.durationMinutes ?? 1440,
        });

        reply.status(201);
        return { poll };
      },
    );

    // 15. Vote on Poll
    app.post<{
      Params: { guildId: string; pollId: string };
      Body: {
        optionIndex: number;
      };
    }>(
      "/api/v1/guilds/:guildId/polls/:pollId/vote",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];

        const result = await votePollWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          pollId: request.params.pollId,
          optionIndex: request.body.optionIndex,
        });

        return result;
      },
    );

    // 16. Close Poll
    app.post<{
      Params: { guildId: string; pollId: string };
    }>(
      "/api/v1/guilds/:guildId/polls/:pollId/close",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];

        const result = await closePollWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          pollId: request.params.pollId,
        });

        return result;
      },
    );

    // 17. List Giveaways
    app.get<{
      Params: { guildId: string };
      Querystring: { status?: "active" | "ended" | "cancelled" };
    }>(
      "/api/v1/guilds/:guildId/giveaways",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const giveaways = await uow
          .getRepositories()
          .giveaways.list(tenant, request.query.status);
        return { giveaways };
      },
    );

    // 18. Create Giveaway
    app.post<{
      Params: { guildId: string };
      Body: {
        prize: string;
        channelId: string;
        winnerCount?: number;
        durationMinutes?: number;
      };
    }>(
      "/api/v1/guilds/:guildId/giveaways",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request, reply) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];

        const giveaway = await createGiveawayWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          prize: request.body.prize,
          winnerCount: request.body.winnerCount,
          durationMinutes: request.body.durationMinutes ?? 1440,
          channelId: request.body.channelId,
        });

        reply.status(201);
        return { giveaway };
      },
    );

    // 19. Enter Giveaway
    app.post<{
      Params: { guildId: string; giveawayId: string };
    }>(
      "/api/v1/guilds/:guildId/giveaways/:giveawayId/enter",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];

        const result = await enterGiveawayWorkflow(uow, {
          actor,
          grants,
          tenant,
          giveawayId: request.params.giveawayId,
        });

        return result;
      },
    );

    // 20. End Giveaway
    app.post<{
      Params: { guildId: string; giveawayId: string };
    }>(
      "/api/v1/guilds/:guildId/giveaways/:giveawayId/end",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];

        const result = await endGiveawayWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          giveawayId: request.params.giveawayId,
        });

        return result;
      },
    );

    // 21. Reroll Giveaway
    app.post<{
      Params: { guildId: string; giveawayId: string };
    }>(
      "/api/v1/guilds/:guildId/giveaways/:giveawayId/reroll",
      { preHandler: [authenticate, requireGuildTenant] },
      async (request) => {
        const tenant = request.tenant!;
        const actor = request.actor!;
        const grants = request.grants ?? [];

        const result = await rerollGiveawayWorkflow(uow, {
          actor,
          grants,
          tenant,
          correlationId: request.id,
          giveawayId: request.params.giveawayId,
        });

        return result;
      },
    );
  };
}
