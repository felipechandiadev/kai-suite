"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert, Badge, Button, Dialog, IconButton, Select, TextField } from "@kai/ui";
import {
  getVariantProductionAttributesAction,
  saveVariantProductionAttributesAction,
} from "@/features/inventory-products/actions/variant-production.action";
import type { ProductionAttribute } from "@/features/inventory-products/types/production-attributes.types";
import {
  emptyProductionAttribute,
  PRODUCTION_ATTRIBUTE_TAG_PRESETS,
  slugifyProductionTagKey,
} from "@/features/inventory-products/types/production-attributes.types";

type Props = {
  variantId: string;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function VariantDetailProductionAttributesBlock({ variantId }: Props) {
  const [items, setItems] = useState<ProductionAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionAttribute | null>(null);
  const [draft, setDraft] = useState<ProductionAttribute | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void getVariantProductionAttributesAction(variantId)
      .then((list) => {
        if (cancelled) return;
        setItems(list);
        setDirty(false);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(
          e instanceof Error ? e.message : "No se pudieron cargar atributos",
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [variantId]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; attrs: ProductionAttribute[] }>();
    for (const attr of items) {
      const key = attr.tagKey?.trim() || "__none__";
      const label = attr.tagLabel?.trim() || (key === "__none__" ? "Sin grupo" : key);
      const bucket = map.get(key) ?? { label, attrs: [] };
      bucket.attrs.push(attr);
      map.set(key, bucket);
    }
    return [...map.entries()].sort((a, b) =>
      a[1].label.localeCompare(b[1].label, "es"),
    );
  }, [items]);

  const tagSelectOptions = useMemo(
    () => [
      ...PRODUCTION_ATTRIBUTE_TAG_PRESETS.map((t) => ({
        id: t.key,
        label: t.label,
      })),
      { id: "__custom__", label: "Otro…" },
      { id: "__none__", label: "Sin grupo" },
    ],
    [],
  );

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyProductionAttribute(items.length));
    setCustomTag(false);
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEdit = (attr: ProductionAttribute) => {
    setEditing(attr);
    setDraft({
      ...attr,
      options: attr.options.map((o) => ({ ...o })),
    });
    const isPreset = PRODUCTION_ATTRIBUTE_TAG_PRESETS.some(
      (t) => t.key === attr.tagKey,
    );
    setCustomTag(!!attr.tagKey && !isPreset);
    setDialogError(null);
    setDialogOpen(true);
  };

  const confirmDialog = () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setDialogError("El nombre es obligatorio.");
      return;
    }
    const options = draft.options
      .map((o, i) => ({
        ...o,
        label: o.label.trim(),
        displayOrder: i,
      }))
      .filter((o) => o.label.length > 0);
    if (options.length === 0) {
      setDialogError("Agregá al menos una opción con label.");
      return;
    }
    const next: ProductionAttribute = {
      ...draft,
      name,
      description: draft.description?.trim() || null,
      tagKey: draft.tagKey?.trim() || null,
      tagLabel: draft.tagLabel?.trim() || null,
      options,
    };
    setItems((prev) => {
      const idx = prev.findIndex((a) => a.id === next.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      }
      return [...prev, next];
    });
    setDirty(true);
    setDialogOpen(false);
    setDraft(null);
  };

  const removeAttr = (id: string) => {
    if (!window.confirm("¿Eliminar este atributo de producción?")) return;
    setItems((prev) => prev.filter((a) => a.id !== id));
    setDirty(true);
  };

  const handleSave = () => {
    setSaveError(null);
    startTransition(() => {
      void saveVariantProductionAttributesAction(variantId, items).then(
        (res) => {
          if (!res.success) {
            setSaveError(res.message);
            return;
          }
          setItems(res.items);
          setDirty(false);
        },
      );
    });
  };

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Cargando atributos de producción…
      </p>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-border p-4"
      data-test-id="variant-detail-production-attributes"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Atributos de producción
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Detalle de fabricación (no son atributos de variante/SKU). Mismo
            costo; opciones libres para el lote.
          </p>
        </div>
        <div className="flex gap-1">
          <IconButton
            icon="Plus"
            variant="action"
            size="md"
            ariaLabel="Agregar atributo"
            disabled={pending}
            onClick={openCreate}
            data-test-id="pv-prod-attr-add"
          />
          <IconButton
            icon="Save"
            variant="primary"
            size="md"
            ariaLabel={pending ? "Guardando" : "Guardar atributos"}
            title={dirty ? "Guardar" : "Sin cambios"}
            disabled={pending || !dirty}
            isLoading={pending}
            onClick={handleSave}
            data-test-id="pv-prod-attr-save"
          />
        </div>
      </div>

      {loadError ? (
        <Alert variant="error" className="text-sm">
          {loadError}
        </Alert>
      ) : null}
      {saveError ? (
        <Alert variant="error" className="text-sm">
          {saveError}
        </Alert>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay atributos. Agregá uno (ej. tipo de botón, color de hilo).
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([key, group]) => (
            <div key={key} className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.attrs.map((attr) => (
                  <article
                    key={attr.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-muted/10 p-3"
                    data-test-id={`pv-prod-attr-card-${attr.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground">
                          {attr.name}
                        </h4>
                        {attr.tagLabel ? (
                          <Badge
                            variant="secondary-outlined"
                            className="mt-1 text-[10px]"
                          >
                            {attr.tagLabel}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <IconButton
                          icon="Pencil"
                          variant="action"
                          size="sm"
                          ariaLabel="Editar atributo"
                          disabled={pending}
                          onClick={() => openEdit(attr)}
                        />
                        <IconButton
                          icon="Trash2"
                          variant="neutral"
                          size="sm"
                          ariaLabel="Eliminar atributo"
                          disabled={pending}
                          onClick={() => removeAttr(attr.id)}
                        />
                      </div>
                    </div>
                    {attr.description ? (
                      <p className="text-xs text-muted-foreground">
                        {attr.description}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-1">
                      {attr.options.map((o) => (
                        <span
                          key={o.id}
                          className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground"
                        >
                          {o.label}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (!pending) {
            setDialogOpen(false);
            setDraft(null);
          }
        }}
        title={editing ? "Editar atributo de producción" : "Nuevo atributo de producción"}
        size="md"
        scroll="paper"
        hideActions
        data-test-id="pv-prod-attr-dialog"
      >
        {draft ? (
          <div className="flex flex-col gap-3 pt-1">
            {dialogError ? (
              <Alert variant="error">{dialogError}</Alert>
            ) : null}
            <TextField
              label="Nombre"
              name="prod-attr-name"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, name: e.target.value } : d))
              }
              placeholder="Nombre"
              alwaysShowLabel
            />
            <TextField
              label="Descripción (opcional)"
              name="prod-attr-desc"
              value={draft.description ?? ""}
              onChange={(e) =>
                setDraft((d) =>
                  d ? { ...d, description: e.target.value } : d,
                )
              }
              placeholder="Descripción (opcional)"
              alwaysShowLabel
            />
            <Select
              label="Grupo (tag)"
              name="prod-attr-tag"
              placeholder="Seleccionar"
              options={tagSelectOptions}
              value={
                customTag
                  ? "__custom__"
                  : draft.tagKey
                    ? draft.tagKey
                    : "__none__"
              }
              onChange={(id) => {
                const v = id != null ? String(id) : "__none__";
                if (v === "__none__") {
                  setCustomTag(false);
                  setDraft((d) =>
                    d ? { ...d, tagKey: null, tagLabel: null } : d,
                  );
                  return;
                }
                if (v === "__custom__") {
                  setCustomTag(true);
                  return;
                }
                setCustomTag(false);
                const preset = PRODUCTION_ATTRIBUTE_TAG_PRESETS.find(
                  (t) => t.key === v,
                );
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        tagKey: v,
                        tagLabel: preset?.label ?? v,
                      }
                    : d,
                );
              }}
              alwaysShowLabel
            />
            {customTag ? (
              <TextField
                label="Tag personalizado"
                name="prod-attr-tag-custom"
                value={draft.tagLabel ?? ""}
                onChange={(e) => {
                  const label = e.target.value;
                  const key = slugifyProductionTagKey(label);
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          tagLabel: label,
                          tagKey: key || null,
                        }
                      : d,
                  );
                }}
                placeholder="Tag personalizado"
                alwaysShowLabel
              />
            ) : null}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Opciones</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            options: [
                              ...d.options,
                              {
                                id: newId(),
                                label: "",
                                displayOrder: d.options.length,
                              },
                            ],
                          }
                        : d,
                    )
                  }
                >
                  Agregar opción
                </Button>
              </div>
              {draft.options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <TextField
                    label={`Opción ${idx + 1}`}
                    name={`prod-attr-opt-${opt.id}`}
                    value={opt.label}
                    onChange={(e) =>
                      setDraft((d) => {
                        if (!d) return d;
                        const options = d.options.map((o) =>
                          o.id === opt.id
                            ? { ...o, label: e.target.value }
                            : o,
                        );
                        return { ...d, options };
                      })
                    }
                    placeholder={`Opción ${idx + 1}`}
                    className="flex-1"
                  />
                  <IconButton
                    icon="Trash2"
                    variant="neutral"
                    size="sm"
                    ariaLabel="Quitar opción"
                    disabled={draft.options.length <= 1}
                    onClick={() =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              options: d.options.filter((o) => o.id !== opt.id),
                            }
                          : d,
                      )
                    }
                  />
                </div>
              ))}
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDialogOpen(false);
                  setDraft(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="button" variant="primary" onClick={confirmDialog}>
                {editing ? "Actualizar" : "Agregar"}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
