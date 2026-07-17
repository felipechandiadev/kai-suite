"use client";

import { useCallback, useRef, useState } from "react";
import { Button, Select, TextField } from "@kai/ui";
import { saveDiningFloorPlanAction } from "@/features/kaifood-dining/actions/dining-room.action";
import type { DiningRoomListItem, DiningTableItem, TableShape } from "@/features/kaifood-dining/types/dining-room.types";

const GRID = 20;
const CANVAS_W = 800;
const CANVAS_H = 600;

function snap(n: number) {
  return Math.round(n / GRID) * GRID;
}

type Props = {
  room: DiningRoomListItem;
};

export function DiningRoomFloorPlanEditor({ room }: Props) {
  const initialTables = room.tables ?? [];
  const [tables, setTables] = useState<DiningTableItem[]>(initialTables);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dragRef = useRef<{ idx: number; offsetX: number; offsetY: number } | null>(null);

  const selected = selectedIdx != null ? tables[selectedIdx] : null;

  const addTable = (shape: TableShape) => {
    const n = tables.length + 1;
    setTables((prev) => [
      ...prev,
      {
        code: `M${n}`,
        label: `Mesa M${n}`,
        capacity: 4,
        shape,
        x: snap(100 + (n % 5) * 100),
        y: snap(100 + Math.floor(n / 5) * 100),
        width: shape === "CIRCLE" ? 72 : 96,
        height: shape === "CIRCLE" ? 72 : 64,
        rotation: 0,
      },
    ]);
  };

  const updateSelected = (patch: Partial<DiningTableItem>) => {
    if (selectedIdx == null) return;
    setTables((prev) =>
      prev.map((t, i) => (i === selectedIdx ? { ...t, ...patch } : t)),
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
      prev.map((t, i) =>
        i === drag.idx
          ? {
              ...t,
              x: snap(Math.max(0, Math.min(CANVAS_W - t.width, loc.x - drag.offsetX))),
              y: snap(Math.max(0, Math.min(CANVAS_H - t.height, loc.y - drag.offsetY))),
            }
          : t,
      ),
    );
  }, []);

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const floorPlan = {
      version: 1,
      width: CANVAS_W,
      height: CANVAS_H,
      grid: GRID,
      tables: tables.map((t) => ({ code: t.code, shape: t.shape })),
    };
    const result = await saveDiningFloorPlanAction(room.id, floorPlan, tables);
    setSaving(false);
    setMessage(result.success ? "Plano guardado." : (result.message ?? "Error al guardar."));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1">
        <div className="flex gap-2 mb-3">
          <Button variant="outlined" onClick={() => addTable("RECT")}>
            + Mesa rectangular
          </Button>
          <Button variant="outlined" onClick={() => addTable("CIRCLE")}>
            + Mesa circular
          </Button>
          <Button variant="contained" disabled={saving} onClick={handleSave}>
            Guardar plano
          </Button>
        </div>
        {message ? <p className="text-sm mb-2">{message}</p> : null}
        <svg
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          className="w-full max-w-full border border-border rounded-lg bg-muted/20"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <defs>
            <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="currentColor" strokeOpacity="0.08" />
            </pattern>
          </defs>
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#grid)" />
          {tables.map((t, idx) => {
            const isSelected = idx === selectedIdx;
            const common = {
              onPointerDown: (e: React.PointerEvent<SVGElement>) => onPointerDown(idx, e),
              fill: isSelected ? "var(--color-secondary)" : "var(--color-primary)",
              fillOpacity: 0.25,
              stroke: isSelected ? "var(--color-secondary)" : "var(--color-primary)",
              strokeWidth: 2,
              cursor: "grab",
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
                  className="text-xs fill-foreground pointer-events-none"
                >
                  {t.code}
                </text>
              </g>
            ) : (
              <g key={`${t.code}-${idx}`}>
                <rect x={t.x} y={t.y} width={t.width} height={t.height} rx={6} {...common} />
                <text
                  x={t.x + t.width / 2}
                  y={t.y + t.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-foreground pointer-events-none"
                >
                  {t.code}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <aside className="w-full lg:w-72 shrink-0 border border-border rounded-lg p-4">
        <h3 className="font-medium mb-3">Mesa seleccionada</h3>
        {selected ? (
          <div className="flex flex-col gap-3">
            <TextField label="Código" value={selected.code} onChange={(e) => updateSelected({ code: e.target.value })} />
            <TextField label="Etiqueta" value={selected.label} onChange={(e) => updateSelected({ label: e.target.value })} />
            <TextField
              label="Capacidad"
              type="number"
              value={String(selected.capacity)}
              onChange={(e) => updateSelected({ capacity: Number(e.target.value) || 2 })}
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
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Selecciona una mesa en el plano.</p>
        )}
        <h3 className="font-medium mt-6 mb-2">Mesas ({tables.length})</h3>
        <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
          {tables.map((t, i) => (
            <li key={`${t.code}-${i}`}>
              <button type="button" className="hover:underline" onClick={() => setSelectedIdx(i)}>
                {t.code} — {t.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
