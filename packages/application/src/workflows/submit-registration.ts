import type {
  IUnitOfWork,
  RegistrationRecord,
  TenantContext,
} from "@nexus/database";
import {
  evaluateAuthorization,
  type ActorContext,
  type PermissionGrant,
} from "@nexus/authorization";
import { GuildCapability } from "@nexus/contracts";
import { validateRegistrationCapacity } from "@nexus/domain";
import {
  UnauthorizedError,
  ResourceNotFoundError,
  ConflictError,
} from "../errors.js";

export interface SubmitRegistrationRequest {
  actor: ActorContext;
  grants: readonly PermissionGrant[];
  tenant: TenantContext;
  correlationId: string;
  data: {
    id: string;
    tournamentId: string;
    entrantId: string;
    entrantType: "user" | "team";
    answersJson?: Record<string, unknown>;
  };
}

export async function submitRegistrationWorkflow(
  uow: IUnitOfWork,
  request: SubmitRegistrationRequest,
): Promise<RegistrationRecord> {
  const { actor, grants, tenant, correlationId, data } = request;

  // 1. Authorize Capability
  const decision = evaluateAuthorization(
    {
      actor,
      capability: GuildCapability.RegistrationSubmit,
      targetRealm: "guild",
      targetGuildId: tenant.guildId,
    },
    grants,
  );

  if (!decision.allowed) {
    throw new UnauthorizedError(decision.reasonCode, {
      capability: GuildCapability.RegistrationSubmit,
      guildId: tenant.guildId,
    });
  }

  // 2. Execute Transactionally
  return await uow.runInTransaction(async (repos) => {
    // 2a. Verify Tournament Exists & State
    const tournament = await repos.tournaments.getById(
      tenant,
      data.tournamentId,
    );
    if (!tournament) {
      throw new ResourceNotFoundError("Tournament", data.tournamentId);
    }

    if (tournament.status !== "registration_open") {
      throw new ConflictError(
        `Tournament registration is not open (current status: '${tournament.status}')`,
      );
    }

    // 2b. Check Capacity
    const acceptedCount = await repos.registrations.countAccepted(
      tenant,
      data.tournamentId,
    );
    validateRegistrationCapacity({
      maxCap: tournament.maxEntrants,
      currentAccepted: acceptedCount,
    });

    // 2c. Persist Registration with status 'accepted'
    const registration = await repos.registrations.create(tenant, {
      id: data.id,
      tournamentId: data.tournamentId,
      entrantId: data.entrantId,
      entrantType: data.entrantType,
      status: "accepted",
      answersJson: data.answersJson ?? null,
      formVersion: "1.0",
      checkedInAt: null,
    });

    // 2d. Persist Outbox Event
    await repos.outbox.writeEvent({
      id: `evt_reg_${registration.id}_${Date.now()}`,
      guildId: tenant.guildId,
      eventType: "registration.accepted",
      eventVersion: 1,
      aggregateType: "registration",
      aggregateId: registration.id,
      payloadJson: {
        registrationId: registration.id,
        tournamentId: registration.tournamentId,
        entrantId: registration.entrantId,
        entrantType: registration.entrantType,
        slotNumber: acceptedCount + 1,
        correlationId,
      },
      availableAt: new Date(),
    });

    return registration;
  });
}
