import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type TextFieldProps = {
  id: string;
  label: string;
  /** number | text textarea */
  as?: "input" | "textarea";
  inputType?: InputHTMLAttributes<HTMLInputElement>["type"];
  compact?: boolean;
  className?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id" | "className"
>;

export function TextField({
  id,
  label,
  as = "input",
  inputType = "text",
  compact = true,
  className = "",
  ...rest
}: TextFieldProps) {
  const inputClass = `fs-text-field__input${compact ? " fs-text-field__input--compact" : ""} ${className}`.trim();
  return (
    <div className="fs-form-group mb-4 last:mb-0">
      <label htmlFor={id} className="mb-0.5 block text-xs font-semibold text-foreground">
        {label}
      </label>
      {as === "textarea" ? (
        <textarea id={id} className={`${inputClass} min-h-24 resize-y py-2`} {...rest} />
      ) : (
        <input id={id} type={inputType} className={inputClass} {...rest} />
      )}
    </div>
  );
}
