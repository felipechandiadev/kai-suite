"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Badge, Button, TextField } from "@kai/ui";
import type {
  ProductGridRow,
  ProductVariantGridRow,
} from "@/features/inventory-products/types/product-grid.types";
import {
  getProductForPromotionAction,
  searchProductsForPromotionAction,
} from "@/features/promotions/actions/search-products-for-promotion.action";

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  PHYSICAL: "Producto físico",
  MANUFACTURADO: "Manufacturado",
  ELABORADO: "Elaborado",
  PREPARADO: "Preparado",
  SERVICE: "Servicio",
  DIGITAL: "Digital",
};

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

type Props = {
  selectedProductId: string | null;
  onPickProduct: (product: ProductGridRow | null) => void;
  disabled?: boolean;
};

function formatMoney(n: number, currency = "CLP"): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function productTypeLabel(raw: string | null | undefined): string {
  const id = (raw ?? "PHYSICAL").toString().toUpperCase();
  return PRODUCT_TYPE_LABEL[id] ?? id;
}

function variantDisplayPrice(v: ProductVariantGridRow): string | null {
  const pl = v.priceListItems?.[0];
  if (pl && Number.isFinite(pl.grossPrice) && pl.grossPrice > 0) {
    return formatMoney(pl.grossPrice, pl.currency || "CLP");
  }
  if (v.basePrice != null && Number.isFinite(v.basePrice) && v.basePrice > 0) {
    return formatMoney(v.basePrice);
  }
  return null;
}

function ProductImage({ url, name }: { url: string | null | undefined; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-14 w-14 shrink-0 rounded-md border border-border object-cover bg-muted/30"
      />
    );
  }
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/20 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
      aria-hidden
    >
      Sin foto
    </div>
  );
}

function ProductMetaLine({ product }: { product: ProductGridRow }) {
  const parts = [
    product.brand?.trim() || null,
    product.categoryName?.trim() || null,
    productTypeLabel(product.productType),
  ].filter(Boolean);

  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      {parts.map((part, i) => (
        <span key={`${part}-${i}`} className="inline-flex items-center gap-1.5">
          {i > 0 ? <span className="opacity-50">·</span> : null}
          <span>{part}</span>
        </span>
      ))}
    </p>
  );
}

function VariantPreviewList({ product }: { product: ProductGridRow }) {
  const variants = product.variants.slice(0, 3);
  if (variants.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        {product.variantCount} variante{product.variantCount === 1 ? "" : "s"}
      </p>
    );
  }

  return (
    <ul className="mt-2 space-y-1">
      {variants.map((v) => {
        const price = variantDisplayPrice(v);
        const label = v.displayName?.trim() || v.sku || "Variante";
        return (
          <li
            key={v.id}
            className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted-foreground"
          >
            <span className="text-foreground">{label}</span>
            {v.sku ? <span>SKU {v.sku}</span> : null}
            {v.barcode ? <span>{v.barcode}</span> : null}
            {price ? <span className="tabular-nums text-foreground">{price}</span> : null}
          </li>
        );
      })}
      {product.variantCount > variants.length ? (
        <li className="text-[11px] text-muted-foreground">
          +{product.variantCount - variants.length} variante
          {product.variantCount - variants.length === 1 ? "" : "s"} más
        </li>
      ) : null}
    </ul>
  );
}

