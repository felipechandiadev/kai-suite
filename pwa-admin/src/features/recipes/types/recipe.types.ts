export type RecipeTypeDto = "SERVICE" | "PRODUCTION";

export type RecipeLineDto = {
  id?: string;
  inputVariantId: string;
  qtyPerOutputUnit: number;
  wasteFactor?: number;
  sortOrder?: number;
  inputProductName?: string | null;
  inputSku?: string | null;
  inputStockBaseUnitLabel?: string | null;
};

export type RecipeDto = {
  id: string;
  outputVariantId: string;
  type: RecipeTypeDto;
  version: number;
  isActive: boolean;
  lines?: RecipeLineDto[];
};
