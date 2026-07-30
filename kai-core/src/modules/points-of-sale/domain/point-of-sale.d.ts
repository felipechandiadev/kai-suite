import 'reflect-metadata';
import { Branch } from '@modules/branches/domain/branch.entity';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
export declare class PointOfSale {
  id: string;
  branchId?: string;
  defaultPriceListId: string;
  name: string;
  deviceId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  branch?: Branch;
  defaultPriceList?: PriceList;
}
