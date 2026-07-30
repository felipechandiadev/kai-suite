import "server-only";
import { PriceListRequest } from "../infrastructure/price-list.request";
import type { ListPriceListsResult } from "../types/price-list.types";

export class ListPriceListsUseCase {
  static async execute(): Promise<ListPriceListsResult> {
    return PriceListRequest.findAll(true);
  }
}
