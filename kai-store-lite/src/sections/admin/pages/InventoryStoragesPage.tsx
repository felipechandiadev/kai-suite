import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  CollectionPageLayout,
  Dialog,
  TextField,
  Switch,
} from "@kai/ui";
import { CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { useCollectionSearchQuery } from "@/shared/hooks/useCollectionSearchQuery";
import { toUserMessage } from "@/lib/errors";
import { liteAdminApi, type LiteStorageRow } from "../api/lite-admin.api";
import { LiteStorageCard } from "../components/LiteStorageCard";

export function InventoryStoragesPage() {
  const q = useCollectionSearchQuery();
  const [items, setItems] = useState<LiteStorageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    void liteAdminApi
      .storages()
      .then((r) => setItems(r.items ?? []))
      .catch((e) => setError(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((s) => {
      const hay = `${s.name} ${s.type ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, q]);

  async function create() {
    setBusy(true);
    setFormError(null);
    try {
      await liteAdminApi.createStorage({ name, isDefault });
      setOpen(false);
      setName("");
      setIsDefault(false);
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
        title="Almacenes"
        subtitle="Bodegas de la tienda Lite."
        showSearch
        onAddClick={() => setOpen(true)}
        addButtonAriaLabel="Crear almacén"
        contentEmptyMessage="Sin almacenes."
        contentItems={
          loading || error
            ? undefined
            : filtered.length > 0
              ? filtered.map((s) => (
                  <LiteStorageCard
                    key={s.id}
                    storage={s}
                    onUpdated={reload}
                    data-test-id={`storage-card-${s.id}`}
                  />
                ))
              : []
        }
        contentGridColumns={3}
        contentGridGapClassName="gap-4"
        contentGridItemsAlign="stretch"
        data-test-id="inventory-storages-page"
      >
        <LoadingLine loading={loading} />
        <CoreError message={error} />
      </CollectionPageLayout>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Crear almacén"
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
          <Switch
            label="Almacén por defecto"
            checked={isDefault}
            onChange={(checked) => setIsDefault(checked)}
          />
        </div>
      </Dialog>
    </>
  );
}
