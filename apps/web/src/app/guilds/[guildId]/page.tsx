"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
} from "@nexus/ui";
import { getGuildOverview } from "../../../lib/api";

export default function GuildOverviewPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) || "123456789012345678";
  const overview = getGuildOverview(guildId);

  if (!overview) {
    return <div>Guild not found</div>;
  }

  const { guild, stats, modules, recentActivity } = overview;

  return (
    <div>
      {/* Breadcrumbs & Header */}
      <div className="nexus-breadcrumbs">
        <Link href="/">Servers</Link>
        <span>/</span>
        <span>{guild.name}</span>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>Overview</span>
      </div>

      <div className="nexus-page-header">
        <div>
          <h1 className="nexus-page-title">Operational Overview</h1>
          <p className="nexus-page-desc">
            Live telemetry, active gaming modules, and recent security events.
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Link href={`/guilds/${guildId}/setup`}>
            <Button variant="secondary" size="sm">
              Run Diagnostics
            </Button>
          </Link>
          <Link href={`/guilds/${guildId}/modules`}>
            <Button variant="primary" size="sm">
              Manage Modules
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        className="nexus-grid nexus-grid--cols-4"
        style={{ marginBottom: "var(--space-6)" }}
      >
        <Card>
          <CardHeader>
            <CardDescription>Scheduled Events</CardDescription>
            <div
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginTop: "var(--space-1)",
              }}
              className="tabular-nums"
            >
              {stats.activeEvents}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Open Disputes</CardDescription>
            <div
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                color:
                  stats.openDisputes > 0
                    ? "var(--status-warning)"
                    : "var(--text-primary)",
                marginTop: "var(--space-1)",
              }}
              className="tabular-nums"
            >
              {stats.openDisputes}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Moderation Cases (24h)</CardDescription>
            <div
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginTop: "var(--space-1)",
              }}
              className="tabular-nums"
            >
              {stats.modCases24h}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Durable Audit Events</CardDescription>
            <div
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginTop: "var(--space-1)",
              }}
              className="tabular-nums"
            >
              {stats.auditEventsTotal.toLocaleString()}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Two Column Section: Modules & Recent Activity */}
      <div
        className="nexus-grid nexus-grid--cols-2"
        style={{ gap: "var(--space-6)" }}
      >
        {/* Module Health */}
        <Card>
          <CardHeader>
            <CardTitle>Enabled Operations Modules</CardTitle>
            <CardDescription>
              Subsystems active in this guild workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              {modules.map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-2) var(--space-3)",
                    backgroundColor: "var(--surface-raised)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div>
                    <div
                      style={{ fontWeight: 600, fontSize: "var(--text-xs)" }}
                    >
                      {mod.name}
                    </div>
                    <div
                      style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                    >
                      {mod.requiredCapability}
                    </div>
                  </div>
                  <Badge
                    status={mod.enabled ? "success" : "neutral"}
                    dot={mod.enabled}
                  >
                    {mod.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Link href={`/guilds/${guildId}/modules`} style={{ width: "100%" }}>
              <Button variant="ghost" size="sm" style={{ width: "100%" }}>
                Configure Modules →
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Recent Audit Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Action Audit Trail</CardTitle>
            <CardDescription>
              Latest mutations validated by ActionPolicyEngine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              {recentActivity.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    borderBottom: "1px solid var(--border-subtle)",
                    paddingBottom: "var(--space-2)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-xs)",
                        fontWeight: 600,
                      }}
                    >
                      {event.action}
                    </div>
                    <div
                      style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                    >
                      by {event.actorTag}
                    </div>
                  </div>
                  <Badge
                    status={event.status === "success" ? "success" : "danger"}
                  >
                    {event.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Link href={`/guilds/${guildId}/audit`} style={{ width: "100%" }}>
              <Button variant="ghost" size="sm" style={{ width: "100%" }}>
                View Full Audit Log →
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
