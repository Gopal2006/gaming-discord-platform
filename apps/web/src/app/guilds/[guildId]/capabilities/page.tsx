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
  FormGroup,
  Select,
} from "@nexus/ui";
import { GuildCapability } from "@nexus/contracts";
import { MOCK_ROLES, MOCK_GUILDS } from "../../../../lib/api";

export default function CapabilitiesEditorPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) || "123456789012345678";
  const guild = MOCK_GUILDS.find((g) => g.id === guildId) || MOCK_GUILDS[0];

  const [selectedRole, setSelectedRole] = useState(MOCK_ROLES[0]?.roleId || "");
  const [evalAction, setEvalAction] = useState("tournament.manage");
  const [evalResult, setEvalResult] = useState<string | null>(null);

  const activeRole =
    MOCK_ROLES.find((r) => r.roleId === selectedRole) || MOCK_ROLES[0];

  const handleEvaluate = () => {
    if (!activeRole) return;
    const hasCap = activeRole.capabilities.some(
      (c) => c.includes(evalAction) || c === evalAction,
    );
    if (hasCap) {
      setEvalResult(
        `ALLOWED: Role "${activeRole.roleName}" holds explicit capability grant "${evalAction}". ActionPolicyEngine permits execution.`,
      );
    } else {
      setEvalResult(
        `DENIED: Role "${activeRole.roleName}" lacks capability "${evalAction}". Even if Discord grants Administrator, ActionPolicyEngine blocks mutation.`,
      );
    }
  };

  return (
    <div>
      <div className="nexus-breadcrumbs">
        <Link href="/">Servers</Link>
        <span>/</span>
        <span>{guild?.name}</span>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>Roles & Access</span>
      </div>

      <div className="nexus-page-header">
        <div>
          <h1 className="nexus-page-title">Roles & Capability Grants</h1>
          <p className="nexus-page-desc">
            Explicit server-side capability bindings. Discord roles never
            inherit platform capabilities automatically.
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <Alert status="warning" title="Privilege Escalation Protection Active">
        Discord Administrator permissions do NOT bypass internal capability
        policies. Staff members can only delegate capabilities they personally
        hold.
      </Alert>

      <div
        className="nexus-grid nexus-grid--cols-2"
        style={{ gap: "var(--space-6)", marginBottom: "var(--space-8)" }}
      >
        {/* Role List & Capabilities */}
        <div>
          <h3
            style={{
              fontSize: "var(--text-base)",
              fontWeight: 600,
              marginBottom: "var(--space-3)",
            }}
          >
            Configured Guild Roles
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {MOCK_ROLES.map((role) => (
              <Card
                key={role.roleId}
                interactive
                style={{
                  borderColor:
                    selectedRole === role.roleId
                      ? "var(--accent-primary)"
                      : undefined,
                }}
                onClick={() => {
                  setSelectedRole(role.roleId);
                  setEvalResult(null);
                }}
              >
                <CardHeader>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                      }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          backgroundColor: role.roleColor,
                          display: "inline-block",
                        }}
                      />
                      <CardTitle>{role.roleName}</CardTitle>
                    </div>
                    {role.isDiscordAdmin && (
                      <Badge status="info">Discord Admin</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "var(--space-1)",
                    }}
                  >
                    {role.capabilities.map((cap) => (
                      <span
                        key={cap}
                        style={{
                          backgroundColor: "var(--surface-raised)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-xs)",
                          padding: "0.125rem 0.375rem",
                          fontSize: "0.7rem",
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Effective Access Evaluator */}
        <div>
          <h3
            style={{
              fontSize: "var(--text-base)",
              fontWeight: 600,
              marginBottom: "var(--space-3)",
            }}
          >
            Effective Access Evaluator
          </h3>
          <Card>
            <CardHeader>
              <CardTitle>
                Why can / can't this role execute an action?
              </CardTitle>
              <CardDescription>
                Simulate ActionPolicyEngine evaluation rules for role:{" "}
                <strong>{activeRole?.roleName}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormGroup label="Select Target Action / Capability">
                <Select
                  value={evalAction}
                  onChange={(e) => setEvalAction(e.target.value)}
                >
                  <option value={GuildCapability.TournamentManage}>
                    tournament.manage (Create brackets/matches)
                  </option>
                  <option value={GuildCapability.MatchDisputeResolve}>
                    match.dispute.resolve (Resolve disputed scores)
                  </option>
                  <option value={GuildCapability.ModerationBan}>
                    moderation.ban (Ban discord member)
                  </option>
                  <option value={GuildCapability.AnnouncementPublish}>
                    announcement.publish (Send broadcast embed)
                  </option>
                  <option value={GuildCapability.GuildSettingsEdit}>
                    guild.settings.edit (Modify server settings)
                  </option>
                </Select>
              </FormGroup>

              <Button
                variant="primary"
                onClick={handleEvaluate}
                style={{ width: "100%", marginBottom: "var(--space-4)" }}
              >
                Run Policy Evaluation
              </Button>

              {evalResult && (
                <div
                  style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: evalResult.startsWith("ALLOWED")
                      ? "var(--status-success-bg)"
                      : "var(--status-danger-bg)",
                    border: `1px solid ${evalResult.startsWith("ALLOWED") ? "var(--status-success-border)" : "var(--status-danger-border)"}`,
                    color: evalResult.startsWith("ALLOWED")
                      ? "var(--status-success)"
                      : "var(--status-danger)",
                    fontSize: "var(--text-xs)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {evalResult}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
