import type { FastifyPluginAsync } from "fastify";
import type { IUnitOfWork } from "@nexus/database";
import type { ISessionStore } from "../auth/session-manager.js";
import { createAuthHooks } from "../middleware/auth.js";
import {
  updateGuildSettingsWorkflow,
  createAnnouncementWorkflow,
  submitRegistrationWorkflow,
  transitionTicketWorkflow,
} from "@nexus/application";

export interface GuildRoutesOptions {
  uow: IUnitOfWork;
  sessionStore: ISessionStore;
}

export function createGuildRoutes(
  options: GuildRoutesOptions,
): FastifyPluginAsync {
  const { uow, sessionStore } = options;
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
  };
}
