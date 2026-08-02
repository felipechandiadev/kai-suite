"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { fetchMenuProductAction } from "../actions/menu.action";
import type { MenuProductDetail } from "../infrastructure/menu.request";

function fmtClp(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatAttributeValues(values: Record<string, string>) {
  const parts = Object.entries(values)
    .map(([k, v]) => `${k}: ${v}`)
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function MenuProductDetailClient({ productId }: { productId: string }) {
  const [detail, setDetail] = useState<MenuProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const data = await fetchMenuProductAction(productId);
      if (!cancelled) {
        setDetail(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const imageUrl = useMemo(() => {
    if (!detail) return null;
    return (
      detail.imageUrl ??
      detail.multimedia.find((m) => m.isPrimary)?.publicUrl ??
      detail.multimedia[0]?.publicUrl ??
      null
    );
  }, [detail]);

  const priceFrom = useMemo(() => {
    if (!detail?.variants.length) return null;
    const prices = detail.variants.map((v) => v.basePrice).filter((n) => n > 0);
    if (!prices.length) return null;
    return Math.min(...prices);
  }, [detail]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-[var(--muted)]">
        Cargando producto…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-[var(--muted)]">Producto no encontrado en la carta.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-[var(--primary)]">
          Volver a la carta
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href="/#menu"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la carta
        </Link>

        <article className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={detail.name}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-[var(--background)] text-sm text-[var(--muted)]">
              Sin imagen
            </div>
          )}

          <div className="space-y-4 p-5 md:p-8">
            {detail.categoryName ? (
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--primary)]">
                {detail.categoryName}
              </p>
            ) : null}
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{detail.name}</h1>
            {priceFrom != null ? (
              <p className="text-lg font-medium">desde {fmtClp(priceFrom)}</p>
            ) : null}

            {detail.description ? (
              <div className="space-y-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">
                {detail.description}
              </div>
            ) : null}

            {detail.variants.length > 1 ? (
              <div className="border-t border-[var(--border)] pt-4">
                <h2 className="mb-2 text-sm font-semibold">Opciones</h2>
                <ul className="space-y-2">
                  {detail.variants.map((v) => {
                    const label = formatAttributeValues(v.attributeValues) ?? v.sku;
                    return (
                      <li
                        key={v.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span>{label}</span>
                        <span className="shrink-0 font-medium">{fmtClp(v.basePrice)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
