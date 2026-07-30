import { CreateAttributeFormSchema } from "../domain/attribute.entity";
import { AttributeRequest } from "../infrastructure/attribute.request";
import type { CreateAttributeResult } from "../types/attribute.types";

export class CreateAttributeUseCase {
  static async execute(input: unknown): Promise<CreateAttributeResult> {
    const parsed = CreateAttributeFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return AttributeRequest.create({
      name: d.name.trim(),
      description: d.description,
      options: d.options,
    });
  }
}
