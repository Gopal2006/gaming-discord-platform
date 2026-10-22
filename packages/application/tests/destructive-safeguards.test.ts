import { describe, it, expect } from "vitest";
import {
  InMemoryUnitOfWork,
  InMemoryOutboxRepository,
  OutboxDispatcher,
  type OutboxEventRecord,
} from "@nexus/database";
import {
  InMemoryConfirmationService,
  manageEmergencyStopWorkflow,
  executeModerationWorkflow,
  updateGuildSettingsWorkflow,
  PolicyViolationError,
} from "../src/index.js";
import {
  DiscordPermissions,
  type ActorContext,
  type PermissionGrant,
} from "@nexus/authorization";

describe("Destructive Operation Safeguards & Emergency Controls", () => {
  const guildAdminActor: ActorContext = {
    actorId: "user_admin_100",
    actorType: "user",
    realm: "guild",
    guildId: "guild_safe_1",
    isGuildOwner: true,
  };

  const adminGrants: PermissionGrant[] = [
    {
      id: "grant_admin_all",
      principalType: "guild_owner",
      principalId: "user_admin_100",
      realm: "guild",
      guildId: "guild_safe_1",
      capability: "*",
      effect: "allow",
    },
  ];

  it("ConfirmationService creates single-use tokens and strictly prevents replay attacks", () => {
    const confirmationService = new InMemoryConfirmationService();

    const { token, payload } = confirmationService.createToken({
      guildId: "guild_safe_1",
      actorId: "user_admin_100",
      operationType: "moderation.ban",
      targetFingerprint: "user_bad_actor_999",
      ttlSeconds: 60,
    });

    expect(token).toHaveLength(48); // 24 bytes hex
    expect(payload.guildId).toBe("guild_safe_1");

    // 1st Verification & Consumption: SUCCEEDS
    const firstAttempt = confirmationService.verifyAndConsumeToken({
      token,
      guildId: "guild_safe_1",
      actorId: "user_admin_100",
      operationType: "moderation.ban",
      targetFingerprint: "user_bad_actor_999",
    });

    expect(firstAttempt.valid).toBe(true);

    // 2nd Verification & Consumption (REPLAY ATTEMPT): FAILS
    const replayAttempt = confirmationService.verifyAndConsumeToken({
      token,
      guildId: "guild_safe_1",
      actorId: "user_admin_100",
      operationType: "moderation.ban",
      targetFingerprint: "user_bad_actor_999",
    });

    expect(replayAttempt.valid).toBe(false);
    expect(replayAttempt.reason).toContain("REPLAY_DETECTED");
  });

  it("ConfirmationService rejects expired and mismatched tokens", () => {
    const confirmationService = new InMemoryConfirmationService();

    const { token } = confirmationService.createToken({
      guildId: "guild_safe_1",
      actorId: "user_admin_100",
      operationType: "moderation.ban",
      targetFingerprint: "user_bad_actor_999",
      ttlSeconds: 1, // 1 second TTL
    });

    // Mismatched target
    const targetMismatch = confirmationService.verifyAndConsumeToken({
      token,
      guildId: "guild_safe_1",
      actorId: "user_admin_100",
      operationType: "moderation.ban",
      targetFingerprint: "DIFFERENT_TARGET",
    });
    expect(targetMismatch.valid).toBe(false);
    expect(targetMismatch.reason).toContain("TARGET_MISMATCH");

    // Expired verification
    const expiredAttempt = confirmationService.verifyAndConsumeToken({
      token,
      guildId: "guild_safe_1",
      actorId: "user_admin_100",
      operationType: "moderation.ban",
      targetFingerprint: "user_bad_actor_999",
      now: new Date(Date.now() + 5000), // 5 seconds in future
    });
    expect(expiredAttempt.valid).toBe(false);
    expect(expiredAttempt.reason).toContain("TOKEN_EXPIRED");
  });

  it("Per-guild emergency stop halts subsequent actions and can be lifted", async () => {
    const uow = new InMemoryUnitOfWork();
    const tenant = { guildId: "guild_safe_1" };

    // 1. Trigger emergency stop
    const stopResult = await manageEmergencyStopWorkflow(uow, {
      actor: guildAdminActor,
      grants: adminGrants,
      tenant,
      correlationId: "req_stop_1",
      action: "stop",
      reason: "Compromised bot integration detected",
      confirmationToken: {
        token: "tok_confirm_stop",
        guildId: "guild_safe_1",
        actorId: guildAdminActor.actorId,
        operationType: "guild.emergency_stop.set",
        targetFingerprint: "guild_safe_1",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });

    expect(stopResult.isEmergencyStopped).toBe(true);
    expect(stopResult.emergencyStopReason).toBe(
      "Compromised bot integration detected",
    );

    // Verify audit event written
    const auditLogs = await uow.getRepositories().auditEvents.list(tenant);
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]!.action).toBe("guild.emergency_stop.set");

    // 2. Normal workflow is now BLOCKED by emergency stop
    await expect(
      updateGuildSettingsWorkflow(uow, {
        actor: guildAdminActor,
        grants: adminGrants,
        tenant,
        correlationId: "req_patch_blocked",
        patch: { welcomeMessageTemplate: "Welcome!" },
      }),
    ).rejects.toThrowError(PolicyViolationError);

    // 3. Lift emergency stop
    const liftResult = await manageEmergencyStopWorkflow(uow, {
      actor: guildAdminActor,
      grants: adminGrants,
      tenant,
      correlationId: "req_lift_1",
      action: "lift",
    });

    expect(liftResult.isEmergencyStopped).toBe(false);

    // 4. Normal workflow is now unblocked
    const patchResult = await updateGuildSettingsWorkflow(uow, {
      actor: guildAdminActor,
      grants: adminGrants,
      tenant,
      correlationId: "req_patch_ok",
      patch: { welcomeMessageTemplate: "Welcome back!" },
    });

    expect(patchResult.welcomeMessageTemplate).toBe("Welcome back!");
  });

  it("Destructive moderation workflow enforces role hierarchy, confirmation, and limits", async () => {
    const uow = new InMemoryUnitOfWork();
    const tenant = { guildId: "guild_safe_1" };
    const confirmationService = new InMemoryConfirmationService();

    // 1. Role Hierarchy Violation: Cannot ban server owner
    await expect(
      executeModerationWorkflow(uow, {
        actor: guildAdminActor,
        grants: adminGrants,
        tenant,
        correlationId: "req_mod_owner",
        action: "ban",
        target: {
          targetId: "user_owner_original",
          isGuildOwner: true,
        },
        reason: "Testing cannot ban owner",
      }),
    ).rejects.toThrowError(PolicyViolationError);

    // 2. Bulk Limit Violation: Cannot purge 200 messages
    await expect(
      executeModerationWorkflow(uow, {
        actor: guildAdminActor,
        grants: adminGrants,
        tenant,
        correlationId: "req_purge_overlimit",
        action: "purge",
        target: {
          targetId: "channel_general",
        },
        bulkCount: 200,
        reason: "Testing bulk limit",
      }),
    ).rejects.toThrowError(PolicyViolationError);

    // 3. Confirmation Required: Banning without confirmation token is denied
    await expect(
      executeModerationWorkflow(uow, {
        actor: guildAdminActor,
        grants: adminGrants,
        tenant,
        correlationId: "req_ban_no_conf",
        action: "ban",
        target: {
          targetId: "user_griefer_123",
          targetRolePosition: 5,
        },
        reason: "Griefing server",
      }),
    ).rejects.toThrowError(PolicyViolationError);

    // 4. Banning WITH valid single-use confirmation token succeeds
    const { token, payload } = confirmationService.createToken({
      guildId: "guild_safe_1",
      actorId: guildAdminActor.actorId,
      operationType: "moderation.ban",
      targetFingerprint: "user_griefer_123",
    });

    const banResult = await executeModerationWorkflow(uow, {
      actor: guildAdminActor,
      grants: adminGrants,
      tenant,
      correlationId: "req_ban_success",
      action: "ban",
      target: {
        targetId: "user_griefer_123",
        targetRolePosition: 5,
      },
      reason: "Griefing server",
      botPermissions: {
        rawBitfield: DiscordPermissions.ADMINISTRATOR,
      },
      confirmationToken: payload,
    });

    expect(banResult.status).toBe("applied");
    expect(banResult.caseRecord?.targetUserId).toBe("user_griefer_123");

    // Verify outbox and audit events were written transactionally
    const auditEvents = await uow.getRepositories().auditEvents.list(tenant);
    expect(auditEvents.some((e) => e.action === "moderation.ban")).toBe(true);
  });

  it("OutboxDispatcher halts dispatch when global or guild emergency stop is active", async () => {
    const outboxRepo = new InMemoryOutboxRepository();
    const publishedEvents: OutboxEventRecord[] = [];
    const mockTransport = {
      async publish(event: OutboxEventRecord) {
        publishedEvents.push(event);
      },
    };

    // Queue 2 events: one for guild_alpha, one for guild_beta
    await outboxRepo.writeEvent({
      id: "evt_alpha_1",
      guildId: "guild_alpha",
      eventType: "announcement.published",
      eventVersion: 1,
      aggregateType: "announcement",
      aggregateId: "ann_1",
      payloadJson: { title: "Hello Alpha" },
      availableAt: new Date(),
    });

    await outboxRepo.writeEvent({
      id: "evt_beta_1",
      guildId: "guild_beta",
      eventType: "announcement.published",
      eventVersion: 1,
      aggregateType: "announcement",
      aggregateId: "ann_2",
      payloadJson: { title: "Hello Beta" },
      availableAt: new Date(),
    });

    // Case 1: Global Emergency Stop
    const globalStoppedDispatcher = new OutboxDispatcher(
      outboxRepo,
      mockTransport,
      {
        workerId: "worker_test_1",
        isEmergencyStopped: () => true, // Global emergency stop
      },
    );

    const globalResult = await globalStoppedDispatcher.dispatchPending();
    expect(globalResult.pausedByEmergencyStop).toBe(true);
    expect(publishedEvents).toHaveLength(0);

    // Case 2: Per-guild Emergency Stop for guild_alpha only
    const guildFilteredDispatcher = new OutboxDispatcher(
      outboxRepo,
      mockTransport,
      {
        workerId: "worker_test_2",
        isGuildEmergencyStopped: (guildId) => guildId === "guild_alpha",
      },
    );

    const guildResult = await guildFilteredDispatcher.dispatchPending();
    // guild_alpha deferred, guild_beta published
    expect(guildResult.acknowledgedCount).toBe(1);
    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]!.guildId).toBe("guild_beta");
  });
});
