import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

// Mock Next.js navigation hooks
vi.mock("next/navigation", () => ({
  useParams: () => ({ guildId: "123456789012345678" }),
  usePathname: () => "/guilds/123456789012345678",
}));

import ServerPickerPage from "../src/app/page.js";
import GuildLayout from "../src/app/guilds/[guildId]/layout.js";
import GuildOverviewPage from "../src/app/guilds/[guildId]/page.js";
import SetupHealthPage from "../src/app/guilds/[guildId]/setup/page.js";
import ModuleDirectoryPage from "../src/app/guilds/[guildId]/modules/page.js";
import CapabilitiesEditorPage from "../src/app/guilds/[guildId]/capabilities/page.js";
import AuditLogPage from "../src/app/guilds/[guildId]/audit/page.js";
import SettingsPage from "../src/app/guilds/[guildId]/settings/page.js";
import DesignSystemGalleryPage from "../src/app/design-system/page.js";

describe("Nexus Server Dashboard (apps/web)", () => {
  it("Server Picker Page renders authorized manageable servers", () => {
    const html = renderToString(<ServerPickerPage />);
    expect(html).toContain("NEXUS OPERATIONS");
    expect(html).toContain("Select Server");
    expect(html).toContain("Apex Legends Pro League");
    expect(html).toContain("Valorant Champions Community");
    expect(html).toContain("Open Dashboard");
  });

  it("Guild Shell Layout renders persistent navigation and active server context", () => {
    const html = renderToString(
      <GuildLayout>
        <div id="test-content">Dashboard Content</div>
      </GuildLayout>,
    );
    expect(html).toContain("Apex Legends Pro League");
    expect(html).toContain("Overview");
    expect(html).toContain("Setup &amp; Health");
    expect(html).toContain("Modules");
    expect(html).toContain("Roles &amp; Access");
    expect(html).toContain("Audit Log");
    expect(html).toContain("Settings");
    expect(html).toContain("Dashboard Content");
  });

  it("Overview Page renders live operational telemetry and module health", () => {
    const html = renderToString(<GuildOverviewPage />);
    expect(html).toContain("Operational Overview");
    expect(html).toContain("Scheduled Events");
    expect(html).toContain("Open Disputes");
    expect(html).toContain("Moderation Cases");
    expect(html).toContain("Durable Audit Events");
    expect(html).toContain("Enabled Operations Modules");
    expect(html).toContain("Recent Action Audit Trail");
  });

  it("Setup & Health Page renders diagnostics, transport mode, and repair mechanism", () => {
    const html = renderToString(<SetupHealthPage />);
    expect(html).toContain("Setup &amp; Diagnostics");
    expect(html).toContain("Discord Gateway Connectivity");
    expect(html).toContain("Transport Reach Mode");
    expect(html).toContain("Administrator (0x8)");
    expect(html).toContain("Discord Role Hierarchy Position");
    expect(html).toContain("Required Operational Channels");
    expect(html).toContain("Safe Setup Repair");
  });

  it("Module Directory Page displays operational modules and capability requirements", () => {
    const html = renderToString(<ModuleDirectoryPage />);
    expect(html).toContain("Operations Modules");
    expect(html).toContain("Tournament &amp; Bracket Engine");
    expect(html).toContain("Scrims &amp; Ranked Matchmaking");
    expect(html).toContain("Moderation &amp; Safety Shield");
    expect(html).toContain("Required Internal Capability");
  });

  it("Capabilities & Role Editor renders role grants and privilege escalation protections", () => {
    const html = renderToString(<CapabilitiesEditorPage />);
    expect(html).toContain("Roles &amp; Capability Grants");
    expect(html).toContain("Privilege Escalation Protection Active");
    expect(html).toContain("Tournament Director");
    expect(html).toContain("Senior Referee");
    expect(html).toContain("Effective Access Evaluator");
  });

  it("Audit Log Page renders high-density records with action filters", () => {
    const html = renderToString(<AuditLogPage />);
    expect(html).toContain("Action Audit Trail");
    expect(html).toContain("Filter by action or actor");
    expect(html).toContain("tournament.match.approved");
    expect(html).toContain("guild.setup.repaired");
  });

  it("Settings Page renders configuration and emergency killswitch controls", () => {
    const html = renderToString(<SettingsPage />);
    expect(html).toContain("Guild Configuration");
    expect(html).toContain("Server Timezone");
    expect(html).toContain("Emergency Stop Killswitch");
    expect(html).toContain("Save Changes");
  });

  it("Design System Gallery Page renders complete state matrix and token showcases", () => {
    const html = renderToString(<DesignSystemGalleryPage />);
    expect(html).toContain("Nexus Design System (@nexus/ui)");
    expect(html).toContain("Semantic Surface &amp; Status Tokens");
    expect(html).toContain("Button Variants &amp; States");
    expect(html).toContain("Status Badges &amp; Non-Color Indicators");
    expect(html).toContain("Forms &amp; Inline Validation");
    expect(html).toContain("Loading Skeletons");
    expect(html).toContain("Permission Denied");
  });
});