function PromotionProductResultCard({
  product,
  onSelect,
  disabled,
}: {
  product: ProductGridRow;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="flex w-full gap-3 rounded-lg border border-border/80 bg-muted/15 p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/25 disabled:cursor-not-allowed disabled:opacity-60"
      data-test-id={`promotion-product-result-${product.id}`}
    >
      <ProductImage url={product.primaryImageUrl} name={product.name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-medium text-foreground">{product.name}</p>
          <Badge variant={product.isActive ? "success-outlined" : "secondary-outlined"}>
            {product.isActive ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <ProductMetaLine product={product} />
        {product.description?.trim() ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        ) : null}
        <VariantPreviewList product={product} />
      </div>
    </button>
  );
}

function PromotionSelectedProductCard({
  product,
  onChange,
  onClear,
  disabled,
}: {
  product: ProductGridRow;
  onChange: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <article
      className="flex gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 shadow-sm"
      data-test-id={`promotion-product-selected-${product.id}`}
    >
      <ProductImage url={product.primaryImageUrl} name={product.name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-semibold text-foreground">{product.name}</p>
          <Badge variant={product.isActive ? "success-outlined" : "secondary-outlined"}>
            {product.isActive ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <ProductMetaLine product={product} />
        {product.description?.trim() ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        ) : null}
        <VariantPreviewList product={product} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outlinedSecondary"
            size="sm"
            disabled={disabled}
            onClick={onChange}
            data-test-id="promotion-product-change"
          >
            Cambiar
          </Button>
          <Button
            type="button"
            variant="outlinedSecondary"
            size="sm"
            disabled={disabled}
            onClick={onClear}
            data-test-id="promotion-product-clear"
          >
            Quitar
          </Button>
        </div>
      </div>
    </article>
  );
}

export function PromotionProductSearchField({
  selectedProductId,
  onPickProduct,
  disabled = false,
}: Props) {
  const [selectedProduct, setSelectedProduct] = useState<ProductGridRow | null>(null);
  const [searchOpen, setSearchOpen] = useState(() => !selectedProductId);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductGridRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrateGenRef = useRef(0);

  useEffect(() => {
    const gen = ++hydrateGenRef.current;
    if (!selectedProductId) {
      setSelectedProduct(null);
      setSearchOpen(true);
      setHydrating(false);
      return;
    }
    setHydrating(true);
    setError(null);
    void (async () => {
      const row = await getProductForPromotionAction(selectedProductId);
      if (gen !== hydrateGenRef.current) return;
      setHydrating(false);
      if (row) {
        setSelectedProduct(row);
        setSearchOpen(false);
        setQuery("");
        setResults([]);
      } else {
        setSelectedProduct(null);
        setSearchOpen(true);
        setError("No se pudo cargar el producto seleccionado.");
      }
    })();
  }, [selectedProductId]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_QUERY_LEN) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await searchProductsForPromotionAction(trimmed);
      setResults(rows);
    } catch {
      setResults([]);
      setError("Error al buscar productos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searchOpen || disabled) {
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void runSearch(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchOpen, disabled, runSearch]);

  const handlePick = useCallback(
    (product: ProductGridRow) => {
      setSelectedProduct(product);
      setSearchOpen(false);
      setQuery("");
      setResults([]);
      setError(null);
      onPickProduct(product);
    },
    [onPickProduct],
  );

  const handleClear = useCallback(() => {
    setSelectedProduct(null);
    setSearchOpen(true);
    setQuery("");
    setResults([]);
    setError(null);
    onPickProduct(null);
  }, [onPickProduct]);

  const handleChange = useCallback(() => {
    setSearchOpen(true);
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  const showSearchPanel = searchOpen || !selectedProduct;

  const searchHint = useMemo(() => {
    if (loading) return "Buscando…";
    if (query.trim().length > 0 && query.trim().length < MIN_QUERY_LEN) {
      return `Escribe al menos ${MIN_QUERY_LEN} caracteres.`;
    }
    if (query.trim().length >= MIN_QUERY_LEN && results.length === 0 && !loading) {
      return "Sin resultados.";
    }
    return null;
  }, [loading, query, results.length]);

  return (
    <div className="flex flex-col gap-3" data-test-id="promotion-product-search-field">
      {hydrating ? (
        <p className="text-xs text-muted-foreground">Cargando producto…</p>
      ) : null}

      {selectedProduct && !searchOpen ? (
        <PromotionSelectedProductCard
          product={selectedProduct}
          onChange={handleChange}
          onClear={handleClear}
          disabled={disabled}
        />
      ) : null}

      {showSearchPanel ? (
        <div className="flex flex-col gap-2">
          <TextField
            label="Producto"
            placeholder="Buscar por nombre, SKU o código…"
            value={query}
            onChange={(e) => setQuery((e as React.ChangeEvent<HTMLInputElement>).target.value)}
            alwaysShowLabel
            disabled={disabled}
            startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" aria-hidden />}
            data-test-id="promotion-product-search-input"
          />
          {searchHint ? (
            <p className="text-xs text-muted-foreground" data-test-id="promotion-product-search-hint">
              {searchHint}
            </p>
          ) : null}
          {error ? <p className="text-xs text-error">{error}</p> : null}
          {results.length > 0 ? (
            <div
              className="max-h-72 space-y-2 overflow-y-auto pr-1"
              data-test-id="promotion-product-search-results"
            >
              {results.map((product) => (
                <PromotionProductResultCard
                  key={product.id}
                  product={product}
                  disabled={disabled}
                  onSelect={() => handlePick(product)}
                />
              ))}
            </div>
          ) : null}
          {selectedProduct && searchOpen ? (
            <Button
              type="button"
              variant="text"
              size="sm"
              className="self-start"
              disabled={disabled}
              onClick={() => {
                setSearchOpen(false);
                setQuery("");
                setResults([]);
              }}
              data-test-id="promotion-product-search-cancel"
            >
              Cancelar cambio
            </Button>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Solo se permite un producto por promoción en esta versión. Vacío = sin filtro por producto.
      </p>
    </div>
  );
}
