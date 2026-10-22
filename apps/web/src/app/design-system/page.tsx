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
  FormGroup,
  Input,
  Select,
  Textarea,
  Dialog,
  TableContainer,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Alert,
  Skeleton,
  EmptyState,
  PermissionDenied,
} from "@nexus/ui";

export default function DesignSystemGalleryPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  const simulateLoading = () => {
    setBtnLoading(true);
    setTimeout(() => setBtnLoading(false), 1500);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--surface-page)",
        padding: "var(--space-10) var(--space-4)",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Navigation back */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-6)",
          }}
        >
          <div className="nexus-breadcrumbs" style={{ margin: 0 }}>
            <Link href="/">Home</Link>
            <span>/</span>
            <span style={{ color: "var(--text-primary)" }}>
              Design System Workbench
            </span>
          </div>
          <Link href="/">
            <Button variant="secondary" size="sm">
              ← Return to Servers
            </Button>
          </Link>
        </div>

        <div style={{ marginBottom: "var(--space-8)" }}>
          <h1
            style={{
              fontSize: "var(--text-3xl)",
              fontWeight: 700,
              margin: "0 0 var(--space-2) 0",
            }}
          >
            Nexus Design System (@nexus/ui)
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              margin: 0,
              fontSize: "var(--text-sm)",
            }}
          >
            State matrix, accessibility compliance (WCAG 2.2 AA), and semantic
            token gallery.
          </p>
        </div>

        {/* Section: Tokens & Palette */}
        <Card style={{ marginBottom: "var(--space-8)" }}>
          <CardHeader>
            <CardTitle>Semantic Surface & Status Tokens</CardTitle>
            <CardDescription>
              Strict CSS custom properties defined in tokens.css
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "var(--space-3)",
              }}
            >
              <div
                style={{
                  padding: "var(--space-3)",
                  backgroundColor: "var(--surface-page)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Surface Page
                </span>
              </div>
              <div
                style={{
                  padding: "var(--space-3)",
                  backgroundColor: "var(--surface-card)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Surface Card
                </span>
              </div>
              <div
                style={{
                  padding: "var(--space-3)",
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Surface Raised
                </span>
              </div>
              <div
                style={{
                  padding: "var(--space-3)",
                  backgroundColor: "var(--status-info-bg)",
                  border: "1px solid var(--status-info-border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--status-info)",
                  }}
                >
                  Status Info
                </span>
              </div>
              <div
                style={{
                  padding: "var(--space-3)",
                  backgroundColor: "var(--status-success-bg)",
                  border: "1px solid var(--status-success-border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--status-success)",
                  }}
                >
                  Status Success
                </span>
              </div>
              <div
                style={{
                  padding: "var(--space-3)",
                  backgroundColor: "var(--status-warning-bg)",
                  border: "1px solid var(--status-warning-border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--status-warning)",
                  }}
                >
                  Status Warning
                </span>
              </div>
              <div
                style={{
                  padding: "var(--space-3)",
                  backgroundColor: "var(--status-danger-bg)",
                  border: "1px solid var(--status-danger-border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--status-danger)",
                  }}
                >
                  Status Danger
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section: Buttons */}
        <Card style={{ marginBottom: "var(--space-8)" }}>
          <CardHeader>
            <CardTitle>Button Variants & States</CardTitle>
            <CardDescription>
              Primary, Secondary, Danger, Ghost, Loading, and Disabled states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-3)",
                alignItems: "center",
              }}
            >
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="ghost">Ghost</Button>
              <Button
                variant="primary"
                loading={btnLoading}
                onClick={simulateLoading}
              >
                {btnLoading ? "Saving..." : "Click to Load"}
              </Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="primary" size="lg">
                Large
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section: Badges */}
        <Card style={{ marginBottom: "var(--space-8)" }}>
          <CardHeader>
            <CardTitle>Status Badges & Non-Color Indicators</CardTitle>
            <CardDescription>
              Meets WCAG 2.2 AA non-color status indication requirement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-3)",
              }}
            >
              <Badge status="neutral">Draft (Neutral)</Badge>
              <Badge status="info">Synchronizing (Info)</Badge>
              <Badge status="success">Operational (Success)</Badge>
              <Badge status="warning">Degraded (Warning)</Badge>
              <Badge status="danger">Critical (Danger)</Badge>
              <Badge status="info" dot={false}>
                Badge Without Dot
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Section: Forms & Inputs */}
        <Card style={{ marginBottom: "var(--space-8)" }}>
          <CardHeader>
            <CardTitle>Forms & Inline Validation</CardTitle>
            <CardDescription>
              Persistent labels, required indicators, hints, and error alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="nexus-grid nexus-grid--cols-2"
              style={{ gap: "var(--space-4)" }}
            >
              <FormGroup
                label="Tournament Title"
                required
                hint="Publicly visible in announcement embeds"
              >
                <Input defaultValue="Challengers Cup 2026" />
              </FormGroup>

              <FormGroup
                label="Max Registered Teams"
                required
                error="Capacity must be an integer between 4 and 128"
              >
                <Input defaultValue="999" error />
              </FormGroup>

              <FormGroup label="Competition Format">
                <Select defaultValue="double_elim">
                  <option value="single_elim">Single Elimination</option>
                  <option value="double_elim">Double Elimination</option>
                  <option value="swiss">Swiss System</option>
                </Select>
              </FormGroup>

              <FormGroup label="Custom Rules & Guidelines">
                <Textarea defaultValue="Check-in starts 15 minutes before match time." />
              </FormGroup>
            </div>
          </CardContent>
        </Card>

        {/* Section: Skeletons & Loading */}
        <Card style={{ marginBottom: "var(--space-8)" }}>
          <CardHeader>
            <CardTitle>Loading Skeletons</CardTitle>
            <CardDescription>
              Wave animation placeholders for async state transitions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              <Skeleton width="40%" height="20px" />
              <Skeleton width="90%" height="16px" />
              <Skeleton width="75%" height="16px" />
            </div>
          </CardContent>
        </Card>

        {/* Section: Alerts & Dialogs */}
        <Card style={{ marginBottom: "var(--space-8)" }}>
          <CardHeader>
            <CardTitle>Alerts & Accessible Modal Dialogs</CardTitle>
            <CardDescription>
              Notification banners and keyboard-focusable dialogs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert status="info" title="System Notice">
              Weekly scheduled maintenance completes automatically with zero
              downtime.
            </Alert>
            <Alert status="danger" title="Safety Policy Violation">
              Action rejected: Discord permission was present but internal
              tenant grant was missing.
            </Alert>

            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open Test Modal Dialog
            </Button>
          </CardContent>
        </Card>

        {/* Section: Empty & Permission Denied States */}
        <div
          className="nexus-grid nexus-grid--cols-2"
          style={{ gap: "var(--space-6)", marginBottom: "var(--space-8)" }}
        >
          <EmptyState
            title="No Scrim Matches Scheduled"
            description="Lobbies will automatically appear here once captains initiate queue matchmaking."
            action={
              <Button variant="secondary" size="sm">
                Create Custom Match
              </Button>
            }
          />

          <PermissionDenied
            requiredCapability="moderation.purge"
            resourceName="Staff Log Channel"
            onBack={() => alert("Navigated back safely.")}
          />
        </div>
      </div>

      {/* Modal Dialog */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Accessible Modal Dialog"
        description="Traps keyboard focus and dismisses on Escape key or backdrop click."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Acknowledge
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>
          This component meets the WCAG 2.2 AA accessibility requirements with
          explicit role="dialog", aria-modal="true", and focus management.
        </p>
      </Dialog>
    </div>
  );
}
