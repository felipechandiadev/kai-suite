import { PriceListRequest } from "../infrastructure/price-list.request";
import type { DeletePriceListResult } from "../types/price-list.types";

export class DeletePriceListUseCase {
  static async execute(id: string): Promise<DeletePriceListResult> {
    const t = String(id ?? "").trim();
    if (!t) {
      return { success: false, error: "Identificador requerido" };
    }
    return PriceListRequest.remove(t);
  }
}
