import "server-only";
import { PointOfSaleRequest } from "../infrastructure/point-of-sale.request";
import type { ListPointsOfSaleResult } from "../types/point-of-sale.types";

export class ListPointsOfSaleUseCase {
  static async execute(): Promise<ListPointsOfSaleResult> {
    return PointOfSaleRequest.findAll(true);
  }
}
