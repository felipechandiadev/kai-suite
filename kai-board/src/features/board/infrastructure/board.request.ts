import { getClientBackendApiBase } from "@/lib/backend-api";
import type { BoardSnapshot } from "../lib/board.types";
import { emptyBoardSnapshot } from "../lib/board.types";

function parseSnapshot(raw: unknown): BoardSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const preparing = Array.isArray(o.preparing) ? o.preparing : [];
  const ready = Array.isArray(o.ready) ? o.ready : [];
  return {
    companyId: typeof o.companyId === "string" ? o.companyId : "",
    branchId: typeof o.branchId === "string" ? o.branchId : "",
    preparing: preparing as BoardSnapshot["preparing"],
    ready: ready as BoardSnapshot["ready"],
    updatedAt:
      typeof o.updatedAt === "string"
        ? o.updatedAt
        : new Date().toISOString(),
  };
}

/**
 * Snapshot desde el browser (no Server Action): las actions de Next refrescan
 * la ruta RSC y remontan el monitor → cortan el WebSocket en bucle.
 */
export const BoardRequest = {
  async fetchSnapshot(
    displayToken: string,
  ): Promise<{ success: true; data: BoardSnapshot } | { success: false; error: string }> {
    const token = String(displayToken ?? "").replace(/\D/g, "");
    if (token.length !== 6) {
      return { success: false, error: "Código de pantalla inválido." };
    }
    try {
      const res = await fetch(
        `${getClientBackendApiBase()}/api/dining/board/snapshot`,
        {
          method: "GET",
          headers: {
            "X-Board-Display-Token": token,
          },
          cache: "no-store",
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error:
            typeof data.message === "string"
              ? data.message
              : "No se pudo cargar el monitor",
        };
      }
      return {
        success: true,
        data: parseSnapshot(data) ?? emptyBoardSnapshot(),
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error de red",
      };
    }
  },
};
