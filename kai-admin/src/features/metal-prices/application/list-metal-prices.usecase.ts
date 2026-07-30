import { MetalPriceRequest } from "../infrastructure/metal-price.request";
import type { MetalPriceRow } from "../types/metal-price.types";

export class ListMetalPricesUseCase {
  static async execute(): Promise<
    { success: true; rows: MetalPriceRow[] } | { success: false; error: string; rows: [] }
  > {
    return MetalPriceRequest.findAll();
  }
}
