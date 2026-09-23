import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  Select,
  Switch,
  TextField,
} from "@kai/ui";
import { toUserMessage } from "@/lib/errors";
import {
  liteAdminApi,
  type LiteAttributeRow,
  type LiteVariantDetail,
} from "../api/lite-admin.api";

export type CreateLiteVariantDialogProps = {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productType?: string;
  onSuccess?: (created: LiteVariantDetail) => void | Promise<void>;
};

export function CreateLiteVariantDialog({
  open,
  onClose,
  productId,
  productName,
  onSuccess,
}: CreateLiteVariantDialogProps) {
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [basePrice, setBasePrice] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [attributes, setAttributes] = useState<LiteAttributeRow[]>([]);
  /** attributeId → option or "" */
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSku("");
    setBarcode("");
    setBasePrice("0");
    setIsActive(true);
    setSelections({});
    setFormError(null);
    setLoadError(null);
    void liteAdminApi
      .attributes()
      .then((r) => {
        const active = (r.items ?? []).filter((a) => a.isActive);
        setAttributes(active);
        const init: Record<string, string> = {};
        for (const a of active) init[a.id] = "";
        setSelections(init);
      })
      .catch((e) => setLoadError(toUserMessage(e)));
  }, [open, productId]);

  const attributeFields = useMemo(
    () =>
      attributes.map((a) => ({
        id: a.id,
        label: a.name,
        options: [
          { id: "", label: "Sin definir" },
          ...a.options.map((o) => ({ id: o, label: o })),
        ],
      })),
    [attributes],
  );

  async function submit() {
    setBusy(true);
    setFormError(null);
    try {
      const attributeValues: Record<string, string> = {};
      for (const [id, val] of Object.entries(selections)) {
        const trimmed = val.trim();
        if (trimmed) attributeValues[id] = trimmed;
      }
      const created = await liteAdminApi.createVariant(productId, {
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        basePrice: Number(basePrice) || 0,
        isActive,
        attributeValues:
          Object.keys(attributeValues).length > 0 ? attributeValues : undefined,
      });
      await onSuccess?.(created);
      onClose();
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Agregar variante"
      size="md"
      actions={
        <>
          <Button type="button" variant="outlined" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" loading={busy} onClick={() => void submit()}>
            Crear
          </Button>
        </>
      }
      alertArea={
        formError || loadError ? (
          <Alert variant="error">{formError ?? loadError}</Alert>
        ) : undefined
      }
      data-test-id="create-lite-variant-dialog"
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Producto: <strong className="text-foreground">{productName}</strong>
        </p>
        <TextField
          label="SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="Auto si vacío"
        />
        <TextField
          label="Código de barras"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
        />
        <TextField
          label="Precio base"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          type="currency"
          currencySymbol="$"
        />
        <Switch
          label="Activa"
          checked={isActive}
          onChange={(v) => setIsActive(v)}
        />
        {attributeFields.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Atributos
            </p>
            {attributeFields.map((f) => (
              <Select
                key={f.id}
                label={f.label}
                options={f.options}
                value={selections[f.id] ?? ""}
                onChange={(id) =>
                  setSelections((prev) => ({ ...prev, [f.id]: String(id) }))
                }
                alwaysShowLabel
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Sin atributos activos. Creá atributos en Inventario si necesitás talla/color.
          </p>
        )}
      </div>
    </Dialog>
  );
}
