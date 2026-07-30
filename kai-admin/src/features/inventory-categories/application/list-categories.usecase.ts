import { CategoryRequest } from "../infrastructure/category.request";
import type { ListCategoriesResult } from "../types/category.types";

export class ListCategoriesUseCase {
  static async execute(): Promise<ListCategoriesResult> {
    return CategoryRequest.findAllWithCounts();
  }
}
