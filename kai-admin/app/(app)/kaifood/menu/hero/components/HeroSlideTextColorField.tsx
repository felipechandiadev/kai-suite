"use client";

import {
  HERO_SLIDE_TEXT_COLOR_PRESETS,
  colorInputValueFromHeroTextColor,
  normalizeHeroSlideTextColor,
} from "@/features/menu-hero-slides/utils/hero-slide-text-color";

type HeroSlideTextColorFieldProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

export function HeroSlideTextColorField({ value, onChange, disabled }: HeroSlideTextColorFieldProps) {
  const pickerValue = colorInputValueFromHeroTextColor(value);

  return (
    <div className="space-y-2" data-test-id="hero-slide-text-color-field">
      <span className="text-sm font-medium text-foreground">Color del texto</span>
      <div className="flex flex-wrap gap-2">
        {HERO_SLIDE_TEXT_COLOR_PRESETS.map((preset) => {
          const active =
            preset.value === null ? value === null : value?.toUpperCase() === preset.value;
          return (
            <button
              key={preset.label}
              type="button"
              disabled={disabled}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/40"
              }`}
              onClick={() => onChange(preset.value)}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="sr-only">Selector de color</span>
          <input
            type="color"
            value={pickerValue}
            disabled={disabled}
            className="h-10 w-14 cursor-pointer rounded border border-border bg-background p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(e) => onChange(normalizeHeroSlideTextColor(e.target.value))}
            data-test-id="hero-slide-text-color-picker"
          />
          Personalizado
        </label>
        <input
          type="text"
          value={value ?? ""}
          disabled={disabled}
          placeholder="#FFFFFF"
          className="min-h-10 w-28 rounded-md border border-border bg-background px-3 text-sm"
          onChange={(e) => {
            const next = e.target.value;
            if (!next.trim()) {
              onChange(null);
              return;
            }
            onChange(normalizeHeroSlideTextColor(next) ?? next.toUpperCase());
          }}
          onBlur={(e) => {
            const normalized = normalizeHeroSlideTextColor(e.target.value);
            onChange(normalized);
          }}
          data-test-id="hero-slide-text-color-hex"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Aplica al título, mensaje y enlace. El botón mantiene sus colores de marca.
      </p>
    </div>
  );
}
