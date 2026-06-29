import type { LucideIcon } from "lucide-react";
import { ChevronDown, FolderOpen, Inbox, Network, Pencil, Plus, Power, Printer, RefreshCw, Save, Scissors, Trash2, X } from "lucide-react";
import type { ButtonHTMLAttributes, MouseEventHandler } from "react";

import "./icon-button.css";

/**
 * Subconjunto de lucide usado en kai-printers-desktop (evita importar todo lucide-react).
 */
const ICONS = {
  ChevronDown,
  FolderOpen,
  Inbox,
  Network,
  Pencil,
  Plus,
  Power,
  Printer,
  RefreshCw,
  Save,
  Scissors,
  Trash2,
  X,
} as const satisfies Record<string, LucideIcon>;

type IconName = keyof typeof ICONS;

type IconButtonSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  variant?: "containedPrimary" | "containedSecondary" | "text" | "basic" | "basicSecondary" | "outlined" | "ghost";
  size?: IconButtonSize;
  strokeWidth?: number;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
}

const variantClassNames: Record<NonNullable<IconButtonProps["variant"]>, string> = {
  containedPrimary: "fs-icon-button fs-icon-button--contained-primary",
  containedSecondary: "fs-icon-button fs-icon-button--contained-secondary",
  text: "fs-icon-button fs-icon-button--text",
  basic: "fs-icon-button fs-icon-button--basic",
  basicSecondary: "fs-icon-button fs-icon-button--basic-secondary",
  outlined: "fs-icon-button fs-icon-button--outlined",
  ghost: "fs-icon-button fs-icon-button--ghost",
};

const sizeMap: Record<Exclude<IconButtonSize, number>, string> = {
  xs: "w-5 h-5",
  sm: "w-7 h-7",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-14 h-14",
};

const iconSizeMap: Record<Exclude<IconButtonSize, number>, number> = {
  xs: 16,
  sm: 18,
  md: 24,
  lg: 28,
  xl: 32,
};

const IconButton = ({
  icon,
  variant = "containedPrimary",
  size = "md",
  strokeWidth = 2,
  disabled = false,
  isLoading = false,
  className = "",
  onClick,
  ariaLabel,
  type = "button",
  ...props
}: IconButtonProps) => {
  const sizeClass = typeof size === "number" ? "" : sizeMap[size] || sizeMap.md;
  const iconSize = typeof size === "number" ? size : iconSizeMap[size] || 24;
  const effectiveDisabled = disabled || isLoading;
  const IconComponent = ICONS[icon];

  return (
    <button
      type={type}
      className={`${variantClassNames[variant] ?? variantClassNames.containedPrimary} inline-flex items-center justify-center ${sizeClass} ${
        effectiveDisabled ? "opacity-50" : ""
      } ${className}`.trim()}
      data-test-id="icon-button-root"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={effectiveDisabled}
      {...props}
    >
      <IconComponent
        size={iconSize}
        strokeWidth={strokeWidth}
        className={`select-none ${isLoading ? "animate-spin" : ""}`}
        aria-hidden
      />
    </button>
  );
};

export default IconButton;
