"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ESHOP_HERO } from "@/features/e-shop-storefront/constants/hero";
import type { EShopHeroSlide } from "@/features/e-shop-storefront/types/storefront.types";
import { storeContentContainerClassName } from "@/shared/layout/store-content-layout";
import {
  getHeroSlideTextPresentation,
  heroSlideLinkCtaStyle,
  heroSlideSubtitleStyle,
  heroSlideTitleStyle,
} from "@/shared/utils/hero-slide-text-color";
import { resolveHeroAutoplayMs } from "@/shared/components/eshop-hero-autoplay";

const DEFAULT_AUTOPLAY_SECONDS = 6;
/** Duración del fundido entre slides (no resta al tiempo configurado en admin). */
const HERO_CROSSFADE_MS = 800;

const heroSlideLayerClassName = (active: boolean, animate: boolean) =>
  [
    "absolute inset-0 flex flex-col transition-opacity",
    animate ? "duration-700 ease-in-out" : "duration-0",
    active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
  ].join(" ");

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return prefersReducedMotion;
}

const TEXT_ALIGN_CLASS: Record<EShopHeroSlide["textAlign"], string> = {
  left: "items-start text-left",
  center: "items-center text-center mx-auto",
  right: "items-end text-right ml-auto",
};

const heroCarouselContentClassName =
  "mx-auto w-full max-w-6xl px-14 md:px-4";

/** Zona reservada bajo el copy; los indicadores viven fuera del área de texto. */
const heroCarouselCopyShellClassName =
  "relative z-10 flex min-h-0 flex-1 flex-col justify-end pb-2 pt-16 text-foreground md:pb-3";

const heroCarouselIndicatorsClassName =
  "relative z-20 flex h-11 shrink-0 items-center justify-center gap-2 md:h-12";

