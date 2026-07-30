import { TaxRequest } from "../infrastructure/tax.request";
import type { DeleteTaxResult } from "../types/tax.types";

export class DeleteTaxUseCase {
  static async execute(id: string): Promise<DeleteTaxResult> {
    if (!id || typeof id !== "string") {
      return { success: false, error: "Identificador no válido" };
    }
    return TaxRequest.remove(id);
  }
}
