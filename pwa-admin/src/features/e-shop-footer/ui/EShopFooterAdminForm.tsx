"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Alert, Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import type { EShopResolvedTheme } from "@/features/e-shop-appearance/types/eshop-theme.types";
import { saveEShopFooterAction } from "../actions/eshop-footer.action";
import type {
  CompanyEShopFooterSettings,
  EShopFooterAdminState,
  EShopFooterLinkGroup,
} from "../types/eshop-footer.types";
import { EShopFooterGroupEditor } from "./EShopFooterGroupEditor";
import { EShopFooterPreview } from "./EShopFooterPreview";

type Props = {
  companyId: string;
  companyName: string;
  themeResolved?: EShopResolvedTheme | null;
  initial: EShopFooterAdminState;
};

function reorderGroups(groups: EShopFooterLinkGroup[]): EShopFooterLinkGroup[] {
  return groups.map((g, i) => ({ ...g, order: i }));
}

export function EShopFooterAdminForm({
  companyId,
  companyName,
  themeResolved,
  initial,
}: Props) {
  const [footer, setFooter] = useState<CompanyEShopFooterSettings>(initial.footer);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updateGroup = useCallback((index: number, group: EShopFooterLinkGroup) => {
    setFooter((prev) => {
      const linkGroups = [...prev.linkGroups];
      linkGroups[index] = group;
      return { ...prev, linkGroups };
    });
    setSaved(false);
  }, []);

  const removeGroup = useCallback((index: number) => {
    setFooter((prev) => ({
      ...prev,
      linkGroups: reorderGroups(prev.linkGroups.filter((_, i) => i !== index)),
    }));
    setSaved(false);
  }, []);

  const moveGroup = useCallback((index: number, dir: -1 | 1) => {
    setFooter((prev) => {
      const linkGroups = [...prev.linkGroups];
      const target = index + dir;
      if (target < 0 || target >= linkGroups.length) return prev;
      [linkGroups[index], linkGroups[target]] = [linkGroups[target], linkGroups[index]];
      return { ...prev, linkGroups: reorderGroups(linkGroups) };
    });
    setSaved(false);
  }, []);

  const addGroup = () => {
    if (footer.linkGroups.length >= 4) return;
    setFooter((prev) => ({
      ...prev,
      linkGroups: reorderGroups([
        ...prev.linkGroups,
        {
          id: crypto.randomUUID(),
          title: "Nueva columna",
          enabled: true,
          order: prev.linkGroups.length,
          links: [],
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
      await saveEShopFooterAction(companyId, footer);
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
        <EShopFooterPreview
          footer={footer}
          companyName={companyName}
          theme={themeResolved}
        />
      </section>

      <section className="w-full min-w-0 space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <h2 className="text-sm font-semibold text-foreground">Bloques visibles</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          {(
            [
              ["showLogo", "Logo"],
              ["showTagline", "Tagline"],
              ["showBrandManifest", "Manifiesto"],
              ["showContactBlock", "Contacto"],
              ["showSocialLinks", "Redes sociales"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={footer[key]}
                onChange={(e) => {
                  setFooter((p) => ({ ...p, [key]: e.target.checked }));
                  setSaved(false);
                }}
              />
              {label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Tagline y manifiesto se editan en{" "}
          <Link href="/settings/company" className="text-primary hover:underline">
            Configuración → Empresa → Identidad
          </Link>
          . Contacto y redes en la misma sección de empresa.
        </p>
      </section>

      <section className="w-full min-w-0 space-y-3">
        <TextField
          label="Sufijo copyright (opcional)"
          value={footer.copyrightSuffix ?? ""}
          onChange={(e) => {
            setFooter((p) => ({
              ...p,
              copyrightSuffix: e.target.value || undefined,
            }));
            setSaved(false);
          }}
          placeholder="Joyería de autor"
        />
      </section>

      <section className="w-full min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Columnas de enlaces</h2>
          <Button
            type="button"
            variant="outlined"
            size="sm"
            onClick={addGroup}
            disabled={footer.linkGroups.length >= 4}
          >
            Añadir columna
          </Button>
        </div>
        <div className="space-y-3">
          {footer.linkGroups.map((group, index) => (
            <EShopFooterGroupEditor
              key={group.id}
              group={group}
              onChange={(g) => updateGroup(index, g)}
              onRemove={() => removeGroup(index)}
              onMoveUp={() => moveGroup(index, -1)}
              onMoveDown={() => moveGroup(index, 1)}
              canMoveUp={index > 0}
              canMoveDown={index < footer.linkGroups.length - 1}
            />
          ))}
        </div>
      </section>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {saved ? <Alert variant="success">Footer guardado.</Alert> : null}

      <Button type="button" variant="primary" onClick={onSave} disabled={saving}>
        {saving ? "Guardando…" : "Guardar footer"}
      </Button>
    </div>
  );
}
