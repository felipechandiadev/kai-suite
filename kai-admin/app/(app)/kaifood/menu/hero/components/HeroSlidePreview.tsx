"use client";

import Link from "next/link";
import type {
  MenuHeroSlideCtaStyle,
  MenuHeroSlideRow,
  MenuHeroSlideTextAlign,
} from "@/features/menu-hero-slides/types/hero-slide.types";
import {
  getHeroSlideTextPresentation,
  heroSlideLinkCtaStyle,
  heroSlideSubtitleStyle,
  heroSlideTitleStyle,
} from "@/features/menu-hero-slides/utils/hero-slide-text-presentation";

const TEXT_ALIGN_CLASS: Record<MenuHeroSlideTextAlign, string> = {
  left: "items-start text-left",
  center: "items-center text-center mx-auto",
  right: "items-end text-right ml-auto",
};

function resolveCtaStyle(slide: Pick<MenuHeroSlideRow, "ctaStyle" | "ctaLabel">): MenuHeroSlideCtaStyle {
  if (slide.ctaStyle === "button" || slide.ctaStyle === "link" || slide.ctaStyle === "none") {
    return slide.ctaStyle;
  }
  return slide.ctaLabel?.trim() ? "button" : "none";
}

function PreviewCta({
  ctaStyle,
  ctaLabel,
  ctaHref,
  textColor,
}: {
  ctaStyle: MenuHeroSlideCtaStyle;
  ctaLabel: string | null;
  ctaHref: string | null;
  textColor: string | null;
}) {
  if (ctaStyle === "none" || !ctaLabel?.trim()) return null;
  const href = ctaHref?.trim() || "#productos";
  const isExternal = href.startsWith("http://") || href.startsWith("https://");
  const linkStyle = heroSlideLinkCtaStyle(textColor);

  if (ctaStyle === "link") {
    const presentation = getHeroSlideTextPresentation(textColor);
    const linkClass = presentation.usesCustomColor
      ? "mt-4 inline-block text-sm font-medium underline underline-offset-4 hover:opacity-80"
      : "mt-4 inline-block text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground";
    if (isExternal) {
      return (
        <a href={href} className={linkClass} style={linkStyle} target="_blank" rel="noopener noreferrer">
          {ctaLabel}
        </a>
      );
    }
    return (
      <Link href={href} className={linkClass} style={linkStyle}>
        {ctaLabel}
      </Link>
    );
  }

  const buttonClass =
    "mt-4 inline-flex min-h-9 items-center rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-primary [text-shadow:none]";

  if (isExternal) {
    return (
      <a href={href} className={buttonClass} style={{ textShadow: "none" }} target="_blank" rel="noopener noreferrer">
        {ctaLabel}
      </a>
    );
  }

  return (
    <Link href={href} className={buttonClass} style={{ textShadow: "none" }}>
      {ctaLabel}
    </Link>
  );
}

type HeroSlidePreviewProps = {
  slide: MenuHeroSlideRow;
  className?: string;
};

/** Vista previa estática de un slide (como en la carta: textos abajo + overlay). */
export function HeroSlidePreview({ slide, className = "" }: HeroSlidePreviewProps) {
  const alignClass = TEXT_ALIGN_CLASS[slide.textAlign] ?? TEXT_ALIGN_CLASS.left;
  const ctaStyle = resolveCtaStyle(slide);
  const presentation = getHeroSlideTextPresentation(slide.textColor);
  const titleStyle = heroSlideTitleStyle(slide.textColor);
  const subtitleStyle = heroSlideSubtitleStyle(slide.textColor);
  const overlay = Math.min(90, Math.max(0, Number(slide.overlayOpacity) || 45)) / 100;

  return (
    <div
      className={`relative min-h-[200px] w-full overflow-hidden md:min-h-[260px] ${className}`.trim()}
      data-test-id="hero-slide-preview"
    >
      {slide.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
      )}
      <div
        className="absolute inset-0 z-[1]"
        style={{ backgroundColor: `rgba(0,0,0,${overlay})` }}
        aria-hidden
      />
      <div className="relative z-10 flex h-full min-h-[200px] flex-col justify-end pb-12 pt-10 text-foreground md:min-h-[260px] md:pb-14">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className={`flex max-w-2xl flex-col ${alignClass}`}>
            {slide.title ? (
              <h2
                className={`text-xl font-bold tracking-tight md:text-2xl ${presentation.usesCustomColor ? "" : "text-foreground eshop-hero-text-shadow"}`}
                style={titleStyle}
              >
                {slide.title}
              </h2>
            ) : (
              <p className="text-sm italic text-muted-foreground">Sin título</p>
            )}
            {slide.subtitle ? (
              <p
                className={`mt-2 whitespace-pre-line text-sm md:text-base ${presentation.usesCustomColor ? "" : "text-muted-foreground eshop-hero-text-shadow"}`}
                style={subtitleStyle}
              >
                {slide.subtitle}
              </p>
            ) : null}
            <PreviewCta
              ctaStyle={ctaStyle}
              ctaLabel={slide.ctaLabel}
              ctaHref={slide.ctaHref}
              textColor={slide.textColor ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
