import { UpdateUnitFormSchema } from "../domain/unit.entity";
import { UnitRequest } from "../infrastructure/unit.request";
import type { UpdateUnitResult } from "../types/unit.types";

export class UpdateUnitUseCase {
  static async execute(input: unknown): Promise<UpdateUnitResult> {
    const parsed = UpdateUnitFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return UnitRequest.update(d.id, {
      name: d.name.trim(),
      symbol: d.symbol.trim(),
      dimension: d.dimension,
      conversionFactor: d.isBase ? 1 : d.conversionFactor,
      allowDecimals: d.allowDecimals,
      isBase: d.isBase,
      baseUnitId: d.isBase ? null : (d.baseUnitId ?? null),
      active: d.active,
      isDefault: d.isDefault,
    });
  }
}
