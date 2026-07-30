/** Detalle desde `GET /categories/:id` (edición). */
export type CategoryDetail = {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
};

/** Alineado a `GET /categories/with-counts` (CategoryWithCountsDto). */
export type CategoryListItem = {
  id: string;
  name: string;
  parentId?: string | null;
  productCount: number;
  childCount: number;
};

export type ListCategoriesResult =
  | { success: true; categories: CategoryListItem[] }
  | { success: false; error: string; categories: [] };

export type CreateCategoryResult =
  | { success: true; category: CategoryListItem }
  | { success: false; error: string };

export type UpdateCategoryResult =
  | { success: true; category: CategoryListItem }
  | { success: false; error: string };

export type DeleteCategoryResult = { success: true } | { success: false; error: string };
