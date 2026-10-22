import React from "react";
import { Button } from "./button";

export interface PermissionDeniedProps {
  requiredCapability: string;
  resourceName?: string;
  onBack?: () => void;
  className?: string;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  requiredCapability,
  resourceName,
  onBack,
  className = "",
}) => {
  return (
    <div className={`nexus-permission-denied ${className}`.trim()} role="alert">
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          backgroundColor: "var(--status-danger-bg)",
          color: "var(--status-danger)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          fontWeight: "bold",
          marginBottom: "var(--space-2)",
        }}
        aria-hidden="true"
      >
        ✕
      </div>
      <h3 className="nexus-permission-title">Permission Denied</h3>
      <p className="nexus-permission-desc">
        {resourceName
          ? `You do not have authorization to view or configure "${resourceName}".`
          : "You do not have authorization to access this operational resource."}
      </p>
      <div
        style={{
          display: "inline-block",
          backgroundColor: "var(--surface-sunken)",
          border: "1px solid var(--border-default)",
          padding: "var(--space-2) var(--space-4)",
          borderRadius: "var(--radius-sm)",
          fontSize: "var(--text-xs)",
          fontFamily: "var(--font-mono)",
          color: "var(--text-secondary)",
          marginBottom: "var(--space-6)",
        }}
      >
        Required Capability:{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          {requiredCapability}
        </strong>
      </div>
      <div>
        {onBack ? (
          <Button variant="secondary" onClick={onBack}>
            Return to Dashboard
          </Button>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
            }}
          >
            Please contact your server owner or a delegated staff member with
            capability management authority to request access.
          </p>
        )}
      </div>
    </div>
  );
};
