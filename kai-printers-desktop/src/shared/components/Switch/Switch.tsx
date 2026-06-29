import React, { type CSSProperties, type KeyboardEvent } from "react";

import "./switch.css";

export type SwitchOptionLabels = {
  off: string;
  on: string;
};

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  labelPosition?: "left" | "right";
  optionLabels?: SwitchOptionLabels;
  disabled?: boolean;
  /** `compact`: track más pequeño, sin margen superior (p. ej. dentro de TextField inline). */
  density?: "default" | "compact";
  className?: string;
  ["data-test-id"]?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked = false,
  onChange,
  label,
  labelPosition = "left",
  optionLabels,
  disabled = false,
  density = "default",
  className = "",
  ...props
}) => {
  const isCompact = density === "compact";

  const setChecked = (next: boolean) => {
    if (disabled || next === checked) {
      return;
    }
    onChange?.(next);
  };

  const toggle = () => setChecked(!checked);

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

  const labelBase = isCompact
    ? "fs-switch__label text-foreground"
    : "text-sm font-medium leading-normal";
  const labelMuted = isCompact ? "fs-switch__label" : "text-muted";
  const optionClass = (active: boolean) =>
    `${labelBase} transition-colors ${disabled ? "opacity-50" : ""} ${
      active ? (isCompact ? "" : "text-foreground") : labelMuted
    } ${disabled ? "" : "cursor-pointer"}`;

  const thumbPrimary = Boolean(optionLabels);
  const thumbStyle: CSSProperties = disabled
    ? {
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-neutral)",
      }
    : thumbPrimary || checked
      ? {
          borderColor: "var(--color-primary)",
          backgroundColor: "var(--color-primary)",
        }
      : {
          borderColor: "var(--color-secondary)",
          backgroundColor: "var(--color-background, #fff)",
        };

  const trackClass = [
    "fs-switch__track",
    isCompact ? "fs-switch__track--compact" : "",
    checked ? "fs-switch__track--checked" : "",
    disabled ? "fs-switch__track--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const track = (
    <span
      className={trackClass}
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      <span className="fs-switch__thumb" style={thumbStyle} />
    </span>
  );

  if (optionLabels) {
    return (
      <div
        className={`flex items-center justify-between gap-3 ${disabled ? "cursor-not-allowed" : ""} ${className}`.trim()}
        data-test-id={props["data-test-id"] || "switch-dual-root"}
        role="group"
        aria-label={`${optionLabels.off} o ${optionLabels.on}`}
      >
        <button
          type="button"
          disabled={disabled}
          className={`border-0 bg-transparent p-0 ${optionClass(!checked)}`}
          onClick={() => setChecked(false)}
          aria-pressed={!checked}
        >
          {optionLabels.off}
        </button>
        {track}
        <button
          type="button"
          disabled={disabled}
          className={`border-0 bg-transparent p-0 ${optionClass(checked)}`}
          onClick={() => setChecked(true)}
          aria-pressed={checked}
        >
          {optionLabels.on}
        </button>
      </div>
    );
  }

  const rootClass = [
    "fs-switch__root",
    isCompact ? "fs-switch__root--compact" : "",
    disabled ? "fs-switch__root--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={rootClass} data-test-id={props["data-test-id"] || "switch-root"}>
      {labelPosition === "left" && label ? (
        <span className={`${labelBase} ${disabled ? "opacity-50" : ""}`}>{label}</span>
      ) : null}
      {track}
      {labelPosition === "right" && label ? (
        <span className={`${labelBase} ${disabled ? "opacity-50" : ""}`}>{label}</span>
      ) : null}
    </label>
  );
};

export default Switch;
