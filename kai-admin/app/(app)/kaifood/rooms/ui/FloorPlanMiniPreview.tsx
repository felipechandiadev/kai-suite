"use client";

import { useId } from "react";
import type { DiningTableItem } from "@/features/kaifood-dining/types/dining-room.types";
import {
  FLOOR_PLAN_CANVAS_H,
  FLOOR_PLAN_CANVAS_W,
  FLOOR_PLAN_GRID,
} from "@/features/kaifood-dining/ui/floor-plan-canvas";

type Props = {
  tables: DiningTableItem[];
  className?: string;
};

function tableTransform(t: DiningTableItem): string | undefined {
  const rot = Number(t.rotation) || 0;
  if (!rot) return undefined;
  const cx = t.x + t.width / 2;
  const cy = t.y + t.height / 2;
  return `rotate(${rot} ${cx} ${cy})`;
}

/** Read-only SVG thumbnail of a dining room floor plan. */
export function FloorPlanMiniPreview({ tables, className }: Props) {
  const uid = useId().replace(/:/g, "");

  if (tables.length === 0) {
    return (
      <div
        className={[
          "flex aspect-4/3 w-full items-center justify-center rounded-t-lg bg-muted/40 text-sm text-muted-foreground",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        data-test-id="dining-floor-plan-empty"
      >
        Sin plano aún
      </div>
    );
  }

  const patternId = `dining-mini-grid-${uid}`;

  return (
    <div
      className={[
        "aspect-4/3 w-full overflow-hidden rounded-t-lg bg-muted/20",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-test-id="dining-floor-plan-preview"
    >
      <svg
        viewBox={`0 0 ${FLOOR_PLAN_CANVAS_W} ${FLOOR_PLAN_CANVAS_H}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <pattern
            id={patternId}
            width={FLOOR_PLAN_GRID}
            height={FLOOR_PLAN_GRID}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${FLOOR_PLAN_GRID} 0 L 0 0 0 ${FLOOR_PLAN_GRID}`}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.08"
            />
          </pattern>
        </defs>
        <rect
          width={FLOOR_PLAN_CANVAS_W}
          height={FLOOR_PLAN_CANVAS_H}
          fill={`url(#${patternId})`}
        />
        {tables.map((t, idx) => {
          const transform = tableTransform(t);
          const labelX = t.x + t.width / 2;
          const labelY = t.y + t.height / 2;
          return (
            <g key={`${t.code}-${idx}`} transform={transform}>
              {t.shape === "CIRCLE" ? (
                <circle
                  cx={labelX}
                  cy={labelY}
                  r={t.width / 2}
                  fill="var(--color-muted-foreground)"
                  fillOpacity={0.22}
                  stroke="var(--color-muted-foreground)"
                  strokeWidth={2}
                />
              ) : (
                <rect
                  x={t.x}
                  y={t.y}
                  width={t.width}
                  height={t.height}
                  rx={6}
                  fill="var(--color-muted-foreground)"
                  fillOpacity={0.22}
                  stroke="var(--color-muted-foreground)"
                  strokeWidth={2}
                />
              )}
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground"
                fontSize={14}
                fontWeight={600}
              >
                {t.code}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
