import { CreateCategoryFormSchema } from "../domain/category.entity";
import { CategoryRequest } from "../infrastructure/category.request";
import type { CreateCategoryResult } from "../types/category.types";

export class CreateCategoryUseCase {
  static async execute(input: unknown): Promise<CreateCategoryResult> {
    const parsed = CreateCategoryFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return CategoryRequest.create({
      name: d.name.trim(),
      description: d.description,
      parentId: d.parentId,
      sortOrder: d.sortOrder,
      isActive: d.isActive,
    });
  }
}
