"use client";

import { useCallback, useEffect, useState } from "react";
import { IconButton } from "@kai/ui";
import {
  addProductAddonAction,
  listProductAddonsAction,
  removeProductAddonAction,
  searchAgregadoProductsAction,
} from "@/features/product-addons/actions/product-addons.action";
import type { ProductAddonRow } from "@/features/product-addons/infrastructure/product-addons.request";

type ProductHostAddonsSectionProps = {
  hostProductId: string;
};

export function ProductHostAddonsSection({ hostProductId }: ProductHostAddonsSectionProps) {
  const [rows, setRows] = useState<ProductAddonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<Array<{ id: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listProductAddonsAction(hostProductId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar agregados");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [hostProductId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }
    let cancelled = false;
    void searchAgregadoProductsAction({ q }).then((items) => {
      if (!cancelled) {
        setSearchHits(items.map((p) => ({ id: p.id, name: p.name })));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [searchQ]);

  const onAdd = async (addonProductId: string) => {
    setBusy(true);
    setError(null);
    try {
      await addProductAddonAction(hostProductId, addonProductId);
      setSearchQ("");
      setSearchHits([]);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo asociar");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (addonProductId: string) => {
    setBusy(true);
    setError(null);
    try {
      await removeProductAddonAction(hostProductId, addonProductId);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo quitar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-border bg-background p-4" data-test-id="product-host-addons">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Agregados disponibles</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Extras que el mesero/POS pueden añadir a líneas de este producto en cuenta salón.
        </p>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
      {rows.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>{row.addonProduct?.name ?? row.addonProductId}</span>
              <IconButton
                icon="Trash2"
                variant="ghost"
                size="sm"
                ariaLabel="Quitar agregado"
                disabled={busy}
                onClick={() => void onRemove(row.addonProductId)}
              />
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className="text-sm text-muted-foreground">Sin agregados asociados.</p>
      ) : null}
      <input
        type="search"
        value={searchQ}
        onChange={(e) => setSearchQ(e.target.value)}
        placeholder="Buscar producto AGREGADO…"
        className="w-full rounded-md border border-border px-3 py-2 text-sm"
        disabled={busy}
      />
      {searchHits.length > 0 ? (
        <ul className="max-h-36 overflow-y-auto rounded-md border border-border">
          {searchHits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                disabled={busy || rows.some((r) => r.addonProductId === hit.id)}
                onClick={() => void onAdd(hit.id)}
              >
                {hit.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
