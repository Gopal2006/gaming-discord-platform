"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  TableContainer,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge,
  Button,
  Input,
  Select,
  Dialog,
  EmptyState,
} from "@nexus/ui";
import {
  MOCK_AUDIT_LOGS,
  MOCK_GUILDS,
  AuditEventItem,
} from "../../../../lib/api";

export default function AuditLogPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) || "123456789012345678";
  const guild = MOCK_GUILDS.find((g) => g.id === guildId) || MOCK_GUILDS[0];

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<AuditEventItem | null>(
    null,
  );

  const filteredLogs = MOCK_AUDIT_LOGS.filter((item) => {
    const matchesSearch =
      item.action.toLowerCase().includes(search.toLowerCase()) ||
      item.actorTag.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || item.action.startsWith(filterCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="nexus-breadcrumbs">
        <Link href="/">Servers</Link>
        <span>/</span>
        <span>{guild?.name}</span>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>Audit Log</span>
      </div>

      <div className="nexus-page-header">
        <div>
          <h1 className="nexus-page-title">Action Audit Trail</h1>
          <p className="nexus-page-desc">
            Immutable record of mutations, setup reconciliations, and security
            policy rejections.
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        <Input
          placeholder="Filter by action or actor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <Select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ maxWidth: 200 }}
        >
          <option value="all">All Actions</option>
          <option value="tournament">Tournaments</option>
          <option value="guild">Guild Setup</option>
          <option value="announcement">Announcements</option>
          <option value="moderation">Moderation</option>
          <option value="auth">Auth & Capabilities</option>
        </Select>
      </div>

      {/* Data Table */}
      {filteredLogs.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Result</TableHead>
                <TableHead style={{ textAlign: "right" }}>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell
                    style={{ color: "var(--text-muted)" }}
                    className="tabular-nums"
                  >
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell
                    style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}
                  >
                    {log.action}
                  </TableCell>
                  <TableCell>{log.actorTag}</TableCell>
                  <TableCell>
                    <Badge
                      status={log.status === "success" ? "success" : "danger"}
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell style={{ textAlign: "right" }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEvent(log)}
                    >
                      Inspect
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState
          title="No Audit Records Found"
          description="No recent events match the specified action or search filter."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setFilterCategory("all");
              }}
            >
              Reset Filters
            </Button>
          }
        />
      )}

      {/* Inspect Modal */}
      {selectedEvent && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          title={`Audit Record: ${selectedEvent.action}`}
          description={`ID: ${selectedEvent.id} • Triggered by ${selectedEvent.actorTag}`}
          footer={
            <Button variant="secondary" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
          }
        >
          <div>
            <div
              style={{
                marginBottom: "var(--space-3)",
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
              }}
            >
              <strong>Timestamp: </strong>
              <span className="tabular-nums">{selectedEvent.timestamp}</span>
            </div>
            <div
              style={{
                marginBottom: "var(--space-3)",
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
              }}
            >
              <strong>Actor ID: </strong>
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--accent-primary)",
                }}
              >
                {selectedEvent.actorId}
              </code>
            </div>
            <div
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                marginBottom: "var(--space-1)",
              }}
            >
              Payload / Mutation Metadata:
            </div>
            <pre
              style={{
                backgroundColor: "var(--surface-sunken)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-primary)",
                overflowX: "auto",
                margin: 0,
              }}
            >
              {JSON.stringify(selectedEvent.details, null, 2)}
            </pre>
          </div>
        </Dialog>
      )}
    </div>
  );
}
