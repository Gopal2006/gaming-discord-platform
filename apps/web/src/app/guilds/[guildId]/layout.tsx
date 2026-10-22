"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Badge, Button } from "@nexus/ui";
import { MOCK_GUILDS } from "../../../lib/api";

export default function GuildLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const guildId = (params?.guildId as string) || MOCK_GUILDS[0]?.id || "";
  const currentGuild =
    MOCK_GUILDS.find((g) => g.id === guildId) || MOCK_GUILDS[0];

  const navItems = [
    { href: `/guilds/${guildId}`, label: "Overview", icon: "📊" },
    { href: `/guilds/${guildId}/setup`, label: "Setup & Health", icon: "🩺" },
    { href: `/guilds/${guildId}/modules`, label: "Modules", icon: "🧩" },
    {
      href: `/guilds/${guildId}/capabilities`,
      label: "Roles & Access",
      icon: "🛡️",
    },
    { href: `/guilds/${guildId}/audit`, label: "Audit Log", icon: "📜" },
    { href: `/guilds/${guildId}/settings`, label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="nexus-app-container">
      {/* Sidebar */}
      <aside className="nexus-sidebar">
        <div className="nexus-sidebar-header">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--accent-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "var(--text-sm)",
            }}
          >
            N
          </div>
          <div style={{ flex: 1, minWidth: 0 }} className="nav-text">
            <div
              style={{
                fontWeight: 600,
                fontSize: "var(--text-sm)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentGuild?.name || "Nexus Dashboard"}
            </div>
            <div
              style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              Server Operations
            </div>
          </div>
        </div>

        <nav className="nexus-sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nexus-nav-link ${isActive ? "nexus-nav-link--active" : ""}`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span className="nav-text">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            padding: "var(--space-4)",
            borderTop: "1px solid var(--border-subtle)",
          }}
          className="nav-text"
        >
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              ← Switch Server
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Area */}
      <div className="nexus-main-area">
        <header className="nexus-header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>{currentGuild?.icon}</span>
            <span style={{ fontWeight: 600 }}>{currentGuild?.name}</span>
            <Badge
              status={
                currentGuild?.healthStatus === "healthy" ? "success" : "warning"
              }
            >
              {currentGuild?.healthStatus === "healthy"
                ? "Bot Connected"
                : "Degraded"}
            </Badge>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <Link href="/design-system">
              <Button variant="ghost" size="sm">
                Design System
              </Button>
            </Link>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                backgroundColor: "var(--surface-raised)",
                padding: "var(--space-1) var(--space-3)",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--text-xs)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "var(--status-success)",
                }}
              />
              <span className="tabular-nums">Staff (Administrator)</span>
            </div>
          </div>
        </header>

        <main className="nexus-page-content">{children}</main>
      </div>
    </div>
  );
}
