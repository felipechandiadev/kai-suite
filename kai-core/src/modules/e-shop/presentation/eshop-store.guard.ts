import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CompaniesService } from '@modules/companies/application/companies.service';
import {
  sanitizeCompanyEShopFlatSettings,
} from '@modules/companies/domain/company-eshop-flat.types';
import { resolveCompanyIdentity } from '@modules/companies/domain/company-identity.types';
import { resolveCompanyPublicContact } from '@modules/companies/domain/company-contact-resolve.util';
import type { EShopStoreContext } from '../application/eshop-store.context';

@Injectable()
export class EShopStoreGuard implements CanActivate {
  constructor(private readonly companiesService: CompaniesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug =
      (request.headers['x-eshop-store-slug'] as string | undefined)?.trim() ||
      (request.query?.slug as string | undefined)?.trim() ||
      '';

    if (!slug) {
      throw new NotFoundException('Tienda no especificada');
    }

    const company = await this.companiesService.findByEShopPublicSlug(slug);
    if (!company) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const settings = (company.settings ?? {}) as Record<string, unknown>;
    const eShop = sanitizeCompanyEShopFlatSettings(settings);
    if (!eShop.eShopEnabled) {
      throw new ServiceUnavailableException('Tienda no disponible');
    }

    const identity = resolveCompanyIdentity(settings);

    const ctx: EShopStoreContext = {
      companyId: company.id,
      companyName: company.nombreFantasia || company.razonSocial,
      slug: eShop.eShopPublicSlug || slug,
      eShop,
      publicContact: resolveCompanyPublicContact({
        mail: company.mail,
        phone: company.phone,
        settings: company.settings as Record<string, unknown>,
      }),
      companyIdentity: identity,
      companySettings: settings,
    };

    request.eshopStore = ctx;
    return true;
  }
}
