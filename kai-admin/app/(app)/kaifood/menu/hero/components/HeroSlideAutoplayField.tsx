"use client";

import { NumberStepper } from "@kai/ui";
import {
  HERO_SLIDER_AUTOPLAY_MIN_SECONDS,
} from "@/features/menu-hero-slides/constants/hero-slider.constants";

type HeroSlideAutoplayFieldProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export function HeroSlideAutoplayField({ value, onChange, disabled }: HeroSlideAutoplayFieldProps) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Slider</p>
      <NumberStepper
        label="Tiempo por slide (segundos)"
        value={value}
        onChange={onChange}
        min={HERO_SLIDER_AUTOPLAY_MIN_SECONDS}
        step={1}
        allowNegative={false}
        allowFloat={false}
        disabled={disabled}
        data-test-id="hero-slide-autoplay-seconds"
      />
      <p className="text-xs text-muted-foreground">
        Aplica cuando hay 2 o más slides activos en la tienda. Mínimo {HERO_SLIDER_AUTOPLAY_MIN_SECONDS} segundos.
      </p>
    </div>
  );
}
