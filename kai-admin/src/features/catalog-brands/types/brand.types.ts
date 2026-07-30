export type BrandListItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
};

export type CreateBrandResult = { success: true; brand: BrandListItem } | { success: false; error: string };

export type UpdateBrandResult = { success: true; brand: BrandListItem } | { success: false; error: string };

export type DeleteBrandResult = { success: true } | { success: false; error: string };
