"use client";

import { IconButton, Select, type Option as SelectOption } from "@kai/ui";
import { POS_CUSTOMER_DETAIL_LIST_LIMIT_OPTIONS } from "@/features/customers/lib/pos-customer-detail-url";

export type PosSectionPaginationChange = { page: number; limit: number };

type Props = {
  page: number;
  limit: number;
  total: number;
  onChange: (next: PosSectionPaginationChange) => void;
  testId?: string;
};

const limitOptions: SelectOption[] = POS_CUSTOMER_DETAIL_LIST_LIMIT_OPTIONS.map((n) => ({
  id: String(n),
  label: String(n),
}));

/** Footer UX aligned with DataGrid Pagination (controlled / namespaced URL). */
export function PosSectionPagination({
  page: pageProp,
  limit: limitProp,
  total,
  onChange,
  testId = "pos-section-pagination",
}: Props) {
  const page = Math.max(1, pageProp || 1);
  const limit = Math.max(1, limitProp || 5);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / limit));

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 px-0 py-2"
      data-test-id={testId}
    >
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-xs font-normal text-foreground">
          Filas por página:
        </span>
        <Select
          options={limitOptions}
          placeholder=""
          value={limit}
          onChange={(newLimit: string | number | null) => {
            if (newLimit == null) return;
            onChange({ page: 1, limit: Number(newLimit) });
          }}
          variant="minimal"
          className="min-w-[112px]"
        />
      </div>

      <div className="flex-1 text-center text-xs text-muted-foreground">
        Registros totales: {total}
      </div>

      <div className="flex items-center gap-2 text-xs text-foreground">
        <IconButton
          icon="ChevronsLeft"
          variant="action"
          size="sm"
          className="cursor-pointer p-1"
          onClick={() => onChange({ page: 1, limit })}
          aria-label="Primera página"
          disabled={page <= 1}
        />
        <IconButton
          icon="ChevronLeft"
          variant="action"
          size="sm"
          className="cursor-pointer p-1"
          onClick={() => onChange({ page: Math.max(1, page - 1), limit })}
          aria-label="Anterior"
          disabled={page <= 1}
        />
        <div className="w-16 px-3 py-1 text-center text-xs font-normal text-foreground">
          {page} <span className="text-muted-foreground">/ {totalPages}</span>
        </div>
        <IconButton
          icon="ChevronRight"
          variant="action"
          size="sm"
          className="cursor-pointer p-1"
          onClick={() => onChange({ page: Math.min(totalPages, page + 1), limit })}
          aria-label="Siguiente"
          disabled={page >= totalPages}
        />
        <IconButton
          icon="ChevronsRight"
          variant="action"
          size="sm"
          className="cursor-pointer p-1"
          onClick={() => onChange({ page: totalPages, limit })}
          aria-label="Última página"
          disabled={page >= totalPages}
        />
      </div>
    </div>
  );
}
