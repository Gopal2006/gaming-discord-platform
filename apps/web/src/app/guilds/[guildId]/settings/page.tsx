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
  Button,
  Input,
  Select,
  FormGroup,
  Alert,
  Dialog,
} from "@nexus/ui";
import { MOCK_GUILDS } from "../../../../lib/api";

export default function SettingsPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) || "123456789012345678";
  const guild = MOCK_GUILDS.find((g) => g.id === guildId) || MOCK_GUILDS[0];

  const [timezone, setTimezone] = useState("America/New_York");
  const [prefix, setPrefix] = useState("!");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const toggleEmergency = () => {
    setEmergencyActive(!emergencyActive);
    setEmergencyModalOpen(false);
  };

  return (
    <div>
      <div className="nexus-breadcrumbs">
        <Link href="/">Servers</Link>
        <span>/</span>
        <span>{guild?.name}</span>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>Settings</span>
      </div>

      <div className="nexus-page-header">
        <div>
          <h1 className="nexus-page-title">Guild Configuration</h1>
          <p className="nexus-page-desc">
            Manage operational defaults, regional timezone, and server emergency
            safety controls.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <Alert status="success" title="Settings Saved">
          Guild operational settings updated successfully.
        </Alert>
      )}

      {emergencyActive && (
        <Alert status="danger" title="EMERGENCY LOCKDOWN ACTIVE">
          All mutations, broadcasts, and automated worker jobs for this guild
          are suspended.
        </Alert>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
        }}
      >
        {/* Core Settings Form */}
        <Card>
          <form onSubmit={handleSave}>
            <CardHeader>
              <CardTitle>Operational Defaults</CardTitle>
              <CardDescription>
                Localization and legacy fallback command trigger.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="nexus-grid nexus-grid--cols-2"
                style={{ gap: "var(--space-4)" }}
              >
                <FormGroup
                  label="Server Timezone"
                  hint="Used for match scheduling and announcements"
                >
                  <Select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="America/New_York">
                      Eastern Time (US / Canada - UTC-5)
                    </option>
                    <option value="America/Los_Angeles">
                      Pacific Time (US / Canada - UTC-8)
                    </option>
                    <option value="Europe/London">London / GMT (UTC+0)</option>
                    <option value="Europe/Berlin">
                      Central European Time (UTC+1)
                    </option>
                    <option value="Asia/Tokyo">
                      Japan Standard Time (UTC+9)
                    </option>
                  </Select>
                </FormGroup>

                <FormGroup
                  label="Fallback Command Prefix"
                  hint="Used for legacy text commands"
                >
                  <Input
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    maxLength={3}
                  />
                </FormGroup>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Emergency Stop Safety Control */}
        <Card style={{ borderColor: "var(--status-danger-border)" }}>
          <CardHeader>
            <CardTitle style={{ color: "var(--status-danger)" }}>
              Emergency Stop Killswitch
            </CardTitle>
            <CardDescription>
              Immediately halt all bot mutations, automated actions, and
              tournament workflows in case of an incident.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p
              style={{
                margin: 0,
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
              }}
            >
              Activating the emergency stop instructs the server-side
              ActionPolicyEngine to reject all incoming mutations with 403
              EMERGENCY_HALT and pauses the outbox dispatcher for this guild.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant="danger"
              onClick={() => setEmergencyModalOpen(true)}
            >
              {emergencyActive
                ? "Deactivate Emergency Stop"
                : "Activate Emergency Stop"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Confirmation Modal */}
      <Dialog
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        title={
          emergencyActive
            ? "Resume Normal Operations?"
            : "ACTIVATE EMERGENCY LOCKDOWN?"
        }
        description="Requires server owner authorization."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setEmergencyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={toggleEmergency}>
              {emergencyActive ? "Resume Operations" : "Confirm Lockdown"}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>
          {emergencyActive
            ? "Are you sure you want to lift the emergency stop? Workers and bot mutations will resume processing queued jobs."
            : "Are you sure you want to trigger emergency lockdown? All automated tournaments, bot purge actions, and announcements will immediately halt."}
        </p>
      </Dialog>
    </div>
  );
}
