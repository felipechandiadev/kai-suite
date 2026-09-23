import type { CSSProperties } from "react";

export const rechartsTooltipContentStyle: CSSProperties = {
  borderRadius: 10,
  border: "1px solid var(--color-border, #c1c1c2)",
  backgroundColor: "var(--color-background, #ffffff)",
  color: "var(--color-foreground, #131615)",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
  padding: "8px 12px",
};

export const rechartsTooltipWrapperStyle: CSSProperties = {
  zIndex: 1000,
  pointerEvents: "none",
};

/** Cursor desactivado: evita recuadros al hacer clic; el tooltip sigue en hover. */
export const rechartsChartCursor = false as const;
