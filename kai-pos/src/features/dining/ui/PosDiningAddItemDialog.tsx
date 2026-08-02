"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Alert, Button, Dialog, DotProgress, TextField } from "@kai/ui";
import { addPosDiningOrderItemsAction } from "@/features/dining/actions/dining-pos.action";
import { searchPosProductsAction } from "@/features/pos-products/actions/pos-products.action";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  onAdded: () => void;
};

export function PosDiningAddItemDialog({ open, onClose, orderId, onAdded }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosProductSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PosProductSearchItem | null>(null);
  const [qtyDraft, setQtyDraft] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setQtyDraft("1");
      setError(null);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const ctx = readPosContextClient();
      const priceListId = ctx?.priceListId?.trim();
      if (!priceListId) {
        setError("Lista de precios no configurada en el POS.");
        return;
      }
      setLoading(true);
      setError(null);
      void searchPosProductsAction({
        query: q,
        priceListId,
        branchId: ctx?.branchId ?? null,
        pointOfSaleId: ctx?.pointOfSaleId ?? null,
        onMenuOnly: true,
        page: 1,
        pageSize: 8,
      }).then((res) => {
        setLoading(false);
        if (!res.success) {
          if (redirectToLoginIfUnauthorized(res)) return;
          setError(res.message);
          setResults([]);
          return;
        }
        setResults(res.products);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, query]);

  const handleAdd = () => {
    if (!selected) return;
    const qty = Number(qtyDraft.replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Ingresa una cantidad válida.");
      return;
    }
    setSubmitting(true);
    setError(null);
    void addPosDiningOrderItemsAction(orderId, [
      { productVariantId: selected.variantId, quantity: qty },
    ]).then((res) => {
      setSubmitting(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setError(res.message);
        return;
      }
      onAdded();
      onClose();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Agregar ítem"
      size="md"
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        <>
          <Button type="button" variant="outlined" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleAdd}
            disabled={!selected || submitting}
            data-test-id="pos-dining-add-item-confirm"
          >
            {submitting ? "Agregando…" : "Agregar"}
          </Button>
        </>
      }
      actionsJustify="between"
      data-test-id="pos-dining-add-item-dialog"
    >
      <div className="grid gap-3">
        <TextField
          label="Buscar producto"
          name="pos-dining-add-item-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nombre, SKU o código…"
          alwaysShowLabel
          startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />}
          data-test-id="pos-dining-add-item-search"
        />

        <div className="max-h-[min(12rem,35vh)] space-y-2 overflow-y-auto" aria-busy={loading}>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <DotProgress />
              Buscando…
            </p>
          ) : query.trim().length < 2 ? (
            <p className="text-sm text-muted-foreground">Escribe al menos 2 caracteres.</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin coincidencias.</p>
          ) : (
            results.map((item) => {
              const picked = selected?.variantId === item.variantId;
              return (
                <button
                  key={item.variantId}
                  type="button"
                  onClick={() => setSelected(item)}
                  className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    picked ? "border-primary/40 bg-primary/5" : "border-border"
                  }`}
                  data-test-id={`pos-dining-add-item-pick-${item.variantId}`}
                >
                  <span className="font-medium">{item.productName}</span>
                  {item.sku ? (
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                      {item.sku}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {selected ? (
          <TextField
            label="Cantidad"
            name="pos-dining-add-item-qty"
            type="number"
            value={qtyDraft}
            onChange={(e) => setQtyDraft(e.target.value)}
            min={selected.unitAllowDecimals ? 0.001 : 1}
            step={selected.unitAllowDecimals ? 0.001 : 1}
            alwaysShowLabel
            data-test-id="pos-dining-add-item-qty"
          />
        ) : null}
      </div>
    </Dialog>
  );
}
