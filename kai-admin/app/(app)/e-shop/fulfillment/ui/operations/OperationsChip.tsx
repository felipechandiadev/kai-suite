"use client";

import type { ReactNode } from "react";

type ChipVariant = "default" | "success" | "warning" | "info";

const variantClasses: Record<ChipVariant, string> = {
  default: "bg-muted/80 text-foreground border border-border",
  success:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
  warning:
    "bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30",
  info: "bg-sky-500/10 text-sky-800 dark:text-sky-400 border border-sky-500/25",
};

export function OperationsChip({
  children,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  variant?: ChipVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
