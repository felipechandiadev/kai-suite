import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "contained-primary" | "outlined" | "contained-danger";

const variantClass: Record<ButtonVariant, string> = {
  "contained-primary": "fs-button fs-button--contained-primary",
  outlined: "fs-button fs-button--outlined",
  "contained-danger": "fs-button fs-button--contained-danger",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Controles más pequeños para ventanas estrechas (p. ej. agente 400px). */
  density?: "default" | "compact";
};

const densityPad: Record<NonNullable<ButtonProps["density"]>, string> = {
  default: "px-3 py-2 text-sm",
  compact: "px-2.5 py-1.5 text-xs leading-tight",
};

export function Button({
  variant = "outlined",
  density = "default",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const base = variantClass[variant].replace(" px-3 py-2", "");
  const pad = densityPad[density];
  return <button type={type} className={`${base} ${pad} ${className}`.trim()} {...props} />;
}
