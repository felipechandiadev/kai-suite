"use server";

import { revalidatePath } from "next/cache";
import { ListPointsOfSaleUseCase } from "../application/list-points-of-sale.usecase";
import { CreatePointOfSaleUseCase } from "../application/create-point-of-sale.usecase";
import { UpdatePointOfSaleUseCase } from "../application/update-point-of-sale.usecase";
import { DeletePointOfSaleUseCase } from "../application/delete-point-of-sale.usecase";
import type { CreatePointOfSaleFormInput, UpdatePointOfSaleFormInput } from "../domain/point-of-sale.entity";
import type {
  CreatePointOfSaleResult,
  DeletePointOfSaleResult,
  PointOfSaleListItem,
  UpdatePointOfSaleResult,
} from "../types/point-of-sale.types";

const POS_PATH = "/sales/points-of-sale";

function revalidatePosRoute() {
  revalidatePath(POS_PATH, "page");
}

function revalidatePosDetailRoute(id: string) {
  revalidatePath(`${POS_PATH}/${id}`, "page");
}

/** Datos iniciales para la página (RSC), mismo patrón que sucursales / usuarios. */
export async function listPointsOfSaleForPage(): Promise<PointOfSaleListItem[]> {
  const list = await ListPointsOfSaleUseCase.execute();
  return list.success ? list.pointsOfSale : [];
}

export type GetPointOfSaleForPageResult =
  | { ok: true; point: PointOfSaleListItem }
  | { ok: false; error: string };

/** Carga un POS por id para la página de detalle. */
export async function getPointOfSaleForPage(id: string): Promise<GetPointOfSaleForPageResult> {
  const { PointOfSaleRequest } = await import("../infrastructure/point-of-sale.request");
  const res = await PointOfSaleRequest.findById(id);
  if (!res.success) {
    return { ok: false, error: res.error };
  }
  return { ok: true, point: res.pointOfSale };
}

export async function createPointOfSaleAction(
  input: CreatePointOfSaleFormInput,
): Promise<CreatePointOfSaleResult> {
  const result = await CreatePointOfSaleUseCase.execute(input);
  if (result.success) {
    revalidatePosRoute();
  }
  return result;
}

export async function updatePointOfSaleAction(
  input: UpdatePointOfSaleFormInput,
): Promise<UpdatePointOfSaleResult> {
  const result = await UpdatePointOfSaleUseCase.execute(input);
  if (result.success) {
    revalidatePosRoute();
    revalidatePosDetailRoute(input.id);
  }
  return result;
}

export async function deletePointOfSaleAction(id: string): Promise<DeletePointOfSaleResult> {
  const result = await DeletePointOfSaleUseCase.execute(id);
  if (result.success) {
    revalidatePosRoute();
  }
  return result;
}
