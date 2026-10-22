import type { Guild } from "discord.js";
import type { IUnitOfWork } from "@nexus/database";
import { runGuildDiagnostics } from "@nexus/discord-adapter";
import type { GuildId } from "@nexus/contracts";

export async function onGuildCreate(
  guild: Guild,
  uow: IUnitOfWork,
): Promise<void> {
  const tenant = { guildId: guild.id };

  // 1. Initialize guild settings in database if not yet present
  await uow.runInTransaction(async (repos) => {
    const existing = await repos.guildSettings.getSettings(tenant);
    if (!existing) {
      await repos.guildSettings.updateSettings(tenant, {
        welcomeMessageTemplate: "Welcome {user} to {server}!",
      });

      await repos.auditEvents.record({
        eventId: `aud_join_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        realm: "guild",
        guildId: guild.id as GuildId,
        actorId: guild.ownerId,
        actorType: "user",
        action: "guild.join",
        resourceType: "guild",
        resourceId: guild.id,
        outcome: "success",
        reason: "Nexus bot installed to server",
        correlationId: `join_${guild.id}`,
        occurredAt: new Date().toISOString(),
      });
    }
  });

  // 2. Audit current permissions and log diagnostics
  const botMember = guild.members.me;
  const bitfield = botMember?.permissions.bitfield ?? 0n;
  const highestRolePos = botMember?.roles.highest.position ?? 0;
  const report = runGuildDiagnostics(bitfield, highestRolePos);

  // 3. Post friendly onboarding card to system/first available channel if writable
  const channelList = guild.channels?.cache
    ? Array.from(guild.channels.cache.values())
    : [];

  const targetChannel =
    guild.systemChannel ??
    channelList.find(
      (c) =>
        c &&
        "isTextBased" in c &&
        typeof c.isTextBased === "function" &&
        c.isTextBased() &&
        (!("permissionsFor" in c) ||
          (guild.members?.me &&
            c.permissionsFor(guild.members.me)?.has("SendMessages"))),
    );

  if (targetChannel && targetChannel.isTextBased() && "send" in targetChannel) {
    await targetChannel
      .send({
        embeds: [
          {
            title: "Nexus Platform Installed",
            description:
              "Thank you for adding Nexus! All operations are protected by internal action-safety policies.",
            color: 0x5865f2,
            fields: [
              {
                name: "Installation Mode",
                value: report.hasAdministrator
                  ? "🛡️ **Full Administrator Mode** (Complete automation enabled)"
                  : "🔒 **Restricted Granular Mode**",
                inline: true,
              },
              {
                name: "Getting Started",
                value:
                  "Run `/setup start` to configure logging channels.\nRun `/diagnostics` to review permissions health.\nRun `/help` for commands overview.",
                inline: false,
              },
            ],
            footer: { text: "Nexus • Gaming & Esports Platform" },
          },
        ],
      })
      .catch(() => {
        // Best-effort send; ignore if channel perms changed
      });
  }
}
