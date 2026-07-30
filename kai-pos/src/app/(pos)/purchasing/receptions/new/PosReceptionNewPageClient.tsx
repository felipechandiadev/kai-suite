"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PurchaseDocumentBuilder } from "@/shared/components/PurchaseDocumentBuilder";
import type { PurchasingVariantSearchResult } from "@/features/purchasing-reception/types/purchasing-document.types";
import { createDirectReceptionPosAction } from "@/features/purchasing-reception/actions/create-direct-reception.action";
import { searchPurchaseOrdersForReceptionPosAction } from "@/features/purchasing-reception/actions/search-purchase-orders.action";
import { getPurchasingTransactionDetailPosAction } from "@/features/purchasing-reception/actions/get-purchase-order-detail.action";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import type {
  CreateDirectReceptionInput,
  CreateReceptionResult,
} from "@/features/purchasing-reception/types/reception.types";

type Props = {
  variantSearch: PurchasingVariantSearchResult;
  searchQuery: string;
  searchPage: number;
};

export default function PosReceptionNewPageClient({
  variantSearch,
  searchQuery,
  searchPage,
}: Props) {
  const router = useRouter();

  const saveReception = useCallback(async (input: CreateDirectReceptionInput) => {
    const ctx = readPosContextClient();
    const cashSessionId =
      typeof ctx?.cashSessionId === "string" ? ctx.cashSessionId.trim() : null;
    const pointOfSaleId =
      typeof ctx?.pointOfSaleId === "string" ? ctx.pointOfSaleId.trim() : null;
    const branchId =
      typeof ctx?.branchId === "string" && ctx.branchId.trim()
        ? ctx.branchId.trim()
        : input.branchId;

    return createDirectReceptionPosAction({
      ...input,
      branchId,
      cashSessionId,
      pointOfSaleId,
    });
  }, []);

  const onReceptionSaved = useCallback(
    (result: Extract<CreateReceptionResult, { success: true }>) => {
      if (result.internalDocumentNumber) {
        router.push(
          `/pos?receptionSaved=${encodeURIComponent(result.internalDocumentNumber)}`,
        );
      }
    },
    [router],
  );

  const emptyVariantSearch = useMemo(
    (): PurchasingVariantSearchResult => ({ items: [], page: 1, pageSize: 10, total: 0 }),
    [],
  );

  return (
    <div className="min-h-0 min-w-0" data-test-id="pos-receptions-new-page">
      <PurchaseDocumentBuilder
        mode="reception"
        variantSearch={variantSearch ?? emptyVariantSearch}
        searchQuery={searchQuery}
        searchPage={searchPage}
        onSaveReception={saveReception}
        onReceptionSaved={onReceptionSaved}
        fetchPurchaseOrderDetail={getPurchasingTransactionDetailPosAction}
        searchPurchaseOrders={searchPurchaseOrdersForReceptionPosAction}
        paymentCashContext="pos_cash_session"
      />
    </div>
  );
}
