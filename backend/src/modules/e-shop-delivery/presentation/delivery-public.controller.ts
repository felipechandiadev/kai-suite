import { Body, Controller, Get, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { SkipTenant } from '@common/tenant';
import { EShopStoreGuard } from '@modules/e-shop/presentation/eshop-store.guard';
import { EShopStore } from '@modules/e-shop/presentation/eshop-store.decorator';
import type { EShopStoreContext } from '@modules/e-shop/application/eshop-store.context';
import { DeliveryCoverageService } from '../application/delivery-coverage.service';
import { GeocodeAddressService } from '../application/geocode-address.service';
import { ResolveDeliveryZoneService } from '../application/resolve-delivery-zone.service';
import { DeliveryQuoteService } from '../application/delivery-quote.service';
import { DeliveryOccurrenceService } from '../application/delivery-occurrence.service';
import { MAULE_COMMUNES_SEED, MAULE_REGION_NAME } from '../domain/delivery.types';

@Controller('e-shop/delivery')
@SkipTenant()
@UseGuards(EShopStoreGuard)
export class DeliveryPublicController {
  constructor(
    private readonly coverage: DeliveryCoverageService,
    private readonly geocode: GeocodeAddressService,
    private readonly resolveZone: ResolveDeliveryZoneService,
    private readonly quote: DeliveryQuoteService,
    private readonly occurrences: DeliveryOccurrenceService,
  ) {}

  @Get('coverage')
  async getCoverage(@EShopStore() store: EShopStoreContext) {
    const settings = await this.coverage.getSettings(store.companyId);
    const communes = await this.coverage.listCommunes(store.companyId);
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
    @EShopStore() store: EShopStoreContext,
    @Body() body: { address: string; commune?: string; region?: string },
  ) {
    void store;
    const result = await this.geocode.geocode(body.address, body.commune, body.region);
    if (!result) {
      throw new BadRequestException('No se pudo geocodificar la dirección. Revisa calle y comuna.');
    }
    return result;
  }

  @Post('resolve-zone')
  async resolveDeliveryZone(
    @EShopStore() store: EShopStoreContext,
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
        store.companyId,
        body.latitude,
        body.longitude,
        body.communeCode ?? null,
      );
      return { zone, covered: Boolean(zone) };
    }
    if (body.communeCode) {
      const zone = await this.resolveZone.resolveByCommuneFallback(
        store.companyId,
        body.communeCode,
      );
      return { zone, covered: Boolean(zone) };
    }
    return { zone: null, covered: false };
  }

  @Get('quote')
  async getQuote(
    @EShopStore() store: EShopStoreContext,
    @Query('zoneId') zoneId: string,
    @Query('subtotal') subtotal?: string,
  ) {
    const zone = await this.resolveZone.resolveByZoneId(store.companyId, zoneId);
    if (!zone) {
      return { shippingFee: 0, freeShippingApplied: false };
    }
    return this.quote.quote(store.companyId, zone, Number(subtotal) || 0);
  }

  @Get('available-occurrences')
  async listOccurrences(
    @EShopStore() store: EShopStoreContext,
    @Query('zoneId') zoneId: string,
  ) {
    return this.occurrences.listAvailableForZone(store.companyId, zoneId);
  }
}
