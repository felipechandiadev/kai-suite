import { Body, Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { DeliveryCoverageService } from '../application/delivery-coverage.service';
import { GeocodeAddressService } from '../application/geocode-address.service';
import { ResolveDeliveryZoneService } from '../application/resolve-delivery-zone.service';
import { DeliveryQuoteService } from '../application/delivery-quote.service';
import { DeliveryOccurrenceService } from '../application/delivery-occurrence.service';
import { MAULE_COMMUNES_SEED, MAULE_REGION_NAME } from '../domain/delivery.types';

/**
 * Reparto local para POS (JWT + X-Active-Company-Id).
 * Alias canónico: `delivery/pos/*`. Compat: `e-shop/pos/delivery/*`.
 */
@Controller(['e-shop/pos/delivery', 'delivery/pos'])
export class DeliveryPosController {
  constructor(
    private readonly coverage: DeliveryCoverageService,
    private readonly geocode: GeocodeAddressService,
    private readonly resolveZone: ResolveDeliveryZoneService,
    private readonly quote: DeliveryQuoteService,
    private readonly occurrences: DeliveryOccurrenceService,
  ) {}

  @Get('coverage')
  async getCoverage(@CurrentCompany() companyId: string) {
    const settings = await this.coverage.getSettings(companyId);
    const communes = await this.coverage.listCommunes(companyId);
    return {
      regionName: MAULE_REGION_NAME,
      localDeliveryEnabled: settings.localDeliveryEnabled,
      communes: communes
        .filter((c) => c.isEnabled)
        .map((c) => ({ code: c.code, name: c.name, province: c.province })),
      allCommunes: MAULE_COMMUNES_SEED,
    };
  }

  @Post('geocode')
  async geocodeAddress(
    @CurrentCompany() companyId: string,
    @Body() body: { address: string; commune?: string; region?: string },
  ) {
    void companyId;
    const result = await this.geocode.geocode(body.address, body.commune, body.region);
    if (!result) {
      throw new BadRequestException(
        'No se pudo geocodificar la dirección. Revisa calle y comuna.',
      );
    }
    return result;
  }

  @Post('resolve-zone')
  async resolveDeliveryZone(
    @CurrentCompany() companyId: string,
    @Body()
    body: {
      latitude?: number;
      longitude?: number;
      communeCode?: string;
      commune?: string;
    },
  ) {
    if (body.latitude != null && body.longitude != null) {
      const zone = await this.resolveZone.resolveByPoint(
        companyId,
        body.latitude,
        body.longitude,
        body.communeCode ?? null,
      );
      return { zone, covered: Boolean(zone) };
    }
    if (body.communeCode) {
      const zone = await this.resolveZone.resolveByCommuneFallback(
        companyId,
        body.communeCode,
      );
      return { zone, covered: Boolean(zone) };
    }
    return { zone: null, covered: false };
  }

  @Get('quote')
  async getQuote(
    @CurrentCompany() companyId: string,
    @Query('zoneId') zoneId: string,
    @Query('subtotal') subtotal?: string,
  ) {
    const zone = await this.resolveZone.resolveByZoneId(companyId, zoneId);
    if (!zone) {
      return { shippingFee: 0, freeShippingApplied: false };
    }
    return this.quote.quote(companyId, zone, Number(subtotal) || 0);
  }

  @Get('available-occurrences')
  async listOccurrences(
    @CurrentCompany() companyId: string,
    @Query('zoneId') zoneId: string,
  ) {
    return this.occurrences.listAvailableForZone(companyId, zoneId);
  }
}
