"use server";

import { revalidatePath } from "next/cache";
import { ListUnitsUseCase } from "../application/list-units.usecase";
import { CreateUnitUseCase } from "../application/create-unit.usecase";
import { UpdateUnitUseCase } from "../application/update-unit.usecase";
import { DeleteUnitUseCase } from "../application/delete-unit.usecase";
import { UnitRequest } from "../infrastructure/unit.request";
import type { CreateUnitFormInput, UpdateUnitFormInput } from "../domain/unit.entity";
import type {
  CreateUnitResult,
  DeleteUnitResult,
  UnitListItem,
  UpdateUnitResult,
} from "../types/unit.types";

const PATH = "/inventory/units";

function revalidateUnitsRoute() {
  revalidatePath(PATH, "page");
}

export async function listUnitsForPage(): Promise<UnitListItem[]> {
  const r = await ListUnitsUseCase.execute();
  return r.success ? r.units : [];
}

export async function createUnitAction(input: CreateUnitFormInput): Promise<CreateUnitResult> {
  const result = await CreateUnitUseCase.execute(input);
  if (result.success) {
    revalidateUnitsRoute();
  }
  return result;
}

export async function updateUnitAction(input: UpdateUnitFormInput): Promise<UpdateUnitResult> {
  const result = await UpdateUnitUseCase.execute(input);
  if (result.success) {
    revalidateUnitsRoute();
  }
  return result;
}

export async function updateUnitActiveAction(
  id: string,
  active: boolean,
): Promise<UpdateUnitResult> {
  const r = await UnitRequest.updatePartial(id, { active });
  if (r.success) {
    revalidateUnitsRoute();
  }
  return r;
}

export async function deleteUnitAction(id: string): Promise<DeleteUnitResult> {
  const result = await DeleteUnitUseCase.execute(id);
  if (result.success) {
    revalidateUnitsRoute();
  }
  return result;
}
