import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Dialog, IconButton, NumberStepper, TextField } from "@kai/ui";
import { liteFetch } from "@/lib/lite-client";
import { formatClp } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import type { LitePosCatalogItem } from "@/lib/lite-api";
import { LoadingLine } from "@/shared/components/AdminTable";
import { cartTotal, usePosCartStore, type CartLine } from "../store/pos-cart.store";
import { useLitePosCompactLayout } from "../hooks/useLitePosCompactLayout";
import {
  clampLitePosProductSearchPageSize,
  LITE_POS_PRODUCT_SEARCH_DEBOUNCE_MS,
  LITE_POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE,
  LITE_POS_PRODUCT_SEARCH_MAX,
  LITE_POS_PRODUCT_SEARCH_MIN,
  readLitePosProductSearchPageSize,
  writeLitePosProductSearchPageSize,
} from "../lib/pos-product-search-storage";

type MobilePanel = "products" | "cart";

type CatalogPageResponse = {
  items: LitePosCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
};

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
  const [items, setItems] = useState<LitePosCatalogItem[]>([]);
  const [totalCatalog, setTotalCatalog] = useState(0);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(LITE_POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editLine, setEditLine] = useState<CartLine | null>(null);
  const [qtyDraft, setQtyDraft] = useState("");
  const [qtyError, setQtyError] = useState<string | null>(null);
  const [openItemOpen, setOpenItemOpen] = useState(false);
  const [openName, setOpenName] = useState("");
  const [openQty, setOpenQty] = useState(1);
  const [openPrice, setOpenPrice] = useState("0");
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    setPageSize(readLitePosProductSearchPageSize());
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, LITE_POS_PRODUCT_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams();
    if (debouncedQuery) qs.set("q", debouncedQuery);
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));
    void liteFetch<CatalogPageResponse>(`/lite/pos/catalog?${qs.toString()}`)
      .then((r) => {
        if (!cancelled) {
          setItems(r.items ?? []);
          setTotalCatalog(Number(r.total) || 0);
          setError(null);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(toUserMessage(e));
          setItems([]);
          setTotalCatalog(0);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page, pageSize]);

  const cartTotalAmount = cartTotal(lines);
  const itemsCount = lines.reduce((n, l) => n + l.qty, 0);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCatalog / Math.max(1, pageSize)) || 1),
    [totalCatalog, pageSize],
  );

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

  function onPageSizeChange(next: number) {
    const clamped = clampLitePosProductSearchPageSize(next);
    writeLitePosProductSearchPageSize(clamped);
    setPageSize(clamped);
    setPage(1);
  }

  function openEditQty(line: CartLine) {
    setEditLine(line);
    setQtyDraft(String(line.qty));
    setQtyError(null);
  }

  function closeEditQty() {
    setEditLine(null);
    setQtyDraft("");
    setQtyError(null);
  }

  function saveEditQty() {
    if (!editLine) return;
    setQtyError(null);
    const raw = qtyDraft.trim().replace(",", ".");
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      setQtyError("Ingresa una cantidad entera válida.");
      return;
    }
    setQty(editLine.variantId, n);
    closeEditQty();
  }

  function closeOpenItem() {
    setOpenItemOpen(false);
    setOpenName("");
    setOpenQty(1);
    setOpenPrice("0");
    setOpenError(null);
  }

  function saveOpenItem() {
    setOpenError(null);
    const name = openName.trim();
    if (!name) {
      setOpenError("Ingresá un nombre.");
      return;
    }
    if (!Number.isFinite(openQty) || openQty <= 0) {
      setOpenError("Ingresá una cantidad mayor a 0.");
      return;
    }
    const priceDigits = openPrice.replace(/\D/g, "");
    const price = priceDigits === "" ? 0 : Number.parseInt(priceDigits, 10);
    if (!Number.isFinite(price) || price < 0) {
      setOpenError("Ingresá un precio válido.");
      return;
    }
    addLine({
      variantId: `open:${crypto.randomUUID()}`,
      name,
      unitPrice: price,
      productType: "SERVICE",
      qty: openQty,
    });
    closeOpenItem();
    if (compactLayout) setMobilePanel("cart");
  }

  function goToPayment() {
    if (lines.length === 0) return;
    clearPayments();
    setPhase("payment");
  }

  useEffect(() => {
    if (!editLine) return;
    const timer = window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(
        '[data-test-id="pos-cart-line-edit-qty-input"]',
      );
      if (!el) return;
      el.focus({ preventScroll: true });
      el.select();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [editLine]);

  useEffect(() => {
    if (!openItemOpen) return;
    const timer = window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(
        '[data-test-id="pos-cart-open-item-name"]',
      );
      if (!el) return;
      el.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [openItemOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      const inField = !!target?.closest("input, textarea, select, [contenteditable='true']");
      if (e.key === "+" || e.code === "NumpadAdd") {
        if (openItemOpen || editLine || inField) return;
        e.preventDefault();
        setOpenError(null);
        setOpenItemOpen(true);
        return;
      }
      if (e.key !== "Enter") return;
      if (openItemOpen || editLine) return;
      if (lines.length === 0) return;
      if (inField) return;
      e.preventDefault();
      clearPayments();
      setPhase("payment");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openItemOpen, editLine, lines.length, clearPayments, setPhase]);

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
      {!loading && !error && totalCatalog === 0 && !debouncedQuery ? (
        <p className="text-sm text-muted-foreground">Catálogo vacío. Ejecuta seed.</p>
      ) : null}
      {!loading && !error && totalCatalog === 0 && debouncedQuery ? (
        <p className="text-sm text-muted-foreground">
          Sin resultados para “{debouncedQuery}”.
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <ul className="flex flex-col gap-2" data-test-id="pos-product-search-results">
          {items.map((item) => (
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
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-2"
        data-test-id="pos-product-search-pagination"
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="w-40 shrink-0">
            <NumberStepper
              label="Por página"
              value={pageSize}
              onChange={onPageSizeChange}
              min={LITE_POS_PRODUCT_SEARCH_MIN}
              max={LITE_POS_PRODUCT_SEARCH_MAX}
              step={5}
              allowNegative={false}
              data-test-id="pos-product-search-page-size"
            />
          </div>
          <span className="truncate text-xs text-muted-foreground">
            Pág. {page} / {totalPages} ({totalCatalog} productos)
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton
            icon="ChevronLeft"
            variant="action"
            size="sm"
            disabled={page <= 1 || loading}
            title="Anterior"
            ariaLabel="Página anterior"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            data-test-id="pos-product-search-prev"
          />
          <IconButton
            icon="ChevronRight"
            variant="action"
            size="sm"
            disabled={page >= totalPages || loading}
            title="Siguiente"
            ariaLabel="Página siguiente"
            onClick={() => setPage((p) => p + 1)}
            data-test-id="pos-product-search-next"
          />
        </div>
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
          icon="Eraser"
          variant="outlined"
          size="sm"
          ariaLabel="Vaciar carrito"
          title="Vaciar carrito"
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
                  <IconButton
                    icon="Pencil"
                    variant="outlined"
                    size="sm"
                    ariaLabel="Editar cantidad"
                    title="Editar cantidad"
                    onClick={() => openEditQty(l)}
                    data-test-id={`pos-cart-line-edit-qty-${l.variantId}`}
                  />
                  <span className="ml-auto font-mono text-sm tabular-nums text-foreground">
                    {formatClp(l.qty * l.unitPrice)}
                  </span>
                  <IconButton
                    icon="Trash2"
                    variant="outlined"
                    size="sm"
                    ariaLabel={`Eliminar ${l.name}`}
                    title="Eliminar línea"
                    onClick={() => setQty(l.variantId, 0)}
                    data-test-id={`pos-cart-line-remove-${l.variantId}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton
            icon="Plus"
            variant="outlined"
            size="lg"
            className="shrink-0"
            ariaLabel="Agregar producto especial"
            title="Producto especial"
            onClick={() => {
              setOpenError(null);
              setOpenItemOpen(true);
            }}
            data-test-id="pos-cart-open-item"
          />
          <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Total</div>
          <div
            className="text-2xl font-bold tabular-nums text-foreground"
            data-test-id="pos-cart-summary-total"
          >
            {formatClp(cartTotalAmount)}
          </div>
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
          onClick={goToPayment}
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

      <Dialog
        open={editLine != null}
        onClose={closeEditQty}
        title="Editar cantidad"
        size="sm"
        alertArea={qtyError ? <Alert variant="error">{qtyError}</Alert> : undefined}
        actions={
          <>
            <Button type="button" variant="outlined" onClick={closeEditQty}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={saveEditQty}>
              Guardar
            </Button>
          </>
        }
        actionsJustify="between"
        data-test-id="pos-cart-line-edit-qty-dialog"
      >
        <div className="grid gap-3">
          {editLine ? (
            <p className="truncate text-sm text-muted-foreground">{editLine.name}</p>
          ) : null}
          <TextField
            label="Cantidad"
            name="pos-cart-edit-qty"
            type="number"
            value={qtyDraft}
            onChange={(e) => setQtyDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEditQty();
              }
            }}
            placeholder="Cantidad"
            alwaysShowLabel
            selectOnFocus
            min={1}
            step={1}
            inputMode="numeric"
            data-test-id="pos-cart-line-edit-qty-input"
          />
        </div>
      </Dialog>

      <Dialog
        open={openItemOpen}
        onClose={closeOpenItem}
        title="Producto especial"
        size="sm"
        alertArea={openError ? <Alert variant="error">{openError}</Alert> : undefined}
        actions={
          <>
            <Button type="button" variant="outlined" onClick={closeOpenItem}>
              Cerrar
            </Button>
            <Button type="button" variant="primary" onClick={saveOpenItem} data-test-id="pos-cart-open-item-add">
              Agregar
            </Button>
          </>
        }
        actionsJustify="between"
        data-test-id="pos-cart-open-item-dialog"
      >
        <div
          className="grid gap-3"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            e.stopPropagation();
            saveOpenItem();
          }}
        >
          <TextField
            label="Nombre"
            value={openName}
            onChange={(e) => setOpenName(e.target.value)}
            alwaysShowLabel
            data-test-id="pos-cart-open-item-name"
          />
          <NumberStepper
            label="Cantidad"
            value={openQty}
            onChange={setOpenQty}
            min={1}
            step={1}
            allowNegative={false}
            data-test-id="pos-cart-open-item-qty"
          />
          <TextField
            label="Precio"
            type="currency"
            currencySymbol="$"
            value={openPrice}
            onChange={(e) => setOpenPrice(e.target.value.replace(/\D/g, "") || "0")}
            data-test-id="pos-cart-open-item-price"
          />
        </div>
      </Dialog>
    </div>
  );
}
