import React from "react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div className={`nexus-empty-state ${className}`.trim()}>
      {icon && (
        <div
          style={{
            fontSize: "2rem",
            color: "var(--text-muted)",
            marginBottom: "var(--space-2)",
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h4 className="nexus-empty-title">{title}</h4>
      <p className="nexus-empty-desc">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
