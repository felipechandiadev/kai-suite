import { UpdateCategoryFormSchema } from "../domain/category.entity";
import { CategoryRequest } from "../infrastructure/category.request";
import type { UpdateCategoryResult } from "../types/category.types";

export class UpdateCategoryUseCase {
  static async execute(input: unknown): Promise<UpdateCategoryResult> {
    const parsed = UpdateCategoryFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return CategoryRequest.update(d.id, {
      name: d.name.trim(),
      description: d.description,
      parentId: d.parentId,
      sortOrder: d.sortOrder,
      isActive: d.isActive,
    });
  }
}
