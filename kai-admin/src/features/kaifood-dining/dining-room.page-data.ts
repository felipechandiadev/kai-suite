import "server-only";

import { DiningRoomRequest } from "./infrastructure/dining-room.request";
import type { DiningRoomListItem } from "./types/dining-room.types";

export async function listDiningRoomsForPage(
  branchId?: string,
): Promise<DiningRoomListItem[]> {
  return DiningRoomRequest.list(branchId);
}

export async function getDiningRoomForPage(
  id: string,
): Promise<DiningRoomListItem | null> {
  return DiningRoomRequest.getById(id);
}
