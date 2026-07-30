"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconButton } from "@kai/ui";
import { Select } from "@kai/ui";
import { patchCatalogSearchParams, replaceCatalogUrl } from "../lib/catalog-url";

type CatalogPaginationProps = {
  total: number;
  totalGeneral?: number;
};

const LIMIT_OPTIONS = [
  { id: "12", label: "12" },
  { id: "24", label: "24" },
  { id: "36", label: "36" },
  { id: "48", label: "48" },
];

export function CatalogPagination({ total, totalGeneral }: CatalogPaginationProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "24", 10));
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const updateUrl = (patch: Record<string, string | null | undefined>) => {
    const params = patchCatalogSearchParams(searchParams, patch);
    replaceCatalogUrl(router, pathname, params);
  };

  const handleLimitChange = (newLimit: number) => {
    updateUrl({ limit: String(newLimit), page: "1" });
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: String(newPage) });
  };

  if (total === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
      data-test-id="catalog-pagination"
    >
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-xs font-normal text-foreground">
          Productos por página:
        </span>
        <Select
          options={LIMIT_OPTIONS}
          placeholder=""
          value={limit}
          onChange={(newLimit) => newLimit && handleLimitChange(Number(newLimit))}
          variant="minimal"
          density="compact"
          className="min-w-[88px]"
        />
      </div>

      <div className="text-center text-xs text-muted-foreground sm:flex-1">
        {totalGeneral != null && totalGeneral !== total
          ? `Productos filtrados: ${total} de ${totalGeneral}`
          : `Productos totales: ${total}`}
      </div>

      <div className="flex items-center justify-end gap-2 text-xs text-foreground">
        <IconButton
          icon="ChevronsLeft"
          variant="action"
          size="sm"
          className="cursor-pointer p-1"
          onClick={() => handlePageChange(1)}
          disabled={page <= 1}
          aria-label="Primera página"
        />
        <IconButton
          icon="ChevronLeft"
          variant="action"
          size="sm"
          className="cursor-pointer p-1"
          onClick={() => handlePageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Anterior"
        />
        <div className="w-16 px-3 py-1 text-center text-xs font-normal text-foreground">
          {page} <span className="text-muted-foreground">/ {totalPages}</span>
        </div>
        <IconButton
          icon="ChevronRight"
          variant="action"
          size="sm"
          className="cursor-pointer p-1"
          onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Siguiente"
        />
        <IconButton
          icon="ChevronsRight"
          variant="action"
          size="sm"
          className="cursor-pointer p-1"
          onClick={() => handlePageChange(totalPages)}
          disabled={page >= totalPages}
          aria-label="Última página"
        />
      </div>
    </div>
  );
}
