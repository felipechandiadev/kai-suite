"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Select, TextField } from "@kai/ui";
import { patchCatalogSearchParams, replaceCatalogUrl } from "../lib/catalog-url";
import type { EShopCatalogCategoryOption } from "../types/catalog.types";

type CatalogToolbarProps = {
  categories: EShopCatalogCategoryOption[];
};

export function CatalogToolbar({ categories }: CatalogToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoryId = searchParams.get("categoryId") ?? "";
  const urlSearch = searchParams.get("search") ?? "";
  const [searchDraft, setSearchDraft] = useState(urlSearch);

  useEffect(() => {
    setSearchDraft(urlSearch);
  }, [urlSearch]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const updateUrl = (patch: Record<string, string | null | undefined>) => {
    const params = patchCatalogSearchParams(searchParams, { page: "1", ...patch });
    replaceCatalogUrl(router, pathname, params);
  };

  const handleCategoryChange = (value: string | number | null) => {
    const next = value == null ? "" : String(value);
    updateUrl({ categoryId: next || null });
  };

  const handleSearchChange = (value: string) => {
    setSearchDraft(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateUrl({ search: value.trim() || null });
    }, 500);
  };

  const categoryOptions = [
    { id: "", label: "Todas las categorías" },
    ...categories.map((category) => ({ id: category.id, label: category.name })),
  ];

  return (
    <div
      className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:items-end"
      data-test-id="catalog-toolbar"
    >
      <Select
        label="Categoría"
        labelLayout="inline"
        options={categoryOptions}
        placeholder="Todas"
        value={categoryId}
        onChange={handleCategoryChange}
        className="min-w-0 w-full"
        data-test-id="catalog-category-filter"
      />

      <TextField
        label="Buscar"
        placeholder="Nombre, marca o categoría"
        value={searchDraft}
        onChange={(event) => handleSearchChange(event.target.value)}
        className="min-w-0 w-full"
        startAdornment={
          <Search
            className="h-4 w-4 shrink-0 text-secondary"
            strokeWidth={2}
            aria-hidden
          />
        }
        data-test-id="catalog-search"
      />
    </div>
  );
}
