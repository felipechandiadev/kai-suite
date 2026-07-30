import type { CompanyEShopFlatSettings } from '@modules/companies/domain/company-eshop-flat.types';
import type { CompanyPublicContactSettings } from '@modules/companies/domain/company-public-contact.types';
import type { CompanyIdentitySettings } from '@modules/companies/domain/company-identity.types';

export type EShopStoreContext = {
  companyId: string;
  companyName: string;
  slug: string;
  eShop: CompanyEShopFlatSettings;
  publicContact: CompanyPublicContactSettings;
  companyIdentity: CompanyIdentitySettings;
  companySettings: Record<string, unknown>;
};
