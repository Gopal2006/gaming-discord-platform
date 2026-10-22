import React from "react";

export interface AlertProps {
  status?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  status = "info",
  title,
  children,
  action,
  className = "",
}) => {
  const getStatusBorder = () => {
    switch (status) {
      case "success":
        return "var(--status-success-border)";
      case "warning":
        return "var(--status-warning-border)";
      case "danger":
        return "var(--status-danger-border)";
      default:
        return "var(--status-info-border)";
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case "success":
        return "var(--status-success-bg)";
      case "warning":
        return "var(--status-warning-bg)";
      case "danger":
        return "var(--status-danger-bg)";
      default:
        return "var(--status-info-bg)";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "var(--status-success)";
      case "warning":
        return "var(--status-warning)";
      case "danger":
        return "var(--status-danger)";
      default:
        return "var(--status-info)";
    }
  };

  return (
    <div
      role="alert"
      className={`nexus-alert ${className}`.trim()}
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${getStatusBorder()}`,
        backgroundColor: getStatusBg(),
        color: "var(--text-primary)",
        fontSize: "var(--text-sm)",
        marginBottom: "var(--space-4)",
      }}
    >
      <div style={{ flex: 1 }}>
        {title && (
          <div
            style={{
              fontWeight: 600,
              color: getStatusColor(),
              marginBottom: "var(--space-1)",
            }}
          >
            {title}
          </div>
        )}
        <div>{children}</div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
