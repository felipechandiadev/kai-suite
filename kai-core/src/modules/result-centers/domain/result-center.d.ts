import 'reflect-metadata';
import { Company } from '@modules/companies/domain/company.entity';
import type { Branch } from '@modules/branches/domain/branch.entity';
export declare enum ResultCenterType {
  DIRECT = 'DIRECT',
  SUPPORT = 'SUPPORT',
  ADMIN = 'ADMIN',
  INVESTMENT = 'INVESTMENT',
  SALES = 'SALES',
  OPERATIONS = 'OPERATIONS',
  MARKETING = 'MARKETING',
  OTHER = 'OTHER',
}
export declare class ResultCenter {
  id: string;
  companyId: string;
  parentId?: string | null;
  branchId?: string | null;
  code: string;
  name: string;
  description?: string;
  type: ResultCenterType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  company: Company;
  parent?: ResultCenter | null;
  children?: ResultCenter[];
  branch?: Branch | null;
}
