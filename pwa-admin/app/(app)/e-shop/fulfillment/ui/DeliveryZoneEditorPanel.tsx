"use client";

import { useState } from "react";
import { Alert, Button, Switch, TextField } from "@kai/ui";
import type { GeoJsonPolygon } from "@/features/e-shop-delivery/types/delivery.types";

export type ZoneEditorDraft = {
  name: string;
  shippingFee: number;
  isActive: boolean;
};

type DeliveryZoneEditorPanelProps = {
  open: boolean;
  isNew: boolean;
  draft: ZoneEditorDraft;
  geometry: GeoJsonPolygon | null;
  saving?: boolean;
  error?: string | null;
  onDraftChange: (draft: ZoneEditorDraft) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function DeliveryZoneEditorPanel({
  open,
  isNew,
  draft,
  geometry,
  saving = false,
  error = null,
  onDraftChange,
  onSave,
  onCancel,
}: DeliveryZoneEditorPanelProps) {
  // Se reinicia al remount (key en el workspace: new / zoneId).
  const [feeInput, setFeeInput] = useState(String(draft.shippingFee));

  if (!open) return null;

  const geometryValid = geometry != null;
  const canSave = draft.name.trim().length > 0 && geometryValid && !saving;

  return (
    <div
      className="mt-4 rounded-xl border border-border bg-card p-4"
      data-test-id="delivery-zone-editor"
    >
      <h3 className="mb-3 font-medium">
        {isNew ? "Nueva zona de reparto" : "Editar zona"}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Nombre"
          value={draft.name}
          onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
          placeholder="Ej. Talca Centro"
          data-test-id="delivery-zone-name"
        />
        <TextField
          label="Tarifa (CLP)"
          type="currency"
          currencySymbol="$"
          startSymbol="$"
          value={feeInput}
          onChange={(e) => {
            const raw = e.target.value;
            setFeeInput(raw);
            const parsed = raw === "" ? 0 : Number.parseInt(raw, 10);
            onDraftChange({
              ...draft,
              shippingFee: Number.isFinite(parsed) ? parsed : 0,
            });
          }}
          data-test-id="delivery-zone-fee"
        />
      </div>
      <div className="mt-4">
        <Switch
          checked={draft.isActive}
          onChange={(checked) => onDraftChange({ ...draft, isActive: checked })}
          label="Zona activa"
          data-test-id="delivery-zone-active"
        />
      </div>
      {!geometryValid ? (
        <Alert variant="warning" className="mt-3">
          Dibuja o edita un polígono en el mapa antes de guardar.
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        Usa la barra del mapa: polígono para dibujar, lápiz para editar vértices, confirma con ✓
        y luego Guardar.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={onSave}
          disabled={!canSave}
          data-test-id="delivery-zone-save"
        >
          {saving ? "Guardando…" : "Guardar"}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
