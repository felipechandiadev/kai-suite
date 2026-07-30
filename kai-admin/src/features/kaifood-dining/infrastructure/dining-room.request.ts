import "server-only";

import { apiUrl, getBackendHeaders } from "@/shared/auth/backend-fetch";
import type {
  CreateDiningRoomInput,
  DiningRoomListItem,
  DiningTableItem,
  UpdateDiningRoomInput,
} from "../types/dining-room.types";

function mapTable(raw: Record<string, unknown>): DiningTableItem {
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    code: String(raw.code ?? ""),
    label: String(raw.label ?? raw.code ?? ""),
    capacity: Number(raw.capacity ?? 2),
    shape: raw.shape === "CIRCLE" ? "CIRCLE" : "RECT",
    x: Number(raw.x ?? 0),
    y: Number(raw.y ?? 0),
    width: Number(raw.width ?? 80),
    height: Number(raw.height ?? 80),
    rotation: Number(raw.rotation ?? 0),
  };
}

function mapRoom(raw: Record<string, unknown>): DiningRoomListItem {
  const tables = Array.isArray(raw.tables)
    ? raw.tables.map((t) => mapTable(t as Record<string, unknown>))
    : undefined;
  return {
    id: String(raw.id),
    branchId: String(raw.branchId),
    name: String(raw.name ?? ""),
    isActive: raw.isActive !== false,
    floorPlan:
      raw.floorPlan && typeof raw.floorPlan === "object"
        ? (raw.floorPlan as Record<string, unknown>)
        : null,
    tables,
  };
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(", ");
    if (body.message) return body.message;
  } catch {
    // ignore
  }
  return res.statusText;
}

export const DiningRoomRequest = {
  async list(branchId?: string): Promise<DiningRoomListItem[]> {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
    try {
      const res = await fetch(apiUrl(`/dining/rooms${qs}`), {
        headers: await getBackendHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("[DiningRoomRequest.list]", res.status, await readErrorMessage(res));
        return [];
      }
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((row) => mapRoom(row as Record<string, unknown>));
    } catch (error) {
      console.error("[DiningRoomRequest.list] fetch failed", error);
      return [];
    }
  },

  async getById(id: string): Promise<DiningRoomListItem | null> {
    try {
      const res = await fetch(apiUrl(`/dining/rooms/${id}`), {
        headers: await getBackendHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("[DiningRoomRequest.getById]", res.status, await readErrorMessage(res));
        return null;
      }
      return mapRoom((await res.json()) as Record<string, unknown>);
    } catch (error) {
      console.error("[DiningRoomRequest.getById] fetch failed", error);
      return null;
    }
  },

  async create(input: CreateDiningRoomInput): Promise<DiningRoomListItem | null> {
    try {
      const res = await fetch(apiUrl("/dining/rooms"), {
        method: "POST",
        headers: await getBackendHeaders(),
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        console.error("[DiningRoomRequest.create]", res.status, await readErrorMessage(res));
        return null;
      }
      return mapRoom((await res.json()) as Record<string, unknown>);
    } catch (error) {
      console.error("[DiningRoomRequest.create] fetch failed", error);
      return null;
    }
  },

  async update(
    id: string,
    input: Omit<UpdateDiningRoomInput, "id">,
  ): Promise<DiningRoomListItem | null> {
    try {
      const res = await fetch(apiUrl(`/dining/rooms/${id}`), {
        method: "PATCH",
        headers: await getBackendHeaders(),
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        console.error("[DiningRoomRequest.update]", res.status, await readErrorMessage(res));
        return null;
      }
      return mapRoom((await res.json()) as Record<string, unknown>);
    } catch (error) {
      console.error("[DiningRoomRequest.update] fetch failed", error);
      return null;
    }
  },

  async saveFloorPlan(
    id: string,
    floorPlan: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const res = await fetch(apiUrl(`/dining/rooms/${id}/floor-plan`), {
        method: "PUT",
        headers: await getBackendHeaders(),
        body: JSON.stringify({ floorPlan }),
      });
      return res.ok;
    } catch (error) {
      console.error("[DiningRoomRequest.saveFloorPlan] fetch failed", error);
      return false;
    }
  },

  async upsertTables(id: string, tables: DiningTableItem[]): Promise<boolean> {
    try {
      const res = await fetch(apiUrl(`/dining/rooms/${id}/tables`), {
        method: "PUT",
        headers: await getBackendHeaders(),
        body: JSON.stringify({ tables }),
      });
      return res.ok;
    } catch (error) {
      console.error("[DiningRoomRequest.upsertTables] fetch failed", error);
      return false;
    }
  },
};
