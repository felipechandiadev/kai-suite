import type { CompanyMenuAboutSettings } from '@modules/companies/domain/company-menu-about.types';
import type { CompanyMenuFindUsSettings } from '@modules/companies/domain/company-menu-find-us.types';
import type { CompanyMenuThemeSettings } from '@modules/companies/domain/company-menu-theme.types';
import type { CompanyMenuTopBarSettings } from '@modules/companies/domain/company-menu-topbar.types';

export type MenuStoreContext = {
  companyId: string;
  companyName: string;
  slug: string;
  menuEnabled: boolean;
  menuPublicSlug: string | null;
  menuDefaultPriceListId: string | null;
  menuDefaultBranchId: string | null;
  topBar: CompanyMenuTopBarSettings;
  about: CompanyMenuAboutSettings;
  findUs: CompanyMenuFindUsSettings;
  theme: CompanyMenuThemeSettings;
  companySettings: Record<string, unknown>;
};
