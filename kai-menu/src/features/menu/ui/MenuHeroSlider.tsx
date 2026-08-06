"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MenuStorefront } from "../infrastructure/menu.request";

type MenuHeroSlide = MenuStorefront["heroSlides"][number];

const DEFAULT_AUTOPLAY_SECONDS = 6;
const MIN_AUTOPLAY_SECONDS = 3;
const CROSSFADE_MS = 800;

function resolveAutoplayMs(autoplaySeconds: number): number {
  const seconds = Math.max(
    MIN_AUTOPLAY_SECONDS,
    Math.round(autoplaySeconds) || DEFAULT_AUTOPLAY_SECONDS,
  );
  return seconds * 1000;
}

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

function SlideLayer({
  slide,
  active,
  animate,
}: {
  slide: MenuHeroSlide;
  active: boolean;
  animate: boolean;
}) {
  const overlay = Math.min(90, Math.max(0, Number(slide.overlayOpacity) || 45)) / 100;
  const textColor = slide.textColor?.trim() || "#FFFFFF";

  return (
    <div
      className={[
        "absolute inset-0 flex flex-col transition-opacity",
        animate ? "duration-700 ease-in-out" : "duration-0",
        active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
      ].join(" ")}
      style={animate ? { transitionDuration: `${CROSSFADE_MS}ms` } : undefined}
      role="group"
      aria-roledescription="slide"
      aria-label={slide.title ?? "Slide"}
      aria-hidden={!active}
    >
      {slide.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/30 to-[var(--primary)]/5" />
      )}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0,0,0,${overlay})` }}
      />
      <div className="relative z-10 flex min-h-[280px] flex-1 flex-col justify-end px-6 pb-14 pt-16 md:min-h-[360px] md:px-10">
        <div className="mx-auto w-full max-w-5xl" style={{ color: textColor }}>
          {slide.title ? (
            <h1 className="text-2xl font-bold tracking-tight md:text-4xl">{slide.title}</h1>
          ) : null}
          {slide.subtitle ? (
            <p className="mt-2 max-w-2xl text-sm opacity-90 md:text-base">{slide.subtitle}</p>
          ) : null}
          {slide.ctaLabel?.trim() && slide.ctaHref?.trim() ? (
            <a
              href={slide.ctaHref}
              className="mt-5 inline-flex items-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
            >
              {slide.ctaLabel}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MenuHeroSlider({
  slides,
  autoplaySeconds = DEFAULT_AUTOPLAY_SECONDS,
}: {
  slides: MenuHeroSlide[];
  autoplaySeconds?: number;
}) {
  const visible = slides.filter((s) => s.imageUrl || s.title || s.subtitle);
  const [index, setIndex] = useState(0);
  const count = visible.length;
  const prefersReducedMotion = usePrefersReducedMotion();
  const animate = !prefersReducedMotion;
  const autoplayMs = resolveAutoplayMs(autoplaySeconds);

  const goTo = useCallback(
    (next: number) => {
      if (count < 1) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (prefersReducedMotion || count < 2) return;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
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
    if (document.visibilityState !== "hidden") schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [index, count, autoplayMs, prefersReducedMotion]);

  if (count === 0) return null;

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Destacados"
    >
      <div className="relative min-h-[280px] w-full md:min-h-[360px]">
        {visible.map((slide, i) => (
          <SlideLayer
            key={slide.id}
            slide={slide}
            active={i === index}
            animate={animate}
          />
        ))}

        {count > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/90 text-[var(--foreground)]"
              aria-label="Slide anterior"
              onClick={() => goTo(index - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/90 text-[var(--foreground)]"
              aria-label="Slide siguiente"
              onClick={() => goTo(index + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 py-4">
              {visible.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`pointer-events-auto h-2 rounded-full transition-all ${
                    i === index ? "w-7 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
                  }`}
                  aria-label={`Ir al slide ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
