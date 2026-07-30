import { PointOfSaleRequest } from "../infrastructure/point-of-sale.request";
import type { DeletePointOfSaleResult } from "../types/point-of-sale.types";

export class DeletePointOfSaleUseCase {
  static async execute(id: string): Promise<DeletePointOfSaleResult> {
    if (!id?.trim()) {
      return { success: false, error: "Identificador requerido" };
    }
    return PointOfSaleRequest.remove(id.trim());
  }
}
