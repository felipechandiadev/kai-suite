"use server";

import { getClientBackendApiBase } from "@/lib/backend-api";
import type { BoardSnapshot } from "../lib/board.types";
import { emptyBoardSnapshot } from "../lib/board.types";

function serverBackendBase(): string {
  const base =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    getClientBackendApiBase();
  return base.replace(/\/$/, "");
}

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

async function fetchBoardSnapshot(
  token: string,
): Promise<
  | { success: true; data: BoardSnapshot }
  | { success: false; error: string }
> {
  try {
    const res = await fetch(
      `${serverBackendBase()}/api/dining/board/snapshot`,
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
            : "Código inválido o pantalla revocada",
      };
    }
    return {
      success: true,
      data: parseSnapshot(data) ?? emptyBoardSnapshot(),
    };
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "No se pudo contactar al servidor";
    // Node a menudo reporta "fetch failed" / "Failed to fetch" sin detalle útil.
    if (/failed to fetch|fetch failed/i.test(msg)) {
      return {
        success: false,
        error: `No se pudo contactar al API (${serverBackendBase()}). ¿Está el backend en marcha?`,
      };
    }
    return { success: false, error: msg };
  }
}

/**
 * Valida el código de 6 dígitos contra el backend (server-side → sin CORS del browser).
 */
export async function validateBoardDisplayTokenAction(code: string): Promise<
  | { success: true; data: BoardSnapshot }
  | { success: false; error: string }
> {
  const token = String(code ?? "").replace(/\D/g, "");
  if (token.length !== 6) {
    return { success: false, error: "Ingrese el código de 6 dígitos." };
  }
  return fetchBoardSnapshot(token);
}

/** Snapshot del monitor (server-side → sin CORS del browser). */
export async function fetchBoardSnapshotAction(code: string): Promise<
  | { success: true; data: BoardSnapshot }
  | { success: false; error: string }
> {
  const token = String(code ?? "").replace(/\D/g, "");
  if (token.length !== 6) {
    return { success: false, error: "Código de pantalla inválido." };
  }
  return fetchBoardSnapshot(token);
}
