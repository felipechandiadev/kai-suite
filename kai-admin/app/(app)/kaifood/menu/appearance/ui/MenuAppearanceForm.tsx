"use client";

import { useCallback, useMemo, useState } from "react";
import { Alert, Button } from "@kai/ui";
import { saveMenuThemeAction } from "@/features/kai-menu/actions/kai-menu.action";
import type {
  CompanyMenuThemeSettings,
  MenuResolvedTheme,
  MenuTemplateId,
  MenuThemeAdminState,
  MenuThemeTokenOverrides,
} from "@/features/kai-menu/types/menu-theme.types";
import { MENU_THEME_OVERRIDE_LABELS } from "@/features/kai-menu/types/menu-theme.types";
import { MenuAppearancePreview } from "./MenuAppearancePreview";

type Props = {
  companyId: string;
  initial: MenuThemeAdminState;
  menuPublicUrl?: string | null;
};

const OVERRIDE_KEYS = Object.keys(MENU_THEME_OVERRIDE_LABELS) as (keyof MenuThemeTokenOverrides)[];

function mergeResolved(
  presets: MenuThemeAdminState["presets"],
  theme: CompanyMenuThemeSettings,
): MenuResolvedTheme {
  const preset = presets.find((p) => p.id === theme.templateId) ?? presets[0];
  const tokens = { ...preset.tokens };
  for (const key of OVERRIDE_KEYS) {
    const v = theme.tokenOverrides[key];
    if (v) tokens[key] = v;
  }
  if (theme.tokenOverrides.background) tokens.surface = theme.tokenOverrides.background;
  if (theme.tokenOverrides.accent) tokens.active = theme.tokenOverrides.accent;
  if (theme.tokenOverrides.chrome) {
    const chrome = theme.tokenOverrides.chrome;
    tokens.chromeForeground =
      Number.parseInt(chrome.slice(1, 3), 16) * 0.299 +
        Number.parseInt(chrome.slice(3, 5), 16) * 0.587 +
        Number.parseInt(chrome.slice(5, 7), 16) * 0.114 >
      158
        ? tokens.foreground
        : "#ffffff";
  }
  return { templateId: theme.templateId, tokens };
}

export function MenuAppearanceForm({ companyId, initial, menuPublicUrl }: Props) {
  const [theme, setTheme] = useState<CompanyMenuThemeSettings>(initial.theme);
  const [presets] = useState(initial.presets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const previewResolved = useMemo(() => mergeResolved(presets, theme), [presets, theme]);

  const selectTemplate = useCallback((templateId: MenuTemplateId) => {
    setTheme((prev) => ({ ...prev, templateId, tokenOverrides: {} }));
    setSaved(false);
  }, []);

  const setOverride = useCallback((key: keyof MenuThemeTokenOverrides, value: string) => {
    setTheme((prev) => ({
      ...prev,
      tokenOverrides: { ...prev.tokenOverrides, [key]: value },
    }));
    setSaved(false);
  }, []);

  const resetOverrides = useCallback(() => {
    setTheme((prev) => ({ ...prev, tokenOverrides: {} }));
    setSaved(false);
  }, []);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const ok = await saveMenuThemeAction(companyId, theme);
      if (!ok) throw new Error("No se pudo guardar");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <section className="space-y-3" data-test-id="menu-appearance-templates">
          <h2 className="text-sm font-semibold text-foreground">Plantilla</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {presets.map((preset) => {
              const selected = theme.templateId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectTemplate(preset.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40"
                  }`}
                  data-test-id={`menu-template-${preset.id}`}
                >
                  <div className="mb-3 flex gap-1">
                    {(["primary", "secondary", "chrome"] as const).map((k) => (
                      <span
                        key={k}
                        className="h-6 w-6 rounded-full border border-border/50"
                        style={{ backgroundColor: preset.tokens[k] }}
                      />
                    ))}
                  </div>
                  <p className="font-medium text-foreground">{preset.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3" data-test-id="menu-appearance-colors">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Colores personalizados</h2>
            <Button type="button" variant="outlined" size="sm" onClick={resetOverrides}>
              Restaurar preset
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {OVERRIDE_KEYS.map((key) => {
              const preset = presets.find((p) => p.id === theme.templateId);
              const value = theme.tokenOverrides[key] ?? preset?.tokens[key] ?? "#000000";
              return (
                <label key={key} className="flex items-center gap-3 text-sm">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => setOverride(key, e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-border bg-background p-1"
                    data-test-id={`menu-color-${key}`}
                  />
                  <span className="text-foreground">{MENU_THEME_OVERRIDE_LABELS[key]}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">{value}</span>
                </label>
              );
            })}
          </div>
        </section>

        {error ? <Alert variant="error">{error}</Alert> : null}
        {saved ? (
          <Alert variant="success">
            Tema guardado. Los cambios solo afectan la carta pública (kai-menu).
          </Alert>
        ) : null}

        <div className="flex gap-2">
          <Button type="button" variant="primary" onClick={onSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar apariencia"}
          </Button>
        </div>
      </div>

      <aside className="min-w-0 space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Vista previa</h2>
        <MenuAppearancePreview resolved={previewResolved} menuPublicUrl={menuPublicUrl} />
      </aside>
    </div>
  );
}
