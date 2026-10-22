import React, { useId } from "react";

export interface FormGroupProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  label,
  required,
  hint,
  error,
  htmlFor,
  children,
  className = "",
}) => {
  return (
    <div className={`nexus-form-group ${className}`.trim()}>
      <label
        htmlFor={htmlFor}
        className={`nexus-form-label ${required ? "nexus-form-label--required" : ""}`.trim()}
      >
        {label}
      </label>
      {children}
      {hint && !error && <span className="nexus-form-hint">{hint}</span>}
      {error && (
        <span className="nexus-form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        className={`nexus-input ${error ? "nexus-input--error" : ""} ${className}`.trim()}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className = "", id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? "true" : undefined}
        className={`nexus-select ${error ? "nexus-input--error" : ""} ${className}`.trim()}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;

    return (
      <textarea
        ref={ref}
        id={textareaId}
        aria-invalid={error ? "true" : undefined}
        className={`nexus-textarea ${error ? "nexus-input--error" : ""} ${className}`.trim()}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
