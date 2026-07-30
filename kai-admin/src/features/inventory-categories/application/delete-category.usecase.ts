import { CategoryRequest } from "../infrastructure/category.request";
import type { DeleteCategoryResult } from "../types/category.types";

export class DeleteCategoryUseCase {
  static async execute(id: string): Promise<DeleteCategoryResult> {
    return CategoryRequest.remove(id);
  }
}
