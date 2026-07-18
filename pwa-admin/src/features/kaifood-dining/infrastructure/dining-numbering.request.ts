import "server-only";

import { apiUrl, getBackendHeaders } from "@/shared/auth/backend-fetch";
import type {
  DiningNumberingSettings,
  DiningNumberingSettingsResult,
} from "../types/dining-numbering.types";

function mapSettings(raw: Record<string, unknown>): DiningNumberingSettings {
  return {
    branchId: String(raw.branchId ?? ""),
    companyId: String(raw.companyId ?? ""),
    timezone: String(raw.timezone ?? "America/Santiago"),
    resetTimeLocal: String(raw.resetTimeLocal ?? "00:00:01"),
    allowWaiterOpenTable: raw.allowWaiterOpenTable !== false,
    allowPosOpenTable: raw.allowPosOpenTable === true,
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
  return res.statusText || `HTTP ${res.status}`;
}

export const DiningNumberingRequest = {
  async get(branchId: string): Promise<DiningNumberingSettingsResult> {
    const id = branchId.trim();
    if (!id) return { success: false, message: "Sucursal no indicada" };
    try {
      const res = await fetch(
        apiUrl(`/dining/branches/${encodeURIComponent(id)}/numbering-settings`),
        { headers: await getBackendHeaders(), cache: "no-store" },
      );
      if (!res.ok) {
        return { success: false, message: await readErrorMessage(res) };
      }
      const data = (await res.json()) as Record<string, unknown>;
      return { success: true, settings: mapSettings(data) };
    } catch (error) {
      console.error("[DiningNumberingRequest.get]", error);
      return { success: false, message: "No se pudo cargar la configuración" };
    }
  },

  async update(
    branchId: string,
    patch: {
      timezone?: string;
      resetTimeLocal?: string;
      allowWaiterOpenTable?: boolean;
      allowPosOpenTable?: boolean;
    },
  ): Promise<DiningNumberingSettingsResult> {
    const id = branchId.trim();
    if (!id) return { success: false, message: "Sucursal no indicada" };
    try {
      const res = await fetch(
        apiUrl(`/dining/branches/${encodeURIComponent(id)}/numbering-settings`),
        {
          method: "PATCH",
          headers: await getBackendHeaders(),
          body: JSON.stringify(patch),
          cache: "no-store",
        },
      );
      if (!res.ok) {
        return { success: false, message: await readErrorMessage(res) };
      }
      const data = (await res.json()) as Record<string, unknown>;
      return { success: true, settings: mapSettings(data) };
    } catch (error) {
      console.error("[DiningNumberingRequest.update]", error);
      return { success: false, message: "No se pudo guardar la configuración" };
    }
  },
};
