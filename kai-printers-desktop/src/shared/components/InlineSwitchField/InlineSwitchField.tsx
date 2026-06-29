import type { ReactNode } from "react";
import Switch from "../Switch";

type InlineSwitchFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Acciones al final de la fila (p. ej. botón de prueba). */
  trailing?: ReactNode;
  className?: string;
  ["data-test-id"]?: string;
};

export function InlineSwitchField({
  label,
  checked,
  onChange,
  disabled = false,
  trailing,
  className = "",
  ...props
}: InlineSwitchFieldProps) {
  return (
    <div className={`fs-text-field fs-text-field--inline w-full min-w-0 ${className}`.trim()}>
      <div
        className={`fs-text-field__inline-shell${disabled ? " fs-text-field__inline-shell--disabled" : ""}`}
      >
        <div className="fs-text-field__inline-body">
          <span className="fs-text-field__inline-label">{label}</span>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 px-2">
            <Switch
              density="compact"
              checked={checked}
              onChange={onChange}
              disabled={disabled}
              {...props}
            />
            {trailing}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InlineSwitchField;
