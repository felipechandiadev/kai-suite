"use client";

import { TextField } from "@/shared/components/TextField/TextField";
import { Select } from "@/shared/components/Select";
import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";
import type { EShopNavLink, EShopNavLinkKind } from "../types/eshop-topbar.types";
import {
  INTERNAL_ROUTE_OPTIONS,
  NAV_LINK_KIND_LABELS,
} from "../types/eshop-topbar.types";
import {
  buildEShopProductCategoryNavHref,
  getEShopNavRouteBasePath,
  parseEShopProductCategoryIdFromNavHref,
} from "../lib/eshop-category-nav-href";

type Props = {
  link: EShopNavLink;
  categories: CategoryListItem[];
  onChange: (link: EShopNavLink) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

function resolveRouteBaseValue(href: string): string {
  const base = getEShopNavRouteBasePath(href);
  const known = INTERNAL_ROUTE_OPTIONS.some((o) => o.value === base);
  return known ? base : "/productos";
}

export function EShopTopBarLinkEditor({
  link,
  categories,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: Props) {
  const routeBase = resolveRouteBaseValue(link.href);
  const categoryId = parseEShopProductCategoryIdFromNavHref(link.href) ?? "";

  const setKind = (kind: EShopNavLinkKind) => {
    let href = link.href;
    if (kind === "route") href = "/productos";
    if (kind === "anchor") href = "#donde-estamos";
    if (kind === "external") href = "https://";
    onChange({ ...link, kind, href });
  };

  const setRouteBase = (value: string | number | null) => {
    const base = String(value ?? "/productos");
    if (base === "/productos") {
      onChange({ ...link, href: categoryId ? buildEShopProductCategoryNavHref(categoryId) : "/productos" });
      return;
    }
    onChange({ ...link, href: base });
  };

  const setCategory = (value: string | number | null) => {
    const nextId = value == null ? "" : String(value);
    if (!nextId) {
      onChange({ ...link, href: "/productos" });
      return;
    }
    const category = categories.find((c) => c.id === nextId);
    const shouldFillLabel =
      !link.label.trim() || link.label.trim() === "Nuevo enlace" || link.href.trim() === "/productos";
    onChange({
      ...link,
      href: buildEShopProductCategoryNavHref(nextId),
      label: shouldFillLabel && category ? category.name : link.label,
    });
  };

  return (
    <div
      className="space-y-3 rounded-lg border border-border bg-background p-4"
      data-test-id={`topbar-link-${link.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={link.enabled}
            onChange={(e) => onChange({ ...link, enabled: e.target.checked })}
          />
          Visible
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            ↑
          </button>
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            ↓
          </button>
          <button
            type="button"
            className="rounded border border-destructive px-2 py-1 text-xs text-destructive"
            onClick={onRemove}
          >
            Eliminar
          </button>
        </div>
      </div>
      <TextField
        label="Etiqueta"
        value={link.label}
        onChange={(e) => onChange({ ...link, label: e.target.value })}
      />
      <Select
        label="Tipo"
        value={link.kind}
        onChange={(v) => setKind(v as EShopNavLinkKind)}
        options={(
          Object.entries(NAV_LINK_KIND_LABELS) as [EShopNavLinkKind, string][]
        ).map(([id, label]) => ({ id, label }))}
      />
      {link.kind === "route" ? (
        <>
          <Select
            label="Ruta"
            value={routeBase}
            onChange={setRouteBase}
            options={INTERNAL_ROUTE_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
          />
          {routeBase === "/productos" ? (
            <Select
              label="Categoría"
              value={categoryId}
              onChange={setCategory}
              options={[
                { id: "", label: "Todas las categorías" },
                ...categories.map((c) => ({ id: c.id, label: c.name })),
              ]}
            />
          ) : null}
        </>
      ) : (
        <TextField
          label={link.kind === "anchor" ? "Ancla" : "URL"}
          value={link.href}
          onChange={(e) => onChange({ ...link, href: e.target.value })}
          placeholder={link.kind === "anchor" ? "#donde-estamos" : "https://..."}
        />
      )}
    </div>
  );
}
