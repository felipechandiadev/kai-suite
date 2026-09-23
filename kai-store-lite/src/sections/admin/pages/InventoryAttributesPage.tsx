import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  CollectionPageLayout,
  Dialog,
  IconButton,
  TextField,
} from "@kai/ui";
import { CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { useCollectionSearchQuery } from "@/shared/hooks/useCollectionSearchQuery";
import { toUserMessage } from "@/lib/errors";
import { liteAdminApi, type LiteAttributeRow } from "../api/lite-admin.api";
import { LiteAttributeCard } from "../components/LiteAttributeCard";

export function InventoryAttributesPage() {
  const q = useCollectionSearchQuery();
  const [items, setItems] = useState<LiteAttributeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    void liteAdminApi
      .attributes()
      .then((r) => setItems(r.items ?? []))
      .catch((e) => setError(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((a) => {
      const desc = (a.description ?? "").toLowerCase();
      const inOptions = a.options.some((o) => o.toLowerCase().includes(q));
      return a.name.toLowerCase().includes(q) || desc.includes(q) || inOptions;
    });
  }, [items, q]);

  function addOption() {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption("");
    }
  }

  async function create() {
    setBusy(true);
    setFormError(null);
    try {
      await liteAdminApi.createAttribute({
        name,
        description: description.trim() || undefined,
        options,
      });
      setOpen(false);
      setName("");
      setDescription("");
      setOptions([]);
      setNewOption("");
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
        title="Atributos"
        subtitle="Atributos de variante (talla, color, etc.)."
        showSearch
        onAddClick={() => setOpen(true)}
        addButtonAriaLabel="Crear atributo"
        contentEmptyMessage="Sin atributos. Ejecutá seed o creá uno."
        contentItems={
          loading || error
            ? undefined
            : filtered.length > 0
              ? filtered.map((a) => (
                  <LiteAttributeCard
                    key={a.id}
                    attribute={a}
                    onUpdated={reload}
                    data-test-id={`attribute-card-${a.id}`}
                  />
                ))
              : []
        }
        contentGridColumns={3}
        contentGridGapClassName="gap-4"
        contentGridItemsAlign="stretch"
        data-test-id="inventory-attributes-page"
      >
        <LoadingLine loading={loading} />
        <CoreError message={error} />
      </CollectionPageLayout>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Crear atributo"
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
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Opciones</p>
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt, i) => (
                <span key={`${opt}-${i}`} className="inline-flex items-center gap-1">
                  <Badge variant="info-outlined">{opt}</Badge>
                  <IconButton
                    icon="X"
                    ariaLabel={`Quitar ${opt}`}
                    size="sm"
                    variant="text"
                    onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                  />
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <TextField
                label="Nueva opción"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOption();
                  }
                }}
              />
              <Button
                type="button"
                variant="outlined"
                className="shrink-0 self-end"
                onClick={addOption}
              >
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
