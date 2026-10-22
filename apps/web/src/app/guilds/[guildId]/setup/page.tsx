"use client";

import React, { useState } from "react";
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
  Alert,
  Dialog,
} from "@nexus/ui";
import { getGuildSetup, MOCK_GUILDS } from "../../../../lib/api";

export default function SetupHealthPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) || "123456789012345678";
  const setup = getGuildSetup(guildId);
  const guild = MOCK_GUILDS.find((g) => g.id === guildId) || MOCK_GUILDS[0];

  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairSuccess, setRepairSuccess] = useState(false);

  const missingChannels = Object.entries(setup.channels).filter(
    ([, ch]) => !ch.exists,
  );

  const handleRepair = () => {
    setRepairing(true);
    setTimeout(() => {
      setRepairing(false);
      setRepairModalOpen(false);
      setRepairSuccess(true);
    }, 700);
  };

  return (
    <div>
      <div className="nexus-breadcrumbs">
        <Link href="/">Servers</Link>
        <span>/</span>
        <span>{guild?.name}</span>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>Setup & Health</span>
      </div>

      <div className="nexus-page-header">
        <div>
          <h1 className="nexus-page-title">Setup & Diagnostics</h1>
          <p className="nexus-page-desc">
            Verify transport reach, role hierarchy, and required channel
            infrastructure.
          </p>
        </div>
        <div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setRepairModalOpen(true)}
          >
            Safe Setup Repair
          </Button>
        </div>
      </div>

      {repairSuccess && (
        <Alert status="success" title="Setup Reconciled Successfully">
          Missing channels and role permissions were safely restored without
          duplicating intact resources.
        </Alert>
      )}

      {/* Checklist Cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        {/* Gateway & Connection */}
        <Card>
          <CardHeader>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <CardTitle>Discord Gateway Connectivity</CardTitle>
                <CardDescription>
                  Real-time websocket heartbeat and latency.
                </CardDescription>
              </div>
              <Badge status={setup.botConnected ? "success" : "danger"}>
                {setup.botConnected ? "Online" : "Disconnected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div
              style={{
                display: "flex",
                gap: "var(--space-8)",
                fontSize: "var(--text-xs)",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>
                  Heartbeat Latency:{" "}
                </span>
                <strong className="tabular-nums">
                  {setup.gatewayLatencyMs} ms
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>
                  Gateway Status:{" "}
                </span>
                <strong>Ready (discord.js v14)</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Installation Mode & Permissions */}
        <Card>
          <CardHeader>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <CardTitle>Transport Reach Mode</CardTitle>
                <CardDescription>
                  External Discord permission tier.
                </CardDescription>
              </div>
              <Badge status="info">
                Mode:{" "}
                {setup.installationMode === "administrator"
                  ? "Administrator (0x8)"
                  : "Restricted Granular"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p
              style={{
                margin: 0,
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
              }}
            >
              {setup.installationMode === "administrator"
                ? "Bot has Administrator transport reach. All mutations remain strictly bounded by server-side ActionPolicyEngine rules."
                : "Bot operates with granular Discord bitfield permissions. Advanced features requiring broad channel overrides may be limited."}
            </p>
          </CardContent>
        </Card>

        {/* Role Hierarchy */}
        <Card>
          <CardHeader>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <CardTitle>Discord Role Hierarchy Position</CardTitle>
                <CardDescription>
                  Ensures the bot role sits above staff and tournament roles.
                </CardDescription>
              </div>
              <Badge status={setup.roleHierarchyOk ? "success" : "danger"}>
                {setup.roleHierarchyOk
                  ? "Hierarchy Healthy"
                  : "Hierarchy Inverted"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div
              style={{
                display: "flex",
                gap: "var(--space-8)",
                fontSize: "var(--text-xs)",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>
                  Bot Highest Role Position:{" "}
                </span>
                <strong className="tabular-nums">
                  #{setup.botRolePosition}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>
                  Top Managed Role Position:{" "}
                </span>
                <strong className="tabular-nums">
                  #{setup.targetRolePosition}
                </strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational Channels */}
        <Card>
          <CardHeader>
            <CardTitle>Required Operational Channels</CardTitle>
            <CardDescription>
              Dedicated destinations for audit logs, announcements, and
              moderation cases.
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
              {Object.entries(setup.channels).map(([key, ch]) => (
                <div
                  key={key}
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
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-xs)",
                      }}
                    >
                      #{ch.name}
                    </span>
                    <span
                      style={{
                        marginLeft: "var(--space-2)",
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      ({key})
                    </span>
                  </div>
                  <Badge status={ch.exists ? "success" : "warning"}>
                    {ch.exists ? "Configured" : "Missing"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repair Setup Modal */}
      <Dialog
        isOpen={repairModalOpen}
        onClose={() => setRepairModalOpen(false)}
        title="Confirm Safe Setup Repair"
        description="Reconcile missing guild entities without duplicating intact ones."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRepairModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={repairing}
              onClick={handleRepair}
            >
              Execute Safe Repair
            </Button>
          </>
        }
      >
        <div>
          <p
            style={{
              margin: "0 0 var(--space-3) 0",
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
            }}
          >
            The idempotent setup engine will verify existing channel mappings in
            the database and create only missing resources:
          </p>
          {missingChannels.length > 0 ? (
            <ul
              style={{
                margin: 0,
                paddingLeft: "var(--space-4)",
                fontSize: "var(--text-xs)",
                color: "var(--status-warning)",
              }}
            >
              {missingChannels.map(([key, ch]) => (
                <li key={key}>Provision missing channel: #{ch.name}</li>
              ))}
            </ul>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: "var(--text-xs)",
                color: "var(--status-success)",
              }}
            >
              ✓ All required channels currently exist. Repair will verify
              permissions and refresh cache safely.
            </p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
