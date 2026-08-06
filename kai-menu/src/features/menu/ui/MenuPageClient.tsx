"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { loadMenuHomeAction } from "../actions/menu.action";
import type { MenuCatalogItem, MenuCategory, MenuStorefront } from "../infrastructure/menu.request";
import { MenuHeroSlider } from "./MenuHeroSlider";
import { MenuThemeShell } from "./MenuThemeShell";

/** Anchors de secciones retiradas de la carta pública (por ahora). */
const RETIRED_NAV_HREFS = new Set(["#about", "#find-us"]);

function fmtClp(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function ProductCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-[var(--border)]/60" />
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <div className="h-4 w-[60%] animate-pulse rounded bg-[var(--border)]/60" />
        <div className="h-3 w-full animate-pulse rounded bg-[var(--border)]/40" />
        <div className="h-3 w-[40%] animate-pulse rounded bg-[var(--border)]/40" />
      </div>
    </div>
  );
}

function ProductImageSlot({ imageUrl }: { imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
    );
  }
  return <div className="h-20 w-20 shrink-0" aria-hidden />;
}

export function MenuPageClient() {
  const [store, setStore] = useState<MenuStorefront | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuCatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = opts?.soft === true;
    if (!soft) setLoading(true);
    setLoadFailed(false);
    try {
      const data = await loadMenuHomeAction({
        search,
        categoryIds: selectedCategoryIds.length ? selectedCategoryIds : undefined,
      });
      setStore(data.store);
      setCategories(data.categories);
      setItems(data.items);
    } catch {
      if (!soft) {
        setStore(null);
        setCategories([]);
        setItems([]);
        setLoadFailed(true);
      }
    } finally {
      if (!soft) setLoading(false);
    }
  }, [search, selectedCategoryIds]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Al volver a la pestaña (p. ej. tras crear un hero en admin), refrescar storefront sin skeleton. */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load({ soft: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const navLinks = useMemo(
    () =>
      (store?.topBar.navLinks ?? []).filter(
        (l) =>
          l.enabled !== false &&
          !RETIRED_NAV_HREFS.has((l.href ?? "").trim().toLowerCase()),
      ),
    [store],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, MenuCatalogItem[]>();
    for (const item of items) {
      const key = item.categoryName?.trim() || "Otros";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [items]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const allSelected = selectedCategoryIds.length === 0;

  if (loadFailed && !store) {
    return (
      <div className="p-8 text-center text-sm text-[var(--muted)]">
        Carta no disponible. Verifique la configuración del restaurante.
      </div>
    );
  }

  const content = (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {store?.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.companyLogoUrl}
                alt={store.companyName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : loading && !store ? (
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[var(--border)]/60" />
            ) : null}
            {store?.companyName ? (
              <span className="truncate text-lg font-semibold">{store.companyName}</span>
            ) : (
              <div className="h-5 w-36 animate-pulse rounded bg-[var(--border)]/60" />
            )}
          </div>
          <nav className="hidden gap-4 text-sm md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[var(--muted)] hover:text-[var(--primary)]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {(store?.heroSlides?.length ?? 0) > 0 ? (
        <MenuHeroSlider
          slides={store!.heroSlides}
          autoplaySeconds={store!.heroSliderAutoplaySeconds ?? 6}
        />
      ) : null}

      <section
        id="menu"
        className="sticky top-[57px] z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur"
      >
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en la carta…"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryIds([])}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                allSelected
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card)] text-[var(--muted)]"
              }`}
            >
              Todas
            </button>
            {loading && categories.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-6 w-16 shrink-0 animate-pulse rounded-full bg-[var(--border)]/50"
                  />
                ))
              : categories.map((cat) => {
                  const active = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                        active
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--card)] text-[var(--muted)]"
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-center text-sm text-[var(--muted)]">No hay productos en la carta.</p>
        ) : (
          <div className="space-y-8">
            {grouped.map(([categoryName, catItems]) => (
              <section key={categoryName}>
                <h2 className="mb-3 text-lg font-semibold text-[var(--primary)]">{categoryName}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {catItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/p/${item.productId}?variant=${item.id}`}
                      className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm transition hover:border-[var(--primary)]"
                    >
                      <ProductImageSlot imageUrl={item.imageUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium leading-snug">{item.name}</h3>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">
                            {fmtClp(Number(item.price) || 0)}
                          </span>
                        </div>
                        {item.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );

  return <MenuThemeShell theme={store?.theme ?? null}>{content}</MenuThemeShell>;
}
