"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "@kai/ui";
import type { EShopTestimonial } from "@/features/e-shop-storefront/types/storefront.types";
import { TestimonialCard } from "@/app/(store)/ui/TestimonialCard";

const MOBILE_PAGE_SIZE = 2;
const DESKTOP_VISIBLE_COUNT = 3;
const GAP_PX = 16;

function chunkTestimonials(items: EShopTestimonial[], size: number): EShopTestimonial[][] {
  const pages: EShopTestimonial[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

type Props = {
  testimonials: EShopTestimonial[];
};

function TestimonialsHeader({
  showNav,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: {
  showNav: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-base font-semibold md:text-xl">Qué dicen nuestros clientes</h2>
      {showNav ? (
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            icon="ChevronLeft"
            variant="text"
            size="md"
            ariaLabel="Testimonios anteriores"
            disabled={!canGoPrev}
            className="rounded-full border border-border bg-background/90"
            onClick={onPrev}
          />
          <IconButton
            icon="ChevronRight"
            variant="text"
            size="md"
            ariaLabel="Testimonios siguientes"
            disabled={!canGoNext}
            className="rounded-full border border-border bg-background/90"
            onClick={onNext}
          />
        </div>
      ) : null}
    </div>
  );
}

function MobileTestimonialsStack({ testimonials }: { testimonials: EShopTestimonial[] }) {
  const pages = useMemo(() => chunkTestimonials(testimonials, MOBILE_PAGE_SIZE), [testimonials]);
  const [pageIndex, setPageIndex] = useState(0);
  const maxPageIndex = Math.max(0, pages.length - 1);
  const showNav = pages.length > 1;

  useEffect(() => {
    setPageIndex((prev) => Math.min(prev, maxPageIndex));
  }, [maxPageIndex]);

  return (
    <div className="space-y-4 md:hidden">
      <TestimonialsHeader
        showNav={showNav}
        canGoPrev={pageIndex > 0}
        canGoNext={pageIndex < maxPageIndex}
        onPrev={() => setPageIndex((index) => Math.max(0, index - 1))}
        onNext={() => setPageIndex((index) => Math.min(maxPageIndex, index + 1))}
      />
      <div className="w-full overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${pageIndex * 100}%)` }}
          role="list"
          aria-live="polite"
        >
          {pages.map((page, pageKey) => (
            <div
              key={pageKey}
              className="flex w-full min-w-full shrink-0 flex-col gap-4"
              role="listitem"
            >
              {page.map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesktopTestimonialsRow({ testimonials }: { testimonials: EShopTestimonial[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [stepPx, setStepPx] = useState(0);

  const visibleCount = Math.min(DESKTOP_VISIBLE_COUNT, testimonials.length);
  const maxStart = Math.max(0, testimonials.length - visibleCount);
  const showNav = testimonials.length > visibleCount;

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || visibleCount < 1) {
      return;
    }
    const cardWidth = (viewport.clientWidth - GAP_PX * (visibleCount - 1)) / visibleCount;
    const nextStep = cardWidth + GAP_PX;
    setStepPx((prev) => (Math.abs(prev - nextStep) < 0.5 ? prev : nextStep));
  }, [visibleCount]);

  useEffect(() => {
    measure();
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [measure, testimonials.length]);

  useEffect(() => {
    setStartIndex((prev) => Math.min(prev, maxStart));
  }, [maxStart]);

  return (
    <div className="hidden space-y-4 md:block">
      <TestimonialsHeader
        showNav={showNav}
        canGoPrev={startIndex > 0}
        canGoNext={startIndex < maxStart}
        onPrev={() => setStartIndex((index) => Math.max(0, index - 1))}
        onNext={() => setStartIndex((index) => Math.min(maxStart, index + 1))}
      />
      <div ref={viewportRef} className="w-full overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            gap: GAP_PX,
            transform: stepPx > 0 ? `translateX(-${startIndex * stepPx}px)` : undefined,
          }}
          role="list"
          aria-live="polite"
        >
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="h-full w-full shrink-0"
              style={{
                width:
                  stepPx > 0
                    ? stepPx - GAP_PX
                    : `calc((100% - ${GAP_PX * (visibleCount - 1)}px) / ${visibleCount})`,
              }}
              role="listitem"
            >
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EShopTestimonialsCarousel({ testimonials }: Props) {
  if (testimonials.length === 0) {
    return null;
  }

  return (
    <>
      <MobileTestimonialsStack testimonials={testimonials} />
      <DesktopTestimonialsRow testimonials={testimonials} />
    </>
  );
}
