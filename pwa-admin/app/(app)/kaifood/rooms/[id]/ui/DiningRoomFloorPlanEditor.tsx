"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  IconButton,
  NumberStepper,
  Select,
  TextField,
} from "@kai/ui";
import { saveDiningFloorPlanAction } from "@/features/kaifood-dining/actions/dining-room.action";
import type {
  DiningRoomListItem,
  DiningTableItem,
  TableShape,
} from "@/features/kaifood-dining/types/dining-room.types";

const GRID = 20;
const CANVAS_W = 800;
const CANVAS_H = 600;

function snap(n: number) {
  return Math.round(n / GRID) * GRID;
}

/** Tamaño del dibujo según capacidad (base @ 2 pax). */
export function sizeFromCapacity(
  capacity: number,
  shape: TableShape,
): { width: number; height: number } {
  const cap = Math.max(2, Math.min(20, Math.round(capacity) || 2));
  const scale = 1 + (cap - 2) * 0.12;
  if (shape === "CIRCLE") {
    const d = Math.min(200, snap(56 * scale));
    return { width: Math.max(GRID, d), height: Math.max(GRID, d) };
  }
  const width = Math.min(200, snap(72 * scale));
  const height = Math.min(160, snap(48 * scale));
  return { width: Math.max(GRID, width), height: Math.max(GRID, height) };
}

function clampPosition(x: number, y: number, width: number, height: number) {
  return {
    x: snap(Math.max(0, Math.min(CANVAS_W - width, x))),
    y: snap(Math.max(0, Math.min(CANVAS_H - height, y))),
  };
}

type Props = {
  room: DiningRoomListItem;
};

