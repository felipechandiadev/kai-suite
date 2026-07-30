import 'reflect-metadata';
export declare enum PriceListType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  VIP = 'VIP',
  PROMOTIONAL = 'PROMOTIONAL',
}
export declare class PriceList {
  id: string;
  name: string;
  priceListType: PriceListType;
  currency: string;
  validFrom?: Date;
  validUntil?: Date;
  priority: number;
  isDefault: boolean;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
