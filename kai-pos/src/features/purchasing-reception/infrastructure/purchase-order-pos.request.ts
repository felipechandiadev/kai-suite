import { TransactionsSearchPosRequest } from "./transactions-search-pos.request";
import { PurchasingDetailPosRequest } from "./purchasing-detail-pos.request";
import type { PurchasingTransactionDetailResult } from "../types/purchasing-detail.types";

export class PurchaseOrderPosRequest {
  static async searchForReception(
    query: string,
  ): Promise<{ rows: Array<{ id: string; documentNumber: string }> }> {
    const q = query.trim();
    if (!q) return { rows: [] };
    const result = await TransactionsSearchPosRequest.search({
      page: 1,
      limit: 20,
      type: "PURCHASE_ORDER",
      search: q,
    });
    return {
      rows: result.rows
        .map((raw) => {
          if (!raw || typeof raw !== "object") return null;
          const o = raw as Record<string, unknown>;
          const id = o.id != null ? String(o.id) : "";
          if (!id) return null;
          const documentNumber =
            typeof o.documentNumber === "string" && o.documentNumber.trim()
              ? o.documentNumber.trim()
              : id;
          return { id, documentNumber };
        })
        .filter((x): x is { id: string; documentNumber: string } => x != null),
    };
  }

  static async getTransactionDetail(transactionId: string): Promise<PurchasingTransactionDetailResult> {
    return PurchasingDetailPosRequest.getTransactionById(transactionId);
  }
}
