import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { UnitDimension, UnitListItem } from "../types/unit.types";
import { UNIT_DIMENSIONS } from "../types/unit.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

function isDimension(v: string): v is UnitDimension {
  return (UNIT_DIMENSIONS as readonly string[]).includes(v);
}

function normalizeUnit(row: unknown): UnitListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const name = o.name != null ? String(o.name).trim() : "";
  const symbolTrim = o.symbol != null ? String(o.symbol).trim() : "";
  const symbol = symbolTrim.length > 0 ? symbolTrim : "—";
  const dimRaw =
    o.dimension != null ? String(o.dimension).trim().toLowerCase() : "";
  if (!id || !name || !isDimension(dimRaw)) {
    return null;
  }
  const baseId =
    o.baseUnitId != null && String(o.baseUnitId).length > 0 ? String(o.baseUnitId) : null;
  return {
    id,
    name,
    symbol,
    dimension: dimRaw,
    conversionFactor:
      typeof o.conversionFactor === "number"
        ? o.conversionFactor
        : Number(o.conversionFactor) || 0,
    allowDecimals: o.allowDecimals !== false,
    isBase: o.isBase === true,
    baseUnitId: baseId,
    baseUnitName:
      o.baseUnitName != null && String(o.baseUnitName) ? String(o.baseUnitName) : null,
    baseUnitSymbol:
      o.baseUnitSymbol != null && String(o.baseUnitSymbol)
        ? String(o.baseUnitSymbol)
        : null,
    activeDerivedCount:
      typeof o.activeDerivedCount === "number"
        ? o.activeDerivedCount
        : Number(o.activeDerivedCount) || 0,
    active: o.active !== false,
    isDefault: o.isDefault === true,
  };
}

async function errorMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const m = data.message;
  if (Array.isArray(m)) {
    return m.map(String).join("; ");
  }
  if (typeof m === "string" && m.trim()) {
    return m;
  }
  const t = await res.text().catch(() => "");
  return t || res.statusText;
}

export class UnitRequest {
  static async findAll(): Promise<
    { success: true; units: UnitListItem[] } | { success: false; error: string; units: [] }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("units"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res), units: [] };
      }
      const json = (await res.json()) as unknown;
      if (!Array.isArray(json)) {
        return { success: true, units: [] };
      }
      const units = json.map(normalizeUnit).filter((x): x is UnitListItem => x != null);
      return { success: true, units };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar unidades";
      return { success: false, error: err, units: [] };
    }
  }

  static async findById(
    id: string,
  ): Promise<{ success: true; unit: UnitListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`units/${encodeURIComponent(id)}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      const data = (await res.json()) as unknown;
      const u = normalizeUnit(data);
      if (!u) {
        return { success: false, error: "Unidad no encontrada" };
      }
      return { success: true, unit: u };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al cargar unidad";
      return { success: false, error: err };
    }
  }

  static async create(body: {
    name: string;
    symbol: string;
    dimension: UnitDimension;
    conversionFactor: number;
    allowDecimals: boolean;
    isBase: boolean;
    baseUnitId?: string | null;
    isDefault?: boolean;
  }): Promise<{ success: true; unit: UnitListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      name: body.name.trim(),
      symbol: body.symbol.trim(),
      dimension: body.dimension,
      conversionFactor: body.isBase ? 1 : body.conversionFactor,
      allowDecimals: body.allowDecimals,
      isBase: body.isBase,
    };
    if (body.isDefault === true) {
      payload.isDefault = true;
    }
    if (!body.isBase && body.baseUnitId) {
      payload.baseUnitId = body.baseUnitId;
    }
    try {
      const res = await fetch(apiUrl("units"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      const data = (await res.json()) as unknown;
      const u = normalizeUnit(data);
      if (!u) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, unit: u };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear unidad";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: {
      name: string;
      symbol: string;
      dimension: UnitDimension;
      conversionFactor: number;
      allowDecimals: boolean;
      isBase: boolean;
      baseUnitId?: string | null;
      active: boolean;
      isDefault?: boolean;
    },
  ): Promise<{ success: true; unit: UnitListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      name: body.name.trim(),
      symbol: body.symbol.trim(),
      dimension: body.dimension,
      conversionFactor: body.isBase ? 1 : body.conversionFactor,
      allowDecimals: body.allowDecimals,
      isBase: body.isBase,
      active: body.active,
    };
    if (body.isDefault !== undefined) {
      payload.isDefault = body.isDefault;
    }
    if (!body.isBase && body.baseUnitId) {
      payload.baseUnitId = body.baseUnitId;
    } else if (body.isBase) {
      payload.baseUnitId = null;
    }
    try {
      const res = await fetch(apiUrl(`units/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      const data = (await res.json()) as unknown;
      const u = normalizeUnit(data);
      if (!u) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, unit: u };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar unidad";
      return { success: false, error: err };
    }
  }

  static async updatePartial(
    id: string,
    body: { active?: boolean; isDefault?: boolean },
  ): Promise<{ success: true; unit: UnitListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`units/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      const data = (await res.json()) as unknown;
      const u = normalizeUnit(data);
      if (!u) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, unit: u };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar unidad";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`units/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      const data = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: "No se pudo eliminar" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar";
      return { success: false, error: err };
    }
  }
}