export function DiningRoomFloorPlanEditor({ room }: Props) {
  const initialTables = room.tables ?? [];
  const [tables, setTables] = useState<DiningTableItem[]>(initialTables);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dragRef = useRef<{ idx: number; offsetX: number; offsetY: number } | null>(null);

  const selected = selectedIdx != null ? tables[selectedIdx] : null;

  const addTable = (shape: TableShape) => {
    const n = tables.length + 1;
    const capacity = 4;
    const size = sizeFromCapacity(capacity, shape);
    const pos = clampPosition(
      100 + (n % 5) * 100,
      100 + Math.floor(n / 5) * 100,
      size.width,
      size.height,
    );
    setTables((prev) => [
      ...prev,
      {
        code: `M${n}`,
        label: `Mesa M${n}`,
        capacity,
        shape,
        ...pos,
        ...size,
        rotation: 0,
      },
    ]);
  };

  const updateSelected = (patch: Partial<DiningTableItem>) => {
    if (selectedIdx == null) return;
    setTables((prev) =>
      prev.map((t, i) => {
        if (i !== selectedIdx) return t;
        const next = { ...t, ...patch };
        const capacityChanged =
          patch.capacity != null && patch.capacity !== t.capacity;
        const shapeChanged = patch.shape != null && patch.shape !== t.shape;
        if (capacityChanged || shapeChanged) {
          const size = sizeFromCapacity(next.capacity, next.shape);
          const pos = clampPosition(next.x, next.y, size.width, size.height);
          return { ...next, ...size, ...pos };
        }
        return next;
      }),
    );
  };

  const onPointerDown = (idx: number, e: React.PointerEvent<SVGElement>) => {
    const t = tables[idx];
    const svg = (e.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    dragRef.current = { idx, offsetX: loc.x - t.x, offsetY: loc.y - t.y };
    setSelectedIdx(idx);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    setTables((prev) =>
      prev.map((t, i) => {
        if (i !== drag.idx) return t;
        const pos = clampPosition(
          loc.x - drag.offsetX,
          loc.y - drag.offsetY,
          t.width,
          t.height,
        );
        return { ...t, ...pos };
      }),
    );
  }, []);

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const floorPlan = {
      version: 1,
      width: CANVAS_W,
      height: CANVAS_H,
      grid: GRID,
      tables: tables.map((t) => ({ code: t.code, shape: t.shape })),
    };
    const result = await saveDiningFloorPlanAction(room.id, floorPlan, tables);
    setSaving(false);
    if (!result.success) {
      setSaveError(result.message ?? "Error al guardar.");
    }
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3"
      data-test-id="dining-room-floor-plan-editor"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/kaifood/rooms"
            className="shrink-0 text-sm text-muted-foreground hover:underline"
          >
            ← Salones
          </Link>
          <h1 className="min-w-0 truncate text-xl font-semibold text-foreground">
            {room.name}
          </h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <IconButton
            icon="Square"
            variant="action"
            size="md"
            ariaLabel="Agregar mesa rectangular"
            title="Mesa rectangular"
            disabled={saving}
            onClick={() => addTable("RECT")}
            data-test-id="dining-add-table-rect"
          />
          <IconButton
            icon="Circle"
            variant="action"
            size="md"
            ariaLabel="Agregar mesa redonda"
            title="Mesa redonda"
            disabled={saving}
            onClick={() => addTable("CIRCLE")}
            data-test-id="dining-add-table-circle"
          />
          <IconButton
            icon="Save"
            variant="primary"
            size="md"
            ariaLabel={saving ? "Guardando plano" : "Guardar plano"}
            title={saving ? "Guardando…" : "Guardar"}
            disabled={saving}
            isLoading={saving}
            onClick={() => void handleSave()}
            data-test-id="dining-floor-plan-save"
          />
        </div>
      </header>

      {saveError ? (
        <p className="shrink-0 text-sm text-red-600">{saveError}</p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted/20">
          <svg
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="h-full w-full touch-none"
            preserveAspectRatio="xMidYMid meet"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            data-test-id="dining-floor-plan-canvas"
          >
            <defs>
              <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${GRID} 0 L 0 0 0 ${GRID}`}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.08"
                />
              </pattern>
            </defs>
            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#grid)" />
            {tables.map((t, idx) => {
              const isSelected = idx === selectedIdx;
              const common = {
                onPointerDown: (e: React.PointerEvent<SVGElement>) =>
                  onPointerDown(idx, e),
                fill: isSelected
                  ? "var(--color-secondary)"
                  : "var(--color-muted-foreground)",
                fillOpacity: isSelected ? 0.35 : 0.2,
                stroke: isSelected
                  ? "var(--color-secondary)"
                  : "var(--color-muted-foreground)",
                strokeWidth: isSelected ? 2.5 : 2,
                cursor: "grab" as const,
              };
              return t.shape === "CIRCLE" ? (
                <g key={`${t.code}-${idx}`}>
                  <circle
                    cx={t.x + t.width / 2}
                    cy={t.y + t.height / 2}
                    r={t.width / 2}
                    {...common}
                  />
                  <text
                    x={t.x + t.width / 2}
                    y={t.y + t.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground pointer-events-none text-xs"
                  >
                    {t.code}
                  </text>
                </g>
              ) : (
                <g key={`${t.code}-${idx}`}>
                  <rect
                    x={t.x}
                    y={t.y}
                    width={t.width}
                    height={t.height}
                    rx={6}
                    {...common}
                  />
                  <text
                    x={t.x + t.width / 2}
                    y={t.y + t.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground pointer-events-none text-xs"
                  >
                    {t.code}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <aside
          className="flex w-full shrink-0 flex-col overflow-y-auto rounded-lg border border-border bg-background p-4 lg:w-72"
          data-test-id="dining-table-detail-aside"
        >
          <h3 className="mb-3 font-medium">
            {selected ? "Mesa seleccionada" : "Mesas"}
          </h3>
          <div className="flex flex-col gap-3">
            <Select
              label="Mesa"
              placeholder={tables.length === 0 ? "Sin mesas" : "Elegir mesa"}
              value={selectedIdx != null ? String(selectedIdx) : null}
              onChange={(id) => {
                if (id == null || id === "") {
                  setSelectedIdx(null);
                  return;
                }
                const idx = Number(id);
                setSelectedIdx(Number.isFinite(idx) ? idx : null);
              }}
              options={tables.map((t, i) => ({
                id: String(i),
                label: `${t.code} — ${t.label}`,
              }))}
              alwaysShowLabel
              disabled={tables.length === 0}
              data-test-id="dining-table-picker"
            />
            {selected ? (
              <>
                <TextField
                  label="Código"
                  value={selected.code}
                  onChange={(e) => updateSelected({ code: e.target.value })}
                />
                <TextField
                  label="Etiqueta"
                  value={selected.label}
                  onChange={(e) => updateSelected({ label: e.target.value })}
                />
                <NumberStepper
                  label="Capacidad"
                  value={selected.capacity}
                  onChange={(v) => updateSelected({ capacity: v })}
                  min={2}
                  max={20}
                  step={1}
                  allowFloat={false}
                  allowNegative={false}
                  data-test-id="dining-table-capacity"
                />
                <Select
                  label="Forma"
                  value={selected.shape}
                  onChange={(v) => updateSelected({ shape: v as TableShape })}
                  options={[
                    { id: "RECT", label: "Rectangular" },
                    { id: "CIRCLE", label: "Circular" },
                  ]}
                />
              </>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
