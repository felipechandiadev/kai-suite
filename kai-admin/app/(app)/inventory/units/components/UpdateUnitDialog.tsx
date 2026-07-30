"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { UnitDimension, UnitListItem } from "@/features/inventory-units/types/unit.types";
import { UNIT_DIMENSIONS, dimensionLabel } from "@/features/inventory-units/types/unit.types";
import { updateUnitAction } from "@/features/inventory-units/actions/unit.action";

export type UpdateUnitDialogProps = {
  open: boolean;
  onClose: () => void;
  unit: UnitListItem;
  allUnits: UnitListItem[];
  onSuccess?: () => void | Promise<void>;
};

const DIMENSION_OPTIONS = UNIT_DIMENSIONS.map((d) => ({
  id: d,
  label: dimensionLabel(d),
}));

export function UpdateUnitDialog({
  open,
  onClose,
  unit,
  allUnits,
  onSuccess,
}: UpdateUnitDialogProps) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [dimension, setDimension] = useState<UnitDimension>("count");
  const [conversionFactorStr, setConversionFactorStr] = useState("1");
  const [isBase, setIsBase] = useState(false);
  const [baseUnitId, setBaseUnitId] = useState("");
  const [allowDecimals, setAllowDecimals] = useState(true);
  const [active, setActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const baseOptions = useMemo(() => {
    const sorted = allUnits
      .filter(
        (u) => u.id !== unit.id && u.dimension === dimension && u.isBase && u.active,
      )
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return [
      { id: "", label: "Seleccionar base" },
      ...sorted.map((u) => ({ id: u.id, label: `${u.name} (${u.symbol})` })),
    ];
  }, [allUnits, dimension, unit.id]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(unit.name);
    setSymbol(unit.symbol);
    setDimension(unit.dimension);
    setConversionFactorStr(String(unit.conversionFactor));
    setIsBase(unit.isBase);
    setBaseUnitId(unit.baseUnitId ?? "");
    setAllowDecimals(unit.allowDecimals);
    setActive(unit.active);
    setIsDefault(unit.isDefault);
    setError(null);
  }, [open, unit]);

  useEffect(() => {
    if (!active && isDefault) {
      setIsDefault(false);
    }
  }, [active, isDefault]);

  useEffect(() => {
    if (isBase) {
      setConversionFactorStr("1");
      setBaseUnitId("");
    }
  }, [isBase]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    const factor = Number(conversionFactorStr.replace(",", "."));
    startTransition(() => {
      void (async () => {
        const r = await updateUnitAction({
          id: unit.id,
          name: name.trim(),
          symbol: symbol.trim(),
          dimension,
          conversionFactor: isBase ? 1 : factor,
          isBase,
          baseUnitId: isBase ? undefined : baseUnitId === "" ? undefined : baseUnitId,
          allowDecimals,
          active,
          isDefault,
        });
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const factorNum = Number(conversionFactorStr.replace(",", "."));
  const factorOk = isBase ? true : Number.isFinite(factorNum) && factorNum > 0;
  const baseOk = isBase || (baseUnitId !== "" && baseOptions.some((o) => o.id === baseUnitId));
  const canSubmit = name.trim() && symbol.trim() && factorOk && baseOk && !isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Actualizar unidad"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="unit-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="unit-update-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="unit-update-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="unit-update-submit">
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="unit-update-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          data-test-id="unit-update-name"
        />
        <TextField
          label="Símbolo"
          name="unit-update-symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          required
          data-test-id="unit-update-symbol"
        />
        <Select
          label="Dimensión"
          name="unit-update-dimension"
          value={dimension}
          onChange={(id) => setDimension(String(id) as UnitDimension)}
          options={DIMENSION_OPTIONS}
          required
          data-test-id="unit-update-dimension"
        />
        <div className="pt-1">
          <Switch
            checked={isBase}
            onChange={setIsBase}
            label="Es unidad base"
            labelPosition="right"
            data-test-id="unit-update-is-base"
          />
        </div>
        {!isBase ? (
          <>
            <Select
              label="Unidad base"
              name="unit-update-base"
              value={baseUnitId || null}
              onChange={(id) => setBaseUnitId(id == null ? "" : String(id))}
              options={baseOptions}
              required
              data-test-id="unit-update-base"
            />
            <TextField
              label="Factor de conversión"
              name="unit-update-factor"
              value={conversionFactorStr}
              onChange={(e) => setConversionFactorStr(e.target.value)}
              required
              data-test-id="unit-update-factor"
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Unidad base: factor 1 en esta dimensión.</p>
        )}
        <div className="pt-1">
          <Switch
            checked={allowDecimals}
            onChange={setAllowDecimals}
            label="Permite decimales"
            labelPosition="right"
            data-test-id="unit-update-decimals"
          />
        </div>
        <div className="pt-1">
          <Switch
            checked={active}
            onChange={setActive}
            label="Unidad activa"
            labelPosition="right"
            data-test-id="unit-update-active"
          />
        </div>
        <div className="pt-1">
          <Switch
            checked={isDefault}
            onChange={setIsDefault}
            disabled={!active}
            label="Unidad predeterminada"
            labelPosition="right"
            data-test-id="unit-update-is-default"
          />
        </div>
      </div>
    </Dialog>
  );
}
