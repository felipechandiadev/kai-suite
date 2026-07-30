"use server";

import { ListPointsOfSaleUseCase } from "../application/list-points-of-sale.usecase";
import { OpenCashSessionUseCase } from "../application/open-cash-session.usecase";
import type { PointOfSaleListItem } from "../types/point-of-sale.types";
import type { OpenCashSessionInput } from "../domain/open-cash-session.entity";

export async function listPointsOfSaleForPage(): Promise<PointOfSaleListItem[]> {
  const list = await ListPointsOfSaleUseCase.execute();
  return list.success ? list.pointsOfSale : [];
}

export async function listPointsOfSaleForSetup(): Promise<
  | { success: true; pointsOfSale: PointOfSaleListItem[] }
  | { success: false; error: string; pointsOfSale: []; statusCode?: number }
> {
  return ListPointsOfSaleUseCase.execute();
}

export async function openCashSessionAction(input: OpenCashSessionInput) {
  return OpenCashSessionUseCase.execute(input);
}

