import { useEffect, useMemo, useState } from "react";
import { Alert, IconButton, TextField } from "@kai/ui";
import { coreFetch } from "@/lib/http";
import { formatClp } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import type { LitePosCatalogItem } from "@/lib/lite-api";
import { LoadingLine } from "@/shared/components/AdminTable";
import { cartTotal, usePosCartStore, type CartLine } from "../store/pos-cart.store";
import { useLitePosCompactLayout } from "../hooks/useLitePosCompactLayout";

type MobilePanel = "products" | "cart";

export function PosSalePage() {
  const {
    lines,
    addLine,
    setQty,
    setPhase,
    clear,
    clearPayments,
    lastPrintWarning,
    setLastPrintWarning,
  } = usePosCartStore();
  const compactLayout = useLitePosCompactLayout();
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("products");
  const [catalog, setCatalog] = useState<LitePosCatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void coreFetch<{ items: LitePosCatalogItem[] }>("/lite/pos/catalog")
      .then((r) => {
        if (!cancelled) {
          setCatalog(r.items ?? []);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(toUserMessage(e));
          setCatalog([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = cartTotal(lines);
  const itemsCount = lines.reduce((n, l) => n + l.qty, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((item) => {
      const hay = `${item.name} ${item.sku ?? ""} ${item.barcode ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [catalog, query]);

  function onAdd(item: LitePosCatalogItem) {
    const productType = (["PHYSICAL", "SERVICE", "PACK"].includes(item.productType)
      ? item.productType
      : "PHYSICAL") as CartLine["productType"];
    addLine({
      variantId: item.variantId,
      name: item.name,
      unitPrice: item.unitPrice,
      productType,
    });
    if (compactLayout) setMobilePanel("cart");
  }

  const searchPanel = (
    <section
      className={`flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-3 sm:p-4 ${
        compactLayout ? "h-full" : ""
      }`}
      data-test-id="pos-product-search-panel"
    >
      <TextField
        label="Buscar producto"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-test-id="pos-product-search"
      />
      <LoadingLine loading={loading} />
      {error ? <Alert variant="error">Core: {error}</Alert> : null}
      {lastPrintWarning ? (
        <Alert variant="warning">
          {lastPrintWarning}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setLastPrintWarning(null)}
          >
            Cerrar
          </button>
        </Alert>
      ) : null}
      {!loading && !error && catalog.length === 0 ? (
        <p className="text-sm text-muted-foreground">Catálogo vacío. Ejecuta seed.</p>
      ) : null}
      {!loading && !error && catalog.length > 0 && filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin resultados para “{query.trim()}”.</p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <ul className="flex flex-col gap-2" data-test-id="pos-product-search-results">
          {filtered.map((item) => (
            <li key={item.variantId}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                onClick={() => onAdd(item)}
                data-test-id={`pos-product-pick-${item.variantId}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-foreground">
                    {item.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {[item.sku, item.barcode].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                  {formatClp(item.unitPrice)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );

  const cartPanel = (
    <aside
      className={`flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-3 sm:p-4 ${
        compactLayout ? "h-full" : ""
      }`}
      data-test-id="pos-cart-panel"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Carrito</h2>
        <IconButton
          icon="Trash2"
          variant="outlined"
          size="sm"
          ariaLabel="Vaciar carrito"
          title="Vaciar"
          disabled={lines.length === 0}
          onClick={() => clear()}
          data-test-id="pos-cart-clear"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Vacío</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lines.map((l) => (
              <li
                key={l.variantId}
                className="rounded-lg border border-border px-3 py-2"
                data-test-id={`pos-cart-line-${l.variantId}`}
              >
                <div className="truncate text-sm font-medium text-foreground">{l.name}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <IconButton
                    icon="Minus"
                    variant="outlined"
                    size="sm"
                    ariaLabel="Quitar uno"
                    onClick={() => setQty(l.variantId, l.qty - 1)}
                  />
                  <span className="min-w-6 text-center font-mono text-sm tabular-nums">
                    {l.qty}
                  </span>
                  <IconButton
                    icon="Plus"
                    variant="outlined"
                    size="sm"
                    ariaLabel="Agregar uno"
                    onClick={() => setQty(l.variantId, l.qty + 1)}
                  />
                  <span className="ml-auto font-mono text-sm tabular-nums text-foreground">
                    {formatClp(l.qty * l.unitPrice)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Total</div>
          <div
            className="text-2xl font-bold tabular-nums text-foreground"
            data-test-id="pos-cart-summary-total"
          >
            {formatClp(total)}
          </div>
        </div>
        <IconButton
          icon="CircleDollarSign"
          variant="outlined"
          size="lg"
          className="shrink-0"
          ariaLabel="Cobrar"
          title="Cobrar"
          disabled={lines.length === 0}
          onClick={() => {
            clearPayments();
            setPhase("payment");
          }}
          data-test-id="pos-cart-checkout-icon"
        />
      </footer>
    </aside>
  );

  return (
    <div
      className={
        compactLayout
          ? "flex h-full min-h-0 flex-1 flex-col gap-3 p-3"
          : "grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-4 p-4"
      }
      data-test-id="pos-sale"
    >
      {compactLayout ? (
        <div
          className="flex shrink-0 rounded-lg border border-border bg-muted/30 p-1"
          role="tablist"
          aria-label="Vista del punto de venta"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "products"}
            className={`flex min-h-9 flex-1 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors ${
              mobilePanel === "products"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            onClick={() => setMobilePanel("products")}
            data-test-id="pos-mobile-tab-products"
          >
            Productos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "cart"}
            aria-label={itemsCount > 0 ? `Carrito, ${itemsCount} ítems` : "Carrito"}
            className={`relative flex min-h-9 flex-1 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors ${
              mobilePanel === "cart"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            onClick={() => setMobilePanel("cart")}
            data-test-id="pos-mobile-tab-cart"
          >
            Carrito
            {itemsCount > 0 ? (
              <span className="absolute right-1 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold leading-none text-primary">
                {itemsCount > 99 ? "99+" : itemsCount}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      {compactLayout ? (
        <div className="min-h-0 flex-1">
          {mobilePanel === "products" ? searchPanel : cartPanel}
        </div>
      ) : (
        <>
          {searchPanel}
          {cartPanel}
        </>
      )}
    </div>
  );
}
