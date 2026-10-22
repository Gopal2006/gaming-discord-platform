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
} from "@nexus/ui";
import { MOCK_MODULES, MOCK_GUILDS } from "../../../../lib/api";

export default function ModuleDirectoryPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) || "123456789012345678";
  const guild = MOCK_GUILDS.find((g) => g.id === guildId) || MOCK_GUILDS[0];

  const [modules, setModules] = useState(MOCK_MODULES);
  const [toggleAlert, setToggleAlert] = useState<string | null>(null);

  const toggleModule = (modId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id === modId) {
          const nextState = !m.enabled;
          setToggleAlert(
            `Module "${m.name}" is now ${nextState ? "enabled" : "disabled"}.`,
          );
          return { ...m, enabled: nextState };
        }
        return m;
      }),
    );
  };

  return (
    <div>
      <div className="nexus-breadcrumbs">
        <Link href="/">Servers</Link>
        <span>/</span>
        <span>{guild?.name}</span>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>Modules</span>
      </div>

      <div className="nexus-page-header">
        <div>
          <h1 className="nexus-page-title">Operations Modules</h1>
          <p className="nexus-page-desc">
            Enable or configure tournament automation, ranked scrims,
            moderation, and community features.
          </p>
        </div>
      </div>

      {toggleAlert && (
        <Alert status="info" title="Module Updated">
          {toggleAlert}
        </Alert>
      )}

      <div
        className="nexus-grid nexus-grid--cols-2"
        style={{ gap: "var(--space-4)" }}
      >
        {modules.map((mod) => (
          <Card key={mod.id}>
            <CardHeader>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <CardTitle>{mod.name}</CardTitle>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {mod.category}
                  </span>
                </div>
                <Badge
                  status={mod.enabled ? "success" : "neutral"}
                  dot={mod.enabled}
                >
                  {mod.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <CardDescription style={{ marginTop: "var(--space-2)" }}>
                {mod.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                  fontSize: "var(--text-xs)",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-muted)" }}>
                    Required Internal Capability:{" "}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent-primary)",
                    }}
                  >
                    {mod.requiredCapability}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>
                    Discord Prerequisites:{" "}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {mod.prerequisites.join(", ")}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant={mod.enabled ? "danger" : "primary"}
                size="sm"
                onClick={() => toggleModule(mod.id)}
              >
                {mod.enabled ? "Disable Module" : "Enable Module"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
