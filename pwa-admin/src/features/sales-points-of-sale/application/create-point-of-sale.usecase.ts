import { CreatePointOfSaleFormSchema } from "../domain/point-of-sale.entity";
import { PointOfSaleRequest } from "../infrastructure/point-of-sale.request";
import type { CreatePointOfSaleResult } from "../types/point-of-sale.types";

export class CreatePointOfSaleUseCase {
  static async execute(input: unknown): Promise<CreatePointOfSaleResult> {
    const parsed = CreatePointOfSaleFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return PointOfSaleRequest.create({
      name: d.name.trim(),
      branchId: d.branchId,
      storageId: d.storageId,
      deviceId: d.deviceId,
      isActive: d.isActive,
      priceLists: d.priceLists,
      defaultPriceListId: d.defaultPriceListId ?? null,
      kind: d.kind,
      acceptsPresaleTickets: d.kind === "SALE" ? d.acceptsPresaleTickets : false,
      allowsDeferredPayment: d.kind === "SALE" ? d.allowsDeferredPayment : false,
    });
  }
}
