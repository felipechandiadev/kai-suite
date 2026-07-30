import 'reflect-metadata';
import { Company } from '@modules/companies/domain/company.entity';
import type { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
export declare class Branch {
  id: string;
  companyId?: string;
  name: string;
  address?: string;
  phone?: string;
  location?: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
  isHeadquarters: boolean;
  resultCenterId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  company?: Company;
  resultCenter?: ResultCenter;
}
