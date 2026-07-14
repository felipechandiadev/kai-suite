import { Injectable } from '@nestjs/common';
import { CompaniesService } from '@modules/companies/application/companies.service';
import type { ResolvedZone } from './resolve-delivery-zone.service';

@Injectable()
export class DeliveryQuoteService {
  constructor(private readonly companiesService: CompaniesService) {}

  async quote(
    companyId: string,
    zone: ResolvedZone,
    subtotal: number,
  ): Promise<{ shippingFee: number; freeShippingApplied: boolean }> {
    if (!zone) return { shippingFee: 0, freeShippingApplied: false };
    const settings = await this.companiesService.getEShopFlatSettings(companyId);
    const threshold = settings.eShopFreeShippingThreshold;
    const baseFee = zone.shippingFee;
    if (threshold != null && threshold > 0 && subtotal >= threshold) {
      return { shippingFee: 0, freeShippingApplied: true };
    }
    return { shippingFee: baseFee, freeShippingApplied: false };
  }
}
