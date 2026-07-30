"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { listFiscalEmissionsAction } from "../actions/fiscal.actions";
import type {
  FiscalEmissionRow,
  FiscalEmissionsFixedFilters,
  FiscalEmissionsListParams,
} from "../types/fiscal.types";

type EnvioFilter = "" | "PENDING" | "SENDING" | "SENT" | "FAILED" | "EPR" | "RCH";

type UseFiscalEmissionsListOptions = {
  initialItems: FiscalEmissionRow[];
  initialTotal: number;
  fixedFilters?: FiscalEmissionsFixedFilters;
  defaultLimit?: number;
  autoLoad?: boolean;
};

export function useFiscalEmissionsList({
  initialItems,
  initialTotal,
  fixedFilters,
  defaultLimit = 25,
  autoLoad = false,
}: UseFiscalEmissionsListOptions) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);
  const [statusFilter, setStatusFilter] = useState<EnvioFilter>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [folioSearch, setFolioSearch] = useState("");
  const [appliedFolio, setAppliedFolio] = useState<number | undefined>(undefined);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const buildParams = useCallback(
    (nextPage: number, nextLimit: number): FiscalEmissionsListParams => ({
      limit: nextLimit,
      offset: (nextPage - 1) * nextLimit,
      status: statusFilter || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      folio: appliedFolio,
      environment: "production",
      ...fixedFilters,
    }),
    [statusFilter, fromDate, toDate, appliedFolio, fixedFilters],
  );

  const fetchPage = useCallback(
    (nextPage: number, nextLimit: number) => {
      startTransition(async () => {
        setError("");
        const res = await listFiscalEmissionsAction(buildParams(nextPage, nextLimit));
        if (!res.success) {
          setError(res.error);
          return;
        }
        setItems(res.items);
        setTotal(res.total);
        setPage(nextPage);
        setLimit(nextLimit);
      });
    },
    [buildParams],
  );

  const applyFilters = useCallback(() => {
    const folioNum = folioSearch.trim() ? Number(folioSearch.trim()) : undefined;
    setAppliedFolio(folioNum != null && Number.isFinite(folioNum) ? folioNum : undefined);
    startTransition(async () => {
      setError("");
      const params: FiscalEmissionsListParams = {
        limit,
        offset: 0,
        status: statusFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        folio: folioNum != null && Number.isFinite(folioNum) ? folioNum : undefined,
        environment: "production",
        ...fixedFilters,
      };
      const res = await listFiscalEmissionsAction(params);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setItems(res.items);
      setTotal(res.total);
      setPage(1);
    });
  }, [folioSearch, fromDate, limit, statusFilter, toDate, fixedFilters]);

  const refreshCurrentPage = useCallback(() => {
    fetchPage(page, limit);
  }, [fetchPage, page, limit]);

  const fixedFiltersKey = JSON.stringify(fixedFilters ?? {});

  useEffect(() => {
    if (!autoLoad) return;
    fetchPage(1, defaultLimit);
    // Refetch when scoped filters change (e.g. different pack/sub-pack in dialog).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchPage already embeds fixedFilters via buildParams
  }, [autoLoad, defaultLimit, fixedFiltersKey]);

  return {
    items,
    setItems,
    total,
    page,
    limit,
    statusFilter,
    setStatusFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    folioSearch,
    setFolioSearch,
    error,
    setError,
    actionMessage,
    setActionMessage,
    isPending,
    fetchPage,
    applyFilters,
    refreshCurrentPage,
  };
}
