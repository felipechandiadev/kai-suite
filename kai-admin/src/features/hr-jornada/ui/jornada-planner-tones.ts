import type { CSSProperties } from "react";

/** Stable pastel HSL tones for planner blocks (readable over foreground text). */
const PALETTE: ReadonlyArray<{ h: number; s: number; l: number }> = [
  { h: 210, s: 62, l: 52 }, // blue
  { h: 162, s: 48, l: 42 }, // teal
  { h: 280, s: 42, l: 52 }, // violet
  { h: 28, s: 72, l: 50 }, // orange
  { h: 340, s: 55, l: 52 }, // rose
  { h: 85, s: 42, l: 42 }, // olive
  { h: 195, s: 55, l: 45 }, // cyan
  { h: 45, s: 70, l: 48 }, // amber
];

const NEUTRAL = { h: 220, s: 8, l: 48 };

function hsl(h: number, s: number, l: number, alpha: number): string {
  return `hsl(${h} ${s}% ${l}% / ${alpha})`;
}

/** Deterministic index into the planner palette. */
export function hashToToneIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % PALETTE.length;
}

function toneForId(id: string | null | undefined): {
  h: number;
  s: number;
  l: number;
} {
  if (!id) return NEUTRAL;
  return PALETTE[hashToToneIndex(id)] ?? NEUTRAL;
}

/** Background + border for a UL shift coverage block. */
export function shiftBlockStyle(
  laborUnitShiftId: string | null | undefined,
): CSSProperties {
  const t = toneForId(laborUnitShiftId);
  return {
    backgroundColor: hsl(t.h, t.s, t.l, laborUnitShiftId ? 0.18 : 0.1),
    borderColor: hsl(t.h, t.s, Math.max(28, t.l - 12), laborUnitShiftId ? 0.45 : 0.25),
  };
}

/** Left rail / collapsed label tint for a UL shift. */
export function shiftRailStyle(
  laborUnitShiftId: string | null | undefined,
): CSSProperties {
  const t = toneForId(laborUnitShiftId);
  return {
    backgroundColor: hsl(t.h, t.s, t.l, laborUnitShiftId ? 0.28 : 0.12),
  };
}

/** Left accent bar (+ soft fill) for a person card / table cell. */
export function personAccentStyle(employeeId: string): CSSProperties {
  const t = toneForId(employeeId);
  return {
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    borderLeftColor: hsl(t.h, t.s, t.l, 0.9),
    backgroundColor: hsl(t.h, t.s, t.l, 0.12),
  };
}

/** Soft fill for table cells keyed by UL shift (person accent applied separately). */
export function shiftCellFillStyle(
  laborUnitShiftId: string | null | undefined,
): CSSProperties {
  const t = toneForId(laborUnitShiftId);
  return {
    backgroundColor: hsl(t.h, t.s, t.l, laborUnitShiftId ? 0.16 : 0.08),
    borderColor: hsl(t.h, t.s, Math.max(28, t.l - 10), laborUnitShiftId ? 0.4 : 0.22),
  };
}
