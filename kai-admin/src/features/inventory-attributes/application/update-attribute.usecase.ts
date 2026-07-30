import { UpdateAttributeFormSchema } from "../domain/attribute.entity";
import { AttributeRequest } from "../infrastructure/attribute.request";
import type { UpdateAttributeResult } from "../types/attribute.types";

export class UpdateAttributeUseCase {
  static async execute(input: unknown): Promise<UpdateAttributeResult> {
    const parsed = UpdateAttributeFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return AttributeRequest.update(d.id, {
      name: d.name.trim(),
      description: d.description,
      options: d.options,
      isActive: d.isActive,
    });
  }
}
