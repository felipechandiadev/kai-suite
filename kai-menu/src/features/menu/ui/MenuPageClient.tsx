"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  fetchMenuCatalogAction,
  fetchMenuCategoriesAction,
  fetchMenuStorefrontAction,
} from "../actions/menu.action";
import type { MenuCatalogItem, MenuCategory, MenuStorefront } from "../infrastructure/menu.request";

type MenuHeroSlideView = MenuStorefront["heroSlides"][number];

function MenuHeroBanner({
  slides,
  fallbackTitle,
}: {
  slides: MenuHeroSlideView[];
  fallbackTitle: string;
}) {
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0];
  const textColor = slide?.textColor?.trim() || "#FFFFFF";
  const overlay = Math.min(90, Math.max(0, Number(slide?.overlayOpacity ?? 45))) / 100;

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [slides.length]);

  if (!slide) return null;

  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[42vh] w-full md:min-h-[52vh]">
        {slide.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slide.imageUrl}
            alt={slide.title || fallbackTitle}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--primary)]" />
        )}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${overlay})` }}
        />
        <div className="relative z-10 mx-auto flex min-h-[42vh] max-w-5xl flex-col justify-end px-4 py-10 md:min-h-[52vh] md:py-14">
          <h1
            className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl"
            style={{ color: textColor }}
          >
            {slide.title || fallbackTitle}
          </h1>
          {slide.subtitle ? (
            <p
              className="mt-3 max-w-xl text-base leading-relaxed md:text-lg"
              style={{ color: textColor, opacity: 0.92 }}
            >
              {slide.subtitle}
            </p>
          ) : null}
          {slide.ctaLabel && slide.ctaHref ? (
            <a
              href={slide.ctaHref}
              className="mt-6 inline-flex w-fit rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              {slide.ctaLabel}
            </a>
          ) : null}
        </div>
      </div>
      {slides.length > 1 ? (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full ${
                i === index ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function MenuPageClient() {
  const [store, setStore] = useState<MenuStorefront | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuCatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [sf, cats, catalog] = await Promise.all([
      fetchMenuStorefrontAction(),
      fetchMenuCategoriesAction(),
      fetchMenuCatalogAction({
        search,
        categoryIds: selectedCategoryIds.length ? selectedCategoryIds : undefined,
      }),
    ]);
    setStore(sf);
    setCategories(cats);
    setItems(catalog?.items ?? []);
    setLoading(false);
  }, [search, selectedCategoryIds]);

  useEffect(() => {
    void load();
  }, [load]);

  const navLinks = useMemo(
    () => (store?.topBar.navLinks ?? []).filter((l) => l.enabled !== false),
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

  if (loading && !store) {
    return <div className="p-8 text-center text-sm text-[var(--muted)]">Cargando carta…</div>;
  }

  if (!store) {
    return (
      <div className="p-8 text-center text-sm text-[var(--muted)]">
        Carta no disponible. Verifique la configuración del restaurante.
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {store.topBar.showLogo && store.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.companyLogoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : null}
            {store.topBar.showCompanyName ? (
              <span className="truncate text-lg font-semibold">{store.companyName}</span>
            ) : null}
          </div>
          <nav className="hidden gap-4 text-sm md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-[var(--muted)] hover:text-[var(--primary)]">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {store.heroSlides.length > 0 ? (
        <MenuHeroBanner slides={store.heroSlides} fallbackTitle={store.companyName} />
      ) : null}

      <section id="menu" className="sticky top-[57px] z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
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
            {categories.map((cat) => {
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
        {grouped.length === 0 ? (
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
                      href={`/p/${item.id}`}
                      className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm transition hover:border-[var(--primary)]"
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-20 w-20 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-[var(--background)] text-[10px] text-[var(--muted)]">
                          —
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        {item.description ? (
                          <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">
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

      <section id="find-us" className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-xl font-semibold">{store.findUs.title}</h2>
          {store.findUs.address ? <p className="mt-2 text-sm">{store.findUs.address}</p> : null}
          {store.findUs.phone ? <p className="mt-1 text-sm">{store.findUs.phone}</p> : null}
          {store.findUs.hours ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{store.findUs.hours}</p>
          ) : null}
        </div>
      </section>

      <section id="about" className="px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-xl font-semibold">{store.about.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">
            {store.about.body}
          </p>
        </div>
      </section>
    </div>
  );
}
