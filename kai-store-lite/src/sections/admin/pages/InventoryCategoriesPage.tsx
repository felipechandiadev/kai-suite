import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  CollectionPageLayout,
  Dialog,
  Select,
  TextField,
} from "@kai/ui";
import { CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { useCollectionSearchQuery } from "@/shared/hooks/useCollectionSearchQuery";
import { toUserMessage } from "@/lib/errors";
import { liteAdminApi, type LiteCategoryRow } from "../api/lite-admin.api";
import { LiteCategoryCard } from "../components/LiteCategoryCard";

export function InventoryCategoriesPage() {
  const q = useCollectionSearchQuery();
  const [items, setItems] = useState<LiteCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    void liteAdminApi
      .categories()
      .then((r) => setItems(r.items ?? []))
      .catch((e) => setError(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((c) => {
      const parent = c.parentId
        ? items.find((x) => x.id === c.parentId)?.name?.toLowerCase() ?? ""
        : "";
      return (
        c.name.toLowerCase().includes(q) ||
        (parent && parent.includes(q)) ||
        (c.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, q]);

  const parentOptions = useMemo(
    () => [
      { id: "", label: "Sin categoría padre" },
      ...items.map((c) => ({ id: c.id, label: c.name })),
    ],
    [items],
  );

  async function create() {
    setBusy(true);
    setFormError(null);
    try {
      await liteAdminApi.createCategory({
        name,
        description: description.trim() || undefined,
        parentId: parentId || undefined,
      });
      setOpen(false);
      setName("");
      setDescription("");
      setParentId("");
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
        title="Categorías"
        subtitle="Jerarquía de categorías del catálogo."
        showSearch
        onAddClick={() => setOpen(true)}
        addButtonAriaLabel="Crear categoría"
        contentEmptyMessage="Sin categorías. Ejecutá seed o creá una."
        contentItems={
          loading || error
            ? undefined
            : filtered.length > 0
              ? filtered.map((c) => (
                  <LiteCategoryCard
                    key={c.id}
                    category={c}
                    allCategories={items}
                    onUpdated={reload}
                    data-test-id={`category-card-${c.id}`}
                  />
                ))
              : []
        }
        contentGridColumns={3}
        contentGridGapClassName="gap-4"
        contentGridItemsAlign="stretch"
        data-test-id="inventory-categories-page"
      >
        <LoadingLine loading={loading} />
        <CoreError message={error} />
      </CollectionPageLayout>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Crear categoría"
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              loading={busy}
              disabled={!name.trim()}
              onClick={() => void create()}
            >
              Crear
            </Button>
          </>
        }
        alertArea={formError ? <Alert variant="error">{formError}</Alert> : undefined}
      >
        <div className="flex flex-col gap-3">
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Select
            label="Categoría padre"
            options={parentOptions}
            value={parentId}
            onChange={(id) => setParentId(String(id))}
            alwaysShowLabel
          />
        </div>
      </Dialog>
    </>
  );
}
