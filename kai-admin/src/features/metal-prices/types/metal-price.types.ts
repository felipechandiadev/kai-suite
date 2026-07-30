export type MetalPriceRow = {
  id: string;
  companyId: string;
  metal: string;
  date: string;
  valueCLP: number;
  notes: string | null;
};

export type CreateMetalPriceResult =
  | { success: true; data: MetalPriceRow }
  | { success: false; error: string };

export type UpdateMetalPriceResult =
  | { success: true; data: MetalPriceRow }
  | { success: false; error: string };

export type DeleteMetalPriceResult =
  | { success: true }
  | { success: false; error: string };

export const METAL_TYPE_OPTIONS = [
  'Plata 950',
  'Plata 925',
  'Oro 24K',
  'Oro 18K',
  'Oro 14K',
  'Platino',
  'Bronce',
  'Alpaca',
  'Acero Inoxidable',
] as const;

export type MetalTypeOption = (typeof METAL_TYPE_OPTIONS)[number];
