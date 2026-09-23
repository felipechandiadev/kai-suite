import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  CollectionPageLayout,
  Dialog,
  TextField,
  Select,
} from "@kai/ui";
import { CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { useCollectionSearchQuery } from "@/shared/hooks/useCollectionSearchQuery";
import { toUserMessage } from "@/lib/errors";
import { liteAdminApi, type LiteUnitRow } from "../api/lite-admin.api";
import { LiteUnitCard } from "../components/LiteUnitCard";

const DIMENSIONS = [
  { id: "count", label: "count" },
  { id: "mass", label: "mass" },
  { id: "volume", label: "volume" },
  { id: "length", label: "length" },
];

export function InventoryUnitsPage() {
  const q = useCollectionSearchQuery();
  const [items, setItems] = useState<LiteUnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [dimension, setDimension] = useState("count");
  const [factor, setFactor] = useState("1");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    void liteAdminApi
      .units()
      .then((r) => setItems(r.items ?? []))
      .catch((e) => setError(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((u) => {
      const hay = `${u.name} ${u.symbol} ${u.dimension}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, q]);

  async function create() {
    setBusy(true);
    setFormError(null);
    try {
      await liteAdminApi.createUnit({
        name,
        symbol,
        dimension,
        conversionFactor: Number(factor) || 1,
      });
      setOpen(false);
      setName("");
      setSymbol("");
      reload();
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <CollectionPageLayout
        title="Unidades de medida"
        subtitle="Unidades base y derivadas para el catálogo."
        showSearch
        onAddClick={() => setOpen(true)}
        addButtonAriaLabel="Crear unidad"
        contentEmptyMessage="Sin unidades. Ejecutá seed o creá una."
        contentItems={
          loading || error
            ? undefined
            : filtered.length > 0
              ? filtered.map((u) => (
                  <LiteUnitCard
                    key={u.id}
                    unit={u}
                    onUpdated={reload}
                    data-test-id={`unit-card-${u.id}`}
                  />
                ))
              : []
        }
        contentGridColumns={3}
        contentGridGapClassName="gap-4"
        contentGridItemsAlign="stretch"
        data-test-id="inventory-units-page"
      >
        <LoadingLine loading={loading} />
        <CoreError message={error} />
      </CollectionPageLayout>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Crear unidad"
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" loading={busy} onClick={() => void create()}>
              Crear
            </Button>
          </>
        }
        alertArea={formError ? <Alert variant="error">{formError}</Alert> : undefined}
      >
        <div className="flex flex-col gap-3">
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Símbolo" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          <Select
            label="Dimensión"
            options={DIMENSIONS}
            value={dimension}
            onChange={(id) => setDimension(String(id))}
            alwaysShowLabel
          />
          <TextField
            label="Factor de conversión"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            type="number"
          />
        </div>
      </Dialog>
    </>
  );
}
