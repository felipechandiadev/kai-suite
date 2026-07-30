export type EShopFulfillmentMethodPublic = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  requiresAddress: boolean;
  requiresPhone: boolean;
  instructions: string | null;
};
