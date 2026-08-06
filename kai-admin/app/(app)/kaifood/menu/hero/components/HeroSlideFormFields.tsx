"use client";

import type { MenuHeroSlideCtaStyle, MenuHeroSlideTextAlign } from "@/features/menu-hero-slides/types/hero-slide.types";
import { TextField } from "@kai/ui";
import { HeroSlideTextColorField } from "./HeroSlideTextColorField";

const TEXT_ALIGN_OPTIONS: { value: MenuHeroSlideTextAlign; label: string }[] = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Derecha" },
];

const CTA_STYLE_OPTIONS: { value: MenuHeroSlideCtaStyle; label: string; hint: string }[] = [
  { value: "none", label: "Sin acción", hint: "Solo título y mensaje" },
  { value: "button", label: "Botón", hint: "CTA destacado con fondo" },
  { value: "link", label: "Enlace", hint: "Texto clicable subrayado" },
];

export type HeroSlideFormFieldsProps = {
  title: string;
  onTitleChange: (value: string) => void;
  message: string;
  onMessageChange: (value: string) => void;
  ctaStyle: MenuHeroSlideCtaStyle;
  onCtaStyleChange: (value: MenuHeroSlideCtaStyle) => void;
  ctaLabel: string;
  onCtaLabelChange: (value: string) => void;
  ctaHref: string;
  onCtaHrefChange: (value: string) => void;
  sortOrder?: string;
  onSortOrderChange?: (value: string) => void;
  textAlign: MenuHeroSlideTextAlign;
  onTextAlignChange: (value: MenuHeroSlideTextAlign) => void;
  overlayOpacity: string;
  onOverlayOpacityChange: (value: string) => void;
  textColor: string | null;
  onTextColorChange: (value: string | null) => void;
  showAdvanced?: boolean;
};

export function HeroSlideFormFields({
  title,
  onTitleChange,
  message,
  onMessageChange,
  ctaStyle,
  onCtaStyleChange,
  ctaLabel,
  onCtaLabelChange,
  ctaHref,
  onCtaHrefChange,
  sortOrder,
  onSortOrderChange,
  textAlign,
  onTextAlignChange,
  overlayOpacity,
  onOverlayOpacityChange,
  textColor,
  onTextColorChange,
  showAdvanced = true,
}: HeroSlideFormFieldsProps) {
  const showCtaFields = ctaStyle === "button" || ctaStyle === "link";

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-lg border border-border bg-muted/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contenido</p>
        <TextField
          label="Título"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Ej. Tu tienda, más cerca"
        />
        <TextField
          label="Mensaje"
          type="textarea"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Texto de apoyo bajo el título"
          rows={3}
        />
        <HeroSlideTextColorField value={textColor} onChange={onTextColorChange} />
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acción</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {CTA_STYLE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition ${
                ctaStyle === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="hero-slide-cta-style"
                  value={opt.value}
                  checked={ctaStyle === opt.value}
                  onChange={() => onCtaStyleChange(opt.value)}
                  className="accent-primary"
                />
                {opt.label}
              </span>
              <span className="text-xs text-muted-foreground">{opt.hint}</span>
            </label>
          ))}
        </div>
        {showCtaFields ? (
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label={ctaStyle === "button" ? "Texto del botón" : "Texto del enlace"}
              value={ctaLabel}
              onChange={(e) => onCtaLabelChange(e.target.value)}
              placeholder={ctaStyle === "button" ? "Ver productos" : "Conoce más"}
            />
            <TextField
              label="URL de destino"
              value={ctaHref}
              onChange={(e) => onCtaHrefChange(e.target.value)}
              placeholder="#productos, /productos o https://…"
            />
          </div>
        ) : null}
      </div>

      {showAdvanced ? (
        <div
          className={`grid gap-4 ${
            onSortOrderChange != null && sortOrder != null ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          {onSortOrderChange != null && sortOrder != null ? (
            <TextField
              label="Orden (desde 1)"
              value={sortOrder}
              onChange={(e) => onSortOrderChange(e.target.value)}
            />
          ) : null}
          <TextField
            label="Opacidad overlay (0–90)"
            value={overlayOpacity}
            onChange={(e) => onOverlayOpacityChange(e.target.value)}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">Alineación del texto</span>
            <select
              className="min-h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={textAlign}
              onChange={(e) => onTextAlignChange(e.target.value as MenuHeroSlideTextAlign)}
            >
              {TEXT_ALIGN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}
