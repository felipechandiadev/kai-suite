"use client";

import { useEffect, useState } from "react";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { listPurchasingReferencePosAction } from "../actions/list-purchasing-reference.action";
import { listCashHubsForPurchasingPosAction } from "../actions/list-cash-hubs.action";
import type { TaxListItem } from "../types/tax.types";
import type { StorageListItem } from "../types/storage.types";
import type { SupplierGridRow } from "../types/supplier.types";
import type { CompanyBankAccountItem } from "../types/company.types";
import type { CashHubRow } from "../types/cash-hub.types";

export type PosPurchaseDocumentReferenceState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      suppliers: SupplierGridRow[];
      storages: StorageListItem[];
      taxes: TaxListItem[];
      branchId: string;
      companyBankAccounts: CompanyBankAccountItem[];
      cashHubs: CashHubRow[];
    };

export function usePosPurchaseDocumentReferenceData(): PosPurchaseDocumentReferenceState {
  const [state, setState] = useState<PosPurchaseDocumentReferenceState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const ctx = readPosContextClient();
    const branchId = typeof ctx?.branchId === "string" ? ctx.branchId.trim() : "";

    void (async () => {
      try {
        const [ref, cashHubs] = await Promise.all([
          listPurchasingReferencePosAction(),
          listCashHubsForPurchasingPosAction(),
        ]);
        if (cancelled) return;
        if (!branchId) {
          setState({
            status: "error",
            message: "No hay sucursal en el contexto POS. Vuelva a configurar la sesión.",
          });
          return;
        }
        setState({
          status: "ready",
          suppliers: ref.suppliers,
          storages: ref.storages,
          taxes: ref.taxes,
          branchId,
          companyBankAccounts: ref.companyBankAccounts,
          cashHubs,
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : "No se pudieron cargar los catálogos.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
