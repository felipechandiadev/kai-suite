"use server";

import { revalidatePath } from "next/cache";
import { DiningRoomRequest } from "../infrastructure/dining-room.request";
import type {
  CreateDiningRoomInput,
  DiningRoomActionResult,
  DiningTableItem,
  UpdateDiningRoomInput,
} from "../types/dining-room.types";

const LIST_PATH = "/kaifood/rooms";

export async function createDiningRoomAction(
  input: CreateDiningRoomInput,
): Promise<DiningRoomActionResult> {
  const room = await DiningRoomRequest.create(input);
  if (!room) {
    return {
      success: false,
      message:
        "No se pudo crear el salón. Verifica que el backend esté activo en http://localhost:5030.",
    };
  }
  revalidatePath(LIST_PATH, "page");
  return { success: true, room };
}

export async function updateDiningRoomAction(
  input: UpdateDiningRoomInput,
): Promise<DiningRoomActionResult> {
  const { id, ...rest } = input;
  const room = await DiningRoomRequest.update(id, rest);
  if (!room) {
    return { success: false, message: "No se pudo actualizar el salón." };
  }
  revalidatePath(LIST_PATH, "page");
  revalidatePath(`${LIST_PATH}/${id}`, "page");
  return { success: true, room };
}

export async function saveDiningFloorPlanAction(
  roomId: string,
  floorPlan: Record<string, unknown>,
  tables: DiningTableItem[],
): Promise<{ success: boolean; message?: string }> {
  const [fpOk, tablesOk] = await Promise.all([
    DiningRoomRequest.saveFloorPlan(roomId, floorPlan),
    DiningRoomRequest.upsertTables(roomId, tables),
  ]);
  if (!fpOk || !tablesOk) {
    return { success: false, message: "No se pudo guardar el plano." };
  }
  revalidatePath(`${LIST_PATH}/${roomId}`, "page");
  return { success: true };
}
