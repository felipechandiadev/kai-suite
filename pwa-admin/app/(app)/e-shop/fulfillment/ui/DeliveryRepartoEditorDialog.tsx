"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Dialog, TextField, timeToMinutes } from "@kai/ui";
import type {
  DeliveryOccurrenceRow,
  DeliveryZoneRow,
} from "@/features/e-shop-delivery/types/delivery.types";
import { zoneColor } from "./delivery-zones-map.constants";

export type RepartoEditorDraft = {
  name: string;
  occurrenceDate: string;
  departureTime: string;
  orderCutoffTime: string;
  zoneIds: string[];
  maxOrders: string;
};

type DeliveryRepartoEditorDialogProps = {
  open: boolean;
  isNew: boolean;
  draft: RepartoEditorDraft;
  zones: DeliveryZoneRow[];
  saving?: boolean;
  error?: string | null;
  onDraftChange: (draft: RepartoEditorDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onRequestCancelOccurrence?: () => void;
  canCancelOccurrence?: boolean;
};

export function occurrenceToDraft(
  occurrence: DeliveryOccurrenceRow,
): RepartoEditorDraft {
  return {
    name: occurrence.name,
    occurrenceDate: occurrence.occurrenceDate,
    departureTime: occurrence.departureTime.slice(0, 5),
    orderCutoffTime: occurrence.orderCutoffTime.slice(0, 5),
    zoneIds: occurrence.zoneIds.length
      ? occurrence.zoneIds
      : occurrence.zones.map((z) => z.id),
    maxOrders: occurrence.maxOrders != null ? String(occurrence.maxOrders) : "",
  };
}

export function defaultRepartoDraft(
  date: string,
  departureTime = "09:00",
): RepartoEditorDraft {
  const [h] = departureTime.split(":").map(Number);
  const cutoffHour = Math.max(0, (h ?? 9) - 1);
  return {
    name: "",
    occurrenceDate: date,
    departureTime,
    orderCutoffTime: `${String(cutoffHour).padStart(2, "0")}:30`,
    zoneIds: [],
    maxOrders: "",
  };
}

export function DeliveryRepartoEditorDialog({
  open,
  isNew,
  draft,
  zones,
  saving = false,
  error = null,
  onDraftChange,
  onSave,
  onCancel,
  onRequestCancelOccurrence,
  canCancelOccurrence = false,
}: DeliveryRepartoEditorDialogProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setLocalError(null);
  }, [open]);

  const activeZones = zones.filter((z) => z.isActive);

  const toggleZone = (zoneId: string) => {
    const has = draft.zoneIds.includes(zoneId);
    onDraftChange({
      ...draft,
      zoneIds: has
        ? draft.zoneIds.filter((id) => id !== zoneId)
        : [...draft.zoneIds, zoneId],
    });
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      setLocalError("El nombre es obligatorio.");
      return;
    }
    if (draft.zoneIds.length === 0) {
      setLocalError("Selecciona al menos una zona.");
      return;
    }
    if (timeToMinutes(draft.orderCutoffTime) >= timeToMinutes(draft.departureTime)) {
      setLocalError("El cut-off debe ser anterior a la hora de salida.");
      return;
    }
    setLocalError(null);
    onSave();
  };

  const displayError = localError ?? error;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={isNew ? "Crear reparto" : "Actualizar reparto"}
      size="md"
      scroll="paper"
      actionsJustify="end"
      data-test-id="delivery-reparto-editor"
      alertArea={
        displayError ? <Alert variant="error">{displayError}</Alert> : null
      }
      actions={
        <>
          {!isNew && canCancelOccurrence && onRequestCancelOccurrence ? (
            <Button
              type="button"
              variant="danger"
              onClick={onRequestCancelOccurrence}
              disabled={saving}
              className="mr-auto"
            >
              Cancelar reparto
            </Button>
          ) : (
            <span className="mr-auto" />
          )}
          <Button type="button" variant="outlinedSecondary" onClick={onCancel} disabled={saving}>
            Cerrar
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : isNew ? "Crear reparto" : "Actualizar reparto"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField
          label="Nombre"
          placeholder="Nombre"
          value={draft.name}
          onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Fecha"
            placeholder="Fecha"
            type="date"
            value={draft.occurrenceDate}
            onChange={(e) =>
              onDraftChange({ ...draft, occurrenceDate: e.target.value })
            }
          />
          <TextField
            label="Hora salida"
            placeholder="Hora salida"
            type="time"
            value={draft.departureTime}
            onChange={(e) =>
              onDraftChange({ ...draft, departureTime: e.target.value })
            }
          />
          <TextField
            label="Corte de pedidos"
            placeholder="Corte de pedidos"
            type="time"
            value={draft.orderCutoffTime}
            onChange={(e) =>
              onDraftChange({ ...draft, orderCutoffTime: e.target.value })
            }
          />
        </div>
        <TextField
          label="Cupos máximos"
          placeholder="Cupos máximos"
          type="number"
          value={draft.maxOrders}
          onChange={(e) => onDraftChange({ ...draft, maxOrders: e.target.value })}
          helperText="Déjalo vacío para sin límite"
        />
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Zonas atendidas</p>
          {activeZones.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay zonas activas. Configúralas en la pestaña Zonas.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {activeZones.map((zone, index) => {
                const checked = draft.zoneIds.includes(zone.id);
                return (
                  <label
                    key={zone.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      checked
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleZone(zone.id)}
                      className="accent-primary"
                    />
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: zoneColor(index) }}
                      aria-hidden
                    />
                    <span className="truncate">{zone.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
