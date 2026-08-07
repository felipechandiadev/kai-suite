import { UpdatePointOfSaleFormSchema } from "../domain/point-of-sale.entity";
import { PointOfSaleRequest } from "../infrastructure/point-of-sale.request";
import type { UpdatePointOfSaleResult } from "../types/point-of-sale.types";

export class UpdatePointOfSaleUseCase {
  static async execute(input: unknown): Promise<UpdatePointOfSaleResult> {
    const parsed = UpdatePointOfSaleFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return PointOfSaleRequest.update(d.id, {
      name: d.name.trim(),
      branchId: d.branchId,
      storageId: d.storageId,
      deviceId: d.deviceId,
      isActive: d.isActive !== false,
      priceLists: d.priceLists,
      defaultPriceListId: d.defaultPriceListId ?? null,
      kind: d.kind,
      acceptsPresaleTickets: d.kind === "SALE" ? d.acceptsPresaleTickets : false,
      allowsDeferredPayment: d.kind === "SALE" ? d.allowsDeferredPayment : false,
      kaiFoodEnabled: d.kaiFoodEnabled,
    });
  }
}
