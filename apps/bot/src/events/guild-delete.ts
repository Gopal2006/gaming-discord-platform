import type { Guild } from "discord.js";
import type { IUnitOfWork } from "@nexus/database";
import type { GuildId } from "@nexus/contracts";

export async function onGuildDelete(
  guild: Guild,
  uow: IUnitOfWork,
): Promise<void> {
  const tenant = { guildId: guild.id };

  await uow.runInTransaction(async (repos) => {
    await repos.auditEvents.record({
      eventId: `aud_leave_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      realm: "guild",
      guildId: guild.id as GuildId,
      actorId: "system",
      actorType: "system",
      action: "guild.leave",
      resourceType: "guild",
      resourceId: guild.id,
      outcome: "success",
      reason: "Nexus bot disconnected / removed from guild",
      correlationId: `leave_${guild.id}`,
      occurredAt: new Date().toISOString(),
    });
  });
}
