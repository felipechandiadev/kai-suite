import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { sanitizeCompanyMenuFlatSettings } from '@modules/companies/domain/company-menu-flat.types';
import { resolveMenuAbout } from '@modules/companies/domain/company-menu-about.types';
import { resolveMenuFindUs } from '@modules/companies/domain/company-menu-find-us.types';
import { resolveMenuTheme } from '@modules/companies/domain/company-menu-theme.types';
import { resolveMenuTopBar } from '@modules/companies/domain/company-menu-topbar.types';
import type { MenuStoreContext } from '../application/menu-store.context';

@Injectable()
export class MenuStoreGuard implements CanActivate {
  constructor(private readonly companiesService: CompaniesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug =
      (request.headers['x-menu-store-slug'] as string | undefined)?.trim() ||
      (request.query?.slug as string | undefined)?.trim() ||
      '';

    if (!slug) {
      throw new NotFoundException('Carta no especificada');
    }

    const company = await this.companiesService.findByMenuPublicSlug(slug);
    if (!company) {
      throw new NotFoundException('Carta no encontrada');
    }

    const settings = (company.settings ?? {}) as Record<string, unknown>;
    const menu = sanitizeCompanyMenuFlatSettings(settings);
    if (!menu.menuEnabled) {
      throw new ServiceUnavailableException('Carta no disponible');
    }

    const ctx: MenuStoreContext = {
      companyId: company.id,
      companyName: company.nombreFantasia || company.razonSocial,
      slug: menu.menuPublicSlug || slug,
      menuEnabled: menu.menuEnabled,
      menuPublicSlug: menu.menuPublicSlug,
      menuDefaultPriceListId: menu.menuDefaultPriceListId,
      menuDefaultBranchId: menu.menuDefaultBranchId,
      topBar: resolveMenuTopBar(settings),
      about: resolveMenuAbout(settings),
      findUs: resolveMenuFindUs(settings),
      theme: resolveMenuTheme(settings),
      companySettings: settings,
    };

    request.menuStore = ctx;
    return true;
  }
}
