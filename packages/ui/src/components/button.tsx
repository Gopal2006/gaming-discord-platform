import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  ...props
}) => {
  const sizeClass =
    size === "sm" ? "nexus-btn--sm" : size === "lg" ? "nexus-btn--lg" : "";
  const variantClass = `nexus-btn--${variant}`;

  return (
    <button
      className={`nexus-btn ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="nexus-spinner"
            style={{
              width: 14,
              height: 14,
              border: "2px solid currentColor",
              borderRightColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              animation: "nexus-spin 0.6s linear infinite",
            }}
            aria-hidden="true"
          />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {leftIcon && (
            <span className="nexus-btn-icon" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <span>{children}</span>
          {rightIcon && (
            <span className="nexus-btn-icon" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
};
