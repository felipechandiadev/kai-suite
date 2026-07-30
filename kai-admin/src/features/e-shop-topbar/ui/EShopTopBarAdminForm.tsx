"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Alert, Button } from "@kai/ui";
import type { EShopResolvedTheme } from "@/features/e-shop-appearance/types/eshop-theme.types";
import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";
import { saveEShopTopBarAction } from "../actions/eshop-topbar.action";
import type {
  CompanyEShopTopBarSettings,
  EShopNavLink,
  EShopTopBarAdminState,
} from "../types/eshop-topbar.types";
import { EShopTopBarLinkEditor } from "./EShopTopBarLinkEditor";
import { EShopTopBarCategoryLinksAssistant } from "./EShopTopBarCategoryLinksAssistant";
import { EShopTopBarPreview } from "./EShopTopBarPreview";

type Props = {
  companyId: string;
  companyName: string;
  themeResolved?: EShopResolvedTheme | null;
  initial: EShopTopBarAdminState;
  categories: CategoryListItem[];
};

function reorderLinks(links: EShopNavLink[]): EShopNavLink[] {
  return links.map((l, i) => ({ ...l, order: i }));
}

export function EShopTopBarAdminForm({
  companyId,
  companyName,
  themeResolved,
  initial,
  categories,
}: Props) {
  const [topBar, setTopBar] = useState<CompanyEShopTopBarSettings>(initial.topBar);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updateLink = useCallback((index: number, link: EShopNavLink) => {
    setTopBar((prev) => {
      const navLinks = [...prev.navLinks];
      navLinks[index] = link;
      return { ...prev, navLinks };
    });
    setSaved(false);
  }, []);

  const removeLink = useCallback((index: number) => {
    setTopBar((prev) => ({
      ...prev,
      navLinks: reorderLinks(prev.navLinks.filter((_, i) => i !== index)),
    }));
    setSaved(false);
  }, []);

  const moveLink = useCallback((index: number, dir: -1 | 1) => {
    setTopBar((prev) => {
      const navLinks = [...prev.navLinks];
      const target = index + dir;
      if (target < 0 || target >= navLinks.length) return prev;
      [navLinks[index], navLinks[target]] = [navLinks[target], navLinks[index]];
      return { ...prev, navLinks: reorderLinks(navLinks) };
    });
    setSaved(false);
  }, []);

  const addLink = () => {
    if (topBar.navLinks.length >= 8) return;
    setTopBar((prev) => ({
      ...prev,
      navLinks: reorderLinks([
        ...prev.navLinks,
        {
          id: crypto.randomUUID(),
          label: "Nuevo enlace",
          kind: "route",
          href: "/productos",
          enabled: true,
          order: prev.navLinks.length,
        },
      ]),
    }));
    setSaved(false);
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveEShopTopBarAction(companyId, topBar);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-8">
      <section className="w-full min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Vista previa en tienda</h2>
          <p className="text-xs text-muted-foreground">
            Colores:{" "}
            <Link href="/e-shop/appearance" className="text-primary hover:underline">
              Apariencia → Topbar y footer
            </Link>
          </p>
        </div>
        <EShopTopBarPreview
          topBar={topBar}
          companyName={companyName}
          theme={themeResolved}
        />
      </section>

      <section className="w-full min-w-0 space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <h2 className="text-sm font-semibold text-foreground">Elementos visibles</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          {(
            [
              ["showLogo", "Logo"],
              ["showCompanyName", "Nombre empresa"],
              ["showCart", "Carrito"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={topBar[key]}
                onChange={(e) => {
                  setTopBar((p) => ({ ...p, [key]: e.target.checked }));
                  setSaved(false);
                }}
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <EShopTopBarCategoryLinksAssistant
        categories={categories}
        currentLinks={topBar.navLinks}
        onApply={(navLinks) => {
          setTopBar((prev) => ({ ...prev, navLinks }));
          setSaved(false);
        }}
      />

      <section className="w-full min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Enlaces de navegación</h2>
          <Button
            type="button"
            variant="outlined"
            size="sm"
            onClick={addLink}
            disabled={topBar.navLinks.length >= 8}
          >
            Añadir enlace
          </Button>
        </div>
        <div className="space-y-3">
          {topBar.navLinks.map((link, index) => (
            <EShopTopBarLinkEditor
              key={link.id}
              link={link}
              categories={categories}
              onChange={(l) => updateLink(index, l)}
              onRemove={() => removeLink(index)}
              onMoveUp={() => moveLink(index, -1)}
              onMoveDown={() => moveLink(index, 1)}
              canMoveUp={index > 0}
              canMoveDown={index < topBar.navLinks.length - 1}
            />
          ))}
        </div>
      </section>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {saved ? <Alert variant="success">Topbar guardada.</Alert> : null}

      <Button type="button" variant="primary" onClick={onSave} disabled={saving}>
        {saving ? "Guardando…" : "Guardar topbar"}
      </Button>
    </div>
  );
}
