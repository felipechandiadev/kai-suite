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
import { createUnitAction } from "@/features/inventory-units/actions/unit.action";

export type CreateUnitDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  allUnits: UnitListItem[];
};

const DIMENSION_OPTIONS = UNIT_DIMENSIONS.map((d) => ({
  id: d,
  label: dimensionLabel(d),
}));

export function CreateUnitDialog({ open, onClose, onSuccess, allUnits }: CreateUnitDialogProps) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [dimension, setDimension] = useState<UnitDimension>("count");
  const [conversionFactorStr, setConversionFactorStr] = useState("1");
  const [isBase, setIsBase] = useState(false);
  const [baseUnitId, setBaseUnitId] = useState("");
  const [allowDecimals, setAllowDecimals] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const baseOptions = useMemo(() => {
    const sorted = allUnits
      .filter((u) => u.dimension === dimension && u.isBase && u.active)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return [
      { id: "", label: "Seleccionar base" },
      ...sorted.map((u) => ({ id: u.id, label: `${u.name} (${u.symbol})` })),
    ];
  }, [allUnits, dimension]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setSymbol("");
    setDimension("count");
    setConversionFactorStr("1");
    setIsBase(false);
    setBaseUnitId("");
    setAllowDecimals(true);
    setIsDefault(false);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (isBase) {
      setConversionFactorStr("1");
      setBaseUnitId("");
    }
  }, [isBase]);

  const handleClose = () => {
    setName("");
    setSymbol("");
    setDimension("count");
    setConversionFactorStr("1");
    setIsBase(false);
    setBaseUnitId("");
    setAllowDecimals(true);
    setIsDefault(false);
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    const factor = Number(conversionFactorStr.replace(",", "."));
    startTransition(() => {
      void (async () => {
        const r = await createUnitAction({
          name: name.trim(),
          symbol: symbol.trim(),
          dimension,
          conversionFactor: isBase ? 1 : factor,
          isBase,
          baseUnitId: isBase ? undefined : baseUnitId === "" ? undefined : baseUnitId,
          allowDecimals,
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
      title="Crear unidad"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="unit-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="unit-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="unit-create-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="unit-create-submit">
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="unit-create-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="unit-create-name"
        />
        <TextField
          label="Símbolo"
          name="unit-create-symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Símbolo"
          required
          data-test-id="unit-create-symbol"
        />
        <Select
          label="Dimensión"
          name="unit-create-dimension"
          value={dimension}
          onChange={(id) => setDimension(String(id) as UnitDimension)}
          options={DIMENSION_OPTIONS}
          placeholder="Dimensión"
          required
          data-test-id="unit-create-dimension"
        />
        <div className="pt-1">
          <Switch
            checked={isBase}
            onChange={setIsBase}
            label="Es unidad base"
            labelPosition="right"
            data-test-id="unit-create-is-base"
          />
        </div>
        {!isBase ? (
          <>
            <Select
              label="Unidad base"
              name="unit-create-base"
              value={baseUnitId || null}
              onChange={(id) => setBaseUnitId(id == null ? "" : String(id))}
              options={baseOptions}
              placeholder="Unidad base"
              required
              data-test-id="unit-create-base"
            />
            <TextField
              label="Factor de conversión"
              name="unit-create-factor"
              value={conversionFactorStr}
              onChange={(e) => setConversionFactorStr(e.target.value)}
              placeholder="Factor de conversión"
              required
              data-test-id="unit-create-factor"
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            La unidad base tiene factor 1 respecto a sí misma en esta dimensión.
          </p>
        )}
        <div className="pt-1">
          <Switch
            checked={allowDecimals}
            onChange={setAllowDecimals}
            label="Permite decimales"
            labelPosition="right"
            data-test-id="unit-create-decimals"
          />
        </div>
        <div className="pt-1">
          <Switch
            checked={isDefault}
            onChange={setIsDefault}
            label="Unidad predeterminada"
            labelPosition="right"
            data-test-id="unit-create-is-default"
          />
        </div>
      </div>
    </Dialog>
  );
}
