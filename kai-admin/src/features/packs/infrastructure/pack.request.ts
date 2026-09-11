import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export type PackLineDto = {
  id?: string;
  inputVariantId: string;
  qtyPerOutputUnit: number;
  sortOrder?: number;
  inputSku?: string | null;
  inputProductName?: string | null;
};

export type PackCompositionDto = {
  id?: string;
  lines: PackLineDto[];
};

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  if (!token) throw new Error("No autenticado");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
  return headers;
}

function compositionFromUnknown(raw: unknown): PackCompositionDto {
  if (!raw || typeof raw !== "object") return { lines: [] };
  const data = raw as { id?: unknown; lines?: unknown };
  const linesRaw = Array.isArray(data.lines) ? data.lines : [];
  const lines: PackLineDto[] = linesRaw
    .map((line): PackLineDto | null => {
      if (!line || typeof line !== "object") return null;
      const l = line as Record<string, unknown>;
      const inputVariantId = l.inputVariantId != null ? String(l.inputVariantId) : "";
      if (!inputVariantId) return null;
      return {
        id: l.id != null ? String(l.id) : undefined,
        inputVariantId,
        qtyPerOutputUnit:
          typeof l.qtyPerOutputUnit === "number"
            ? l.qtyPerOutputUnit
            : Number(l.qtyPerOutputUnit) || 0,
        sortOrder: typeof l.sortOrder === "number" ? l.sortOrder : undefined,
        inputSku: l.inputSku != null ? String(l.inputSku) : null,
        inputProductName: l.inputProductName != null ? String(l.inputProductName) : null,
      };
    })
    .filter((line): line is PackLineDto => line != null);
  return {
    id: data.id != null ? String(data.id) : undefined,
    lines,
  };
}

export class PackRequest {
  static async getComposition(variantId: string): Promise<PackCompositionDto> {
    const res = await fetch(apiUrl(`/packs/variants/${encodeURIComponent(variantId)}/composition`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar composición pack (${res.status})`);
    }
    return compositionFromUnknown(await res.json());
  }

  static async upsertComposition(
    variantId: string,
    lines: Array<{ inputVariantId: string; qtyPerOutputUnit: number; sortOrder?: number }>,
  ): Promise<PackCompositionDto> {
    const res = await fetch(apiUrl(`/packs/variants/${encodeURIComponent(variantId)}/composition`), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ lines }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : `Error ${res.status}`;
      throw new Error(msg);
    }
    return compositionFromUnknown(await res.json());
  }

  static async pmpSummary(variantId: string): Promise<{ packPmp: number; lineCount: number }> {
    const res = await fetch(apiUrl(`/packs/variants/${encodeURIComponent(variantId)}/pmp-summary`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return { packPmp: 0, lineCount: 0 };
    }
    const data = (await res.json()) as { packPmp?: unknown; lineCount?: unknown };
    return {
      packPmp: Number(data.packPmp) || 0,
      lineCount: Number(data.lineCount) || 0,
    };
  }
}