function FallbackHero() {
  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 eshop-hero-section-shadow"
    >
      <div className="flex min-h-[320px] flex-col justify-end pb-5 pt-16 text-foreground md:min-h-[480px] md:pb-6">
        <div className={storeContentContainerClassName}>
          <div className="max-w-2xl eshop-hero-text-shadow">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-4xl lg:text-5xl">{ESHOP_HERO.title}</h1>
            <p className="mt-3 text-xs text-muted-foreground sm:text-sm md:mt-4 md:text-lg">{ESHOP_HERO.subtitle}</p>
            <Link
              href={ESHOP_HERO.ctaTarget}
              className="mt-6 inline-flex min-h-[40px] items-center rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-primary md:mt-8 md:min-h-[44px] md:px-6 md:py-3 md:text-sm"
            >
              {ESHOP_HERO.ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function resolveCtaStyle(slide: EShopHeroSlide): "none" | "button" | "link" {
  if (slide.ctaStyle === "button" || slide.ctaStyle === "link" || slide.ctaStyle === "none") {
    return slide.ctaStyle;
  }
  return slide.ctaLabel?.trim() ? "button" : "none";
}

function HeroCta({ slide }: { slide: EShopHeroSlide }) {
  const ctaStyle = resolveCtaStyle(slide);
  if (ctaStyle === "none" || !slide.ctaLabel?.trim()) return null;
  const href = slide.ctaHref?.trim() || "#productos";
  const isExternal = href.startsWith("http://") || href.startsWith("https://");
  const linkStyle = heroSlideLinkCtaStyle(slide.textColor);

  if (ctaStyle === "link") {
    const presentation = getHeroSlideTextPresentation(slide.textColor);
    const linkClass = presentation.usesCustomColor
      ? "mt-6 inline-block text-xs font-medium underline underline-offset-4 transition hover:opacity-80 md:mt-8 md:text-base"
      : "mt-6 inline-block text-xs font-medium text-foreground underline underline-offset-4 transition hover:text-muted-foreground md:mt-8 md:text-base";
    if (isExternal) {
      return (
        <a href={href} className={linkClass} style={linkStyle} target="_blank" rel="noopener noreferrer">
          {slide.ctaLabel}
        </a>
      );
    }
    return (
      <Link href={href} className={linkClass} style={linkStyle}>
        {slide.ctaLabel}
      </Link>
    );
  }

  const buttonClass =
    "mt-6 inline-flex min-h-[40px] items-center rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-primary transition hover:opacity-95 [text-shadow:none] md:mt-8 md:min-h-[44px] md:px-6 md:py-3 md:text-sm";

  if (isExternal) {
    return (
      <a href={href} className={buttonClass} style={{ textShadow: "none" }} target="_blank" rel="noopener noreferrer">
        {slide.ctaLabel}
      </a>
    );
  }

  return (
    <Link href={href} className={buttonClass} style={{ textShadow: "none" }}>
      {slide.ctaLabel}
    </Link>
  );
}

function HeroSlideBackground({ slide }: { slide: EShopHeroSlide }) {
  if (slide.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={slide.imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
        decoding="async"
      />
    );
  }
  return <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />;
}

function HeroSlideCopy({ slide }: { slide: EShopHeroSlide }) {
  const alignClass = TEXT_ALIGN_CLASS[slide.textAlign] ?? TEXT_ALIGN_CLASS.left;
  const presentation = getHeroSlideTextPresentation(slide.textColor);
  const titleStyle = heroSlideTitleStyle(slide.textColor);
  const subtitleStyle = heroSlideSubtitleStyle(slide.textColor);

  return (
    <div className={`flex w-full max-w-2xl flex-col ${alignClass} max-md:max-w-none`}>
      {slide.title ? (
        <h1
          className={`text-xl font-bold tracking-tight sm:text-2xl md:text-4xl lg:text-5xl ${presentation.usesCustomColor ? "" : "text-foreground eshop-hero-text-shadow"}`}
          style={titleStyle}
        >
          {slide.title}
        </h1>
      ) : null}
      {slide.subtitle ? (
        <p
          className={`mt-3 text-xs sm:text-sm md:mt-4 md:text-xl ${presentation.usesCustomColor ? "" : "text-muted-foreground eshop-hero-text-shadow"}`}
          style={subtitleStyle}
        >
          {slide.subtitle}
        </p>
      ) : null}
      <HeroCta slide={slide} />
    </div>
  );
}

/** Un solo slide activo: hero estático, sin controles ni autoplay. */
function EShopHero({ slide }: { slide: EShopHeroSlide }) {
  return (
    <section id="hero" className="relative w-full overflow-hidden eshop-hero-section-shadow">
      <div className="relative min-h-[320px] w-full md:min-h-[480px]">
        <HeroSlideBackground slide={slide} />
        <div className="relative z-10 flex min-h-[320px] flex-col justify-end pb-5 pt-16 text-foreground md:min-h-[480px] md:pb-6">
          <div className={storeContentContainerClassName}>
            <HeroSlideCopy slide={slide} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Dos o más slides: carrusel con flechas, puntos y autoplay. */
function resolveAutoplayMs(autoplaySeconds: number): number {
  return resolveHeroAutoplayMs(autoplaySeconds);
}

function EShopHeroCarousel({
  slides,
  autoplaySeconds,
}: {
  slides: EShopHeroSlide[];
  autoplaySeconds: number;
}) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const prefersReducedMotion = usePrefersReducedMotion();
  const animateSlides = !prefersReducedMotion;

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const autoplayMs = resolveAutoplayMs(autoplaySeconds);

  useEffect(() => {
    if (prefersReducedMotion || count < 2) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        setIndex((i) => (i + 1) % count);
      }, autoplayMs);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        return;
      }
      schedule();
    };

    if (document.visibilityState !== "hidden") {
      schedule();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [index, count, autoplayMs, prefersReducedMotion]);

  return (
    <section
      id="hero"
      className="relative flex min-h-[360px] w-full flex-col overflow-hidden eshop-hero-section-shadow md:min-h-[480px]"
      aria-roledescription="carousel"
      aria-label="Destacados de la tienda"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.id}
              className={heroSlideLayerClassName(active, animateSlides)}
              role="group"
              aria-roledescription="slide"
              aria-label={slide.title ?? `Slide ${i + 1}`}
              aria-hidden={!active}
              style={animateSlides ? { transitionDuration: `${HERO_CROSSFADE_MS}ms` } : undefined}
            >
              <HeroSlideBackground slide={slide} />
              <div className={heroCarouselCopyShellClassName}>
                <div className={heroCarouselContentClassName}>
                  <HeroSlideCopy slide={slide} />
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground eshop-hero-carousel-nav-shadow transition hover:bg-muted md:left-5"
          aria-label="Slide anterior"
          onClick={() => goTo(index - 1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground eshop-hero-carousel-nav-shadow transition hover:bg-muted md:right-5"
          aria-label="Slide siguiente"
          onClick={() => goTo(index + 1)}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className={heroCarouselIndicatorsClassName}>
        {slides.map((slide, i) => {
          const presentation = getHeroSlideTextPresentation(slide.textColor);
          const active = i === index;
          const useThemeIndicators = !presentation.usesCustomColor;

          return (
            <button
              key={slide.id}
              type="button"
              className={`h-2.5 rounded-full transition-all duration-500 ease-in-out ${
                useThemeIndicators ? "eshop-hero-carousel-indicator-shadow" : ""
              } ${useThemeIndicators ? (active ? "w-8 bg-foreground" : "w-2.5 bg-foreground/40 hover:bg-foreground/60") : active ? "w-8" : "w-2.5 hover:opacity-80"}`}
              style={useThemeIndicators ? undefined : presentation.indicatorStyle(active)}
              aria-label={`Ir al slide ${i + 1}`}
              aria-current={active ? "true" : undefined}
              onClick={() => goTo(i)}
            />
          );
        })}
      </div>
    </section>
  );
}

export function EShopHeroSlider({
  slides,
  autoplaySeconds = DEFAULT_AUTOPLAY_SECONDS,
}: {
  slides: EShopHeroSlide[];
  autoplaySeconds?: number;
}) {
  if (slides.length === 0) {
    return <FallbackHero />;
  }
  if (slides.length === 1) {
    return <EShopHero slide={slides[0]} />;
  }
  return <EShopHeroCarousel slides={slides} autoplaySeconds={autoplaySeconds} />;
}
