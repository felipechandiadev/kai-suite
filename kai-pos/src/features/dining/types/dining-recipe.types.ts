export type PosDiningRecipeLine = {
  id: string;
  inputVariantId: string;
  qtyPerOutputUnit: number;
  wasteFactor: number;
  sortOrder: number;
  inputProductName: string | null;
  inputSku: string | null;
  inputStockBaseUnitLabel: string | null;
};

export type PosDiningRecipeSummary = {
  id: string;
  type: string;
  version: number;
  isActive: boolean;
  lines: PosDiningRecipeLine[];
};

export type PosDiningRecipesListResponse =
  | { success: true; recipes: PosDiningRecipeSummary[] }
  | { success: false; message: string };
