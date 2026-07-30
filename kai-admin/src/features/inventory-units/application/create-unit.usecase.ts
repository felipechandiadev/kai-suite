import { CreateUnitFormSchema } from "../domain/unit.entity";
import { UnitRequest } from "../infrastructure/unit.request";
import type { CreateUnitResult } from "../types/unit.types";

export class CreateUnitUseCase {
  static async execute(input: unknown): Promise<CreateUnitResult> {
    const parsed = CreateUnitFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return UnitRequest.create({
      name: d.name.trim(),
      symbol: d.symbol.trim(),
      dimension: d.dimension,
      conversionFactor: d.isBase ? 1 : d.conversionFactor,
      allowDecimals: d.allowDecimals,
      isBase: d.isBase,
      baseUnitId: d.isBase ? null : (d.baseUnitId ?? null),
      isDefault: d.isDefault === true,
    });
  }
}
