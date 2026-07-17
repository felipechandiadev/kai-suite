"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { DotProgress, TextField } from "@kai/ui";
import {
  addOrderItemsAction,
  searchWaiterMenuAction,
} from "../actions/waiter.action";
import type { DiningOrderDto, WaiterMenuVariantDto } from "../infrastructure/dining.request";
import type { WaiterSession } from "@/lib/app-session";

const SEARCH_DEBOUNCE_MS = 280;

type WaiterMenuPanelProps = {
  session: WaiterSession;
  orderId: string;
  onOrderUpdated: (order: DiningOrderDto) => void;
};

export function WaiterMenuPanel({
  session,
  orderId,
  onOrderUpdated,
}: WaiterMenuPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WaiterMenuVariantDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setLoading(true);
      setError(null);
      void searchWaiterMenuAction({
        userId: session.userId,
        companyId: session.companyId,
        query: q,
      })
        .then((items) => {
          setResults(items);
        })
        .catch((e) => {
          setResults([]);
          setError(e instanceof Error ? e.message : "Error al buscar");
        })
        .finally(() => setLoading(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, session.userId, session.companyId]);

  const handleAdd = async (item: WaiterMenuVariantDto) => {
    setAddingId(item.variantId);
    setError(null);
    setFlash(null);
    try {
      const updated = await addOrderItemsAction({
        userId: session.userId,
        companyId: session.companyId,
        orderId,
        productVariantId: item.variantId,
        quantity: 1,
      });
      onOrderUpdated(updated);
      setFlash(`+ ${item.productName}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-test-id="waiter-menu-panel">
      <TextField
        label="Buscar producto"
        name="waiter-menu-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nombre, SKU…"
        alwaysShowLabel
        startAdornment={
          <Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />
        }
        data-test-id="waiter-menu-search"
      />

      {flash ? (
        <p className="text-xs font-medium text-success" role="status">
          {flash}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto" aria-busy={loading}>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <DotProgress />
            Buscando…
          </p>
        ) : query.trim().length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Busca un producto para cargarlo a la mesa.
          </p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin coincidencias.</p>
        ) : (
          results.map((item) => {
            const busy = addingId === item.variantId;
            const label =
              item.variantName && item.variantName !== item.productName
                ? `${item.productName} · ${item.variantName}`
                : item.productName;
            return (
              <button
                key={item.variantId}
                type="button"
                disabled={busy || addingId !== null}
                onClick={() => void handleAdd(item)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-3 text-left text-sm active:bg-muted/40 disabled:opacity-60"
                data-test-id={`waiter-menu-pick-${item.variantId}`}
              >
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{label}</span>
                  {item.sku ? (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.sku}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs font-semibold text-primary">
                  {busy ? "…" : "+"}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
