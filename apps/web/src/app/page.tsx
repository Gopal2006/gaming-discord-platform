"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Alert,
} from "@nexus/ui";
import { MOCK_GUILDS } from "../lib/api";

export default function ServerPickerPage() {
  const [search, setSearch] = useState("");

  const filteredGuilds = MOCK_GUILDS.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--surface-page)",
        padding: "var(--space-12) var(--space-4)",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--space-8)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--accent-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "var(--text-xl)",
              }}
            >
              N
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "var(--text-xl)",
                  fontWeight: 700,
                }}
              >
                NEXUS OPERATIONS
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                Multi-Tenant Gaming & Esports Platform
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Link href="/design-system">
              <Button variant="ghost" size="sm">
                Design System
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                alert(
                  "Official Invite: Administrator (0x8) and Granular mode options available in Setup.",
                )
              }
            >
              + Add Bot to Server
            </Button>
          </div>
        </div>

        {/* Page Title & Search */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <h2
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              margin: "0 0 var(--space-2) 0",
            }}
          >
            Select Server
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              margin: "0 0 var(--space-4) 0",
              fontSize: "var(--text-sm)",
            }}
          >
            Manageable gaming servers associated with your authenticated
            session.
          </p>

          <Input
            placeholder="Search servers by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 360 }}
          />
        </div>

        {/* Grid of Servers */}
        <div
          className="nexus-grid nexus-grid--cols-3"
          style={{ marginBottom: "var(--space-8)" }}
        >
          {filteredGuilds.map((guild) => (
            <Card key={guild.id} interactive>
              <CardHeader>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "var(--radius-lg)",
                      backgroundColor: "var(--surface-raised)",
                      border: "1px solid var(--border-default)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                    }}
                  >
                    {guild.icon || "🎮"}
                  </div>
                  <Badge
                    status={
                      guild.healthStatus === "healthy" ? "success" : "warning"
                    }
                  >
                    {guild.healthStatus === "healthy"
                      ? "Operational"
                      : "Degraded"}
                  </Badge>
                </div>
                <CardTitle>{guild.name}</CardTitle>
                <CardDescription>
                  <span className="tabular-nums">
                    {guild.memberCount.toLocaleString()}
                  </span>{" "}
                  members • Mode: {guild.installationMode}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                  }}
                >
                  Active {guild.lastActive}
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/guilds/${guild.id}`} style={{ width: "100%" }}>
                  <Button variant="secondary" style={{ width: "100%" }}>
                    Open Dashboard →
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {filteredGuilds.length === 0 && (
          <Alert status="info" title="No matching servers found">
            Try adjusting your search query or verify your server management
            permissions.
          </Alert>
        )}
      </div>
    </div>
  );
}
