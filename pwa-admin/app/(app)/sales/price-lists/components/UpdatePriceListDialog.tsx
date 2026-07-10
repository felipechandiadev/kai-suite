"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { Switch } from "@kai/ui";
import { updatePriceListAction } from "@/features/sales-price-lists/actions/price-list.action";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { PRICE_LIST_TYPE_OPTIONS } from "@/features/sales-price-lists/types/price-list.types";

const TYPE_OPTIONS: Option[] = PRICE_LIST_TYPE_OPTIONS.map((o) => ({ id: o.id, label: o.label }));

function normalizeType(t: string): string {
  const ok = ["RETAIL", "WHOLESALE", "VIP", "PROMOTIONAL"].includes(t);
  return ok ? t : "RETAIL";
}

export type UpdatePriceListDialogProps = {
  open: boolean;
  onClose: () => void;
  priceList: PriceListListItem;
  onSuccess?: () => void | Promise<void>;
};

export function UpdatePriceListDialog({
  open,
  onClose,
  priceList,
  onSuccess,
}: UpdatePriceListDialogProps) {
  const [name, setName] = useState("");
  const [priceListType, setPriceListType] = useState("RETAIL");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(priceList.name);
    setPriceListType(normalizeType(priceList.priceListType));
    setIsActive(priceList.isActive);
    setIsDefault(priceList.isDefault);
    setDescription(priceList.description?.trim() ?? "");
    setError(null);
  }, [open, priceList]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updatePriceListAction({
          id: priceList.id,
          name: name.trim(),
          priceListType: priceListType as "RETAIL" | "WHOLESALE" | "VIP" | "PROMOTIONAL",
          isActive,
          isDefault,
          description: description.trim() || null,
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Actualizar lista de precio"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="price-list-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="price-list-update-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button
            variant="outlined"
            size="md"
            onClick={handleClose}
            disabled={isPending}
            data-test-id="price-list-update-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
            data-test-id="price-list-update-submit"
          >
            Actualizar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="pl-update-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="price-list-update-name"
        />
        <div className="min-w-0">
          <Select
            label="Tipo"
            name="pl-update-type"
            options={TYPE_OPTIONS}
            value={priceListType}
            onChange={(v) => setPriceListType(v != null ? String(v) : "RETAIL")}
            placeholder="Tipo"
            required
            data-test-id="price-list-update-type"
          />
        </div>
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activa"
            labelPosition="right"
            data-test-id="price-list-update-active"
          />
        </div>
        <div className="pt-1">
          <Switch
            checked={isDefault}
            onChange={setIsDefault}
            label="Lista predeterminada"
            labelPosition="right"
            data-test-id="price-list-update-default"
          />
        </div>
        <TextField
          label="Descripción (opcional)"
          name="pl-update-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
          rows={3}
          data-test-id="price-list-update-desc"
        />
      </div>
    </Dialog>
  );
}
