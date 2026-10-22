import type { FastifyRequest, FastifyReply } from "fastify";
import type { ISessionStore, UserSession } from "../auth/session-manager.js";
import type { ActorContext, PermissionGrant } from "@nexus/authorization";
import type { TenantContext } from "@nexus/database";

declare module "fastify" {
  interface FastifyRequest {
    session?: UserSession;
    actor?: ActorContext;
    tenant?: TenantContext;
    grants?: readonly PermissionGrant[];
  }
}

export function createAuthHooks(sessionStore: ISessionStore) {
  return {
    async authenticate(request: FastifyRequest, reply: FastifyReply) {
      // 1. Try cookie first
      let token = request.cookies["nexus_session"];

      // 2. Fallback to Authorization: Bearer <token>
      if (!token && request.headers.authorization) {
        const parts = request.headers.authorization.split(" ");
        if (parts[0] === "Bearer" && parts[1]) {
          token = parts[1];
        }
      }

      if (!token) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required. No valid session found.",
            requestId: request.id,
          },
        });
      }

      const session = await sessionStore.resolveSession(token);
      if (!session) {
        return reply.status(401).send({
          error: {
            code: "SESSION_EXPIRED",
            message: "Session is expired or invalid.",
            requestId: request.id,
          },
        });
      }

      request.session = session;
    },

    async requireGuildTenant(
      request: FastifyRequest<{ Params: { guildId: string } }>,
      reply: FastifyReply,
    ) {
      const { session } = request;
      const { guildId } = request.params;

      if (!session) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required",
            requestId: request.id,
          },
        });
      }

      // Check if user has access to this guild
      const guildMembership = session.accessibleGuilds.find(
        (g) => g.guildId === guildId,
      );
      if (!guildMembership && !session.isPlatformOperator) {
        return reply.status(403).send({
          error: {
            code: "TENANT_ACCESS_DENIED",
            message: `You do not have access to manage server '${guildId}'`,
            requestId: request.id,
            details: { guildId },
          },
        });
      }

      request.tenant = { guildId };
      request.actor = {
        actorId: session.userId,
        actorType: "user",
        realm: "guild",
        guildId,
        isGuildOwner: guildMembership?.isOwner ?? false,
      };

      // By default, grant guild owner preset or default member grants
      const grants: PermissionGrant[] = [];
      if (guildMembership?.isOwner) {
        grants.push({
          id: `grant_owner_${session.userId}_${guildId}`,
          principalType: "guild_owner",
          principalId: session.userId,
          realm: "guild",
          guildId,
          capability: "*",
          effect: "allow",
        });
      }
      request.grants = grants;
    },

    async requirePlatformRealm(request: FastifyRequest, reply: FastifyReply) {
      const { session } = request;

      if (!session) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required",
            requestId: request.id,
          },
        });
      }

      if (!session.isPlatformOperator) {
        return reply.status(403).send({
          error: {
            code: "REALM_MISMATCH",
            message: "Access restricted to platform operators only",
            requestId: request.id,
          },
        });
      }

      request.actor = {
        actorId: session.userId,
        actorType: "platform_operator",
        realm: "platform",
      };
    },
  };
}
