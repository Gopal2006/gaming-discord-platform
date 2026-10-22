import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: "info" | "success" | "warning" | "danger" | "neutral";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  status = "neutral",
  dot = true,
  className = "",
  ...props
}) => {
  const statusClass = status !== "neutral" ? `nexus-badge--${status}` : "";

  return (
    <span
      className={`nexus-badge ${statusClass} ${className}`.trim()}
      {...props}
    >
      {dot && <span className="nexus-badge--dot" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};
