/** Estilo outlined alineado a `fs-button--outlined` del POS/admin. */
export function printOutlinedToggleButtonClass(active: boolean, disabled = false): string {
  const base =
    "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm";
  const state = active
    ? "border-foreground bg-transparent text-foreground shadow-sm"
    : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground";
  const dis = disabled ? "cursor-not-allowed opacity-60" : "";
  return `${base} ${state} ${dis}`.trim();
}

export const PRINT_OUTLINED_ACTION_LINK_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-foreground bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:bg-accent hover:text-background";
