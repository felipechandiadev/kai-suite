import type { EShopTestimonial } from "@/features/e-shop-storefront/types/storefront.types";

function StarRating({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <p className="text-[10px] leading-none text-amber-600 md:text-sm" aria-label={`${clamped} de 5 estrellas`}>
      {"★".repeat(clamped)}
      {"☆".repeat(5 - clamped)}
      <span className="sr-only">{clamped} de 5</span>
    </p>
  );
}

export function TestimonialCard({ testimonial }: { testimonial: EShopTestimonial }) {
  const { clientName, rating, message, avatarUrl } = testimonial;
  const initial = clientName.trim().charAt(0).toUpperCase() || "?";

  return (
    <article className="flex aspect-video h-full w-full overflow-hidden rounded-xl border border-border bg-background">
      <div className="relative w-1/2 shrink-0 bg-muted">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center bg-primary/10 text-2xl font-semibold text-primary md:text-4xl"
            aria-hidden
          >
            {initial}
          </span>
        )}
      </div>
      <div className="flex w-1/2 min-w-0 flex-col justify-between p-2 md:p-4">
        <p className="line-clamp-4 text-xs leading-snug text-foreground md:text-sm md:leading-relaxed">&ldquo;{message}&rdquo;</p>
        <div className="mt-2 flex flex-col items-end gap-0.5 text-right md:mt-3 md:gap-1">
          <p className="text-[10px] font-semibold text-foreground md:text-sm">{clientName}</p>
          <StarRating rating={rating} />
        </div>
      </div>
    </article>
  );
}
