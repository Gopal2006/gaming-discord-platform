import React, { useEffect } from "react";
import { Button } from "./button";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className = "",
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="nexus-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nexus-dialog-title"
      aria-describedby={description ? "nexus-dialog-desc" : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`nexus-dialog-panel ${className}`.trim()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "var(--space-4)",
          }}
        >
          <div>
            <h2
              id="nexus-dialog-title"
              style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 600 }}
            >
              {title}
            </h2>
            {description && (
              <p
                id="nexus-dialog-desc"
                style={{
                  margin: "var(--space-1) 0 0 0",
                  color: "var(--text-muted)",
                  fontSize: "var(--text-xs)",
                }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "var(--text-base)",
              padding: "var(--space-1)",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: "var(--space-6)" }}>{children}</div>

        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "var(--space-3)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
