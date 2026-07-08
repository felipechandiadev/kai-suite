import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AdminOnly, CurrentUser, CurrentUserPayload } from '@common/tenant';
import { PosService } from '../application/pos.service';

@Controller('points-of-sale')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.posService.findAll(include);
  }

  /**
   * Devuelve los medios de pago efectivos para el POS del cajero actual.
   *
   * - Resuelve el POS desde `?pointOfSaleId=` (preferido) o, si no viene,
   *   delega a la sesión de caja abierta (que pwa-pos ya resuelve antes).
   * - Disponible para OPERATOR/ADMIN: `TenantGuard` ya valida tenant.
   */
  @Get('me/payment-methods')
  async getEffectiveForMe(
    @Query('pointOfSaleId') pointOfSaleId: string | undefined,
    @CurrentUser() _user: CurrentUserPayload,
  ) {
    if (!pointOfSaleId || typeof pointOfSaleId !== 'string') {
      return {
        success: false,
        message: 'pointOfSaleId es requerido',
        paymentMethods: [],
      };
    }
    const paymentMethods =
      await this.posService.getEffectivePaymentMethods(pointOfSaleId);
    return { success: true, paymentMethods };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const pointOfSale = await this.posService.getPointOfSaleById(id);
    if (!pointOfSale) {
      return {
        success: false,
        message: 'Punto de venta no encontrado',
        statusCode: 404,
      };
    }
    return { success: true, pointOfSale };
  }

  @Post()
  async createPointOfSale(
    @Body()
    data: {
      name: string;
      branchId: string;
      storageId: string;
      deviceId?: string | null;
      isActive?: boolean;
      priceLists?: Array<{ id: string; name: string; isActive: boolean }>;
      defaultPriceListId?: string | null;
      kind?: 'PRESALE' | 'SALE';
      acceptsPresaleTickets?: boolean;
    },
  ) {
    return this.posService.createPointOfSale(data);
  }

  @Put(':id')
  async updatePointOfSale(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      name: string;
      branchId: string | null;
      deviceId: string | null;
      isActive: boolean;
      priceLists: Array<{ id: string; name: string; isActive: boolean }>;
      defaultPriceListId: string | null;
      storageId: string | null;
      kind?: 'PRESALE' | 'SALE';
      acceptsPresaleTickets?: boolean;
    }>,
  ) {
    return this.posService.updatePointOfSale(id, data);
  }

  @Get(':id/price-lists')
  async getPriceLists(@Param('id') id: string) {
    return this.posService.getPriceLists(id);
  }

  /**
   * Lee la configuración local de medios de pago de un POS (admin).
   */
  @Get(':id/payment-methods')
  @AdminOnly()
  async getPaymentMethods(@Param('id') id: string) {
    const paymentMethods = await this.posService.getPaymentMethods(id);
    return { success: true, paymentMethods };
  }

  /** Medios habilitados (merge empresa + POS) para listados admin. */
  @Get(':id/payment-methods/effective')
  @AdminOnly()
  async getEffectivePaymentMethods(@Param('id') id: string) {
    const paymentMethods =
      await this.posService.getEffectivePaymentMethods(id);
    return { success: true, paymentMethods };
  }

  /**
   * Reemplaza la configuración local de medios de pago de un POS.
   * Body: `{ paymentMethods: PosPaymentMethodConfig[] }` o el array directo.
   */
  @Put(':id/payment-methods')
  @AdminOnly()
  async replacePaymentMethods(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming = Array.isArray(body)
      ? body
      : Array.isArray((body as any)?.paymentMethods)
        ? (body as any).paymentMethods
        : [];
    const paymentMethods = await this.posService.replacePaymentMethods(
      id,
      incoming,
    );
    return { success: true, paymentMethods };
  }

  @Get(':id/fiscal/effective-options')
  async getEffectiveDocumentOptions(@Param('id') id: string) {
    const effectiveOptions = await this.posService.getEffectiveDocumentOptions(id);
    return { success: true, ...effectiveOptions };
  }

  @Get(':id/fiscal/policy')
  @AdminOnly()
  async getFiscalPolicy(@Param('id') id: string) {
    const policy = await this.posService.getFiscalPolicy(id);
    return { success: true, policy };
  }

  @Put(':id/fiscal/policy')
  @AdminOnly()
  async replaceFiscalPolicy(@Param('id') id: string, @Body() body: unknown) {
    const patch =
      body && typeof body === 'object' && 'policy' in (body as object)
        ? ((body as { policy: unknown }).policy as Record<string, unknown>)
        : (body as Record<string, unknown>);
    const policy = await this.posService.replaceFiscalPolicy(id, patch ?? {});
    return { success: true, policy };
  }

  @Get(':id/fiscal/folio-allocations')
  @AdminOnly()
  async getFolioAllocations(@Param('id') id: string) {
    const allocations = await this.posService.getFolioAllocations(id);
    return { success: true, allocations };
  }

  @Put(':id/fiscal/folio-allocations')
  @AdminOnly()
  async replaceFolioAllocations(@Param('id') id: string, @Body() body: unknown) {
    const items = Array.isArray(body)
      ? body
      : Array.isArray((body as any)?.allocations)
        ? (body as any).allocations
        : [];
    const allocations = await this.posService.replaceFolioAllocations(id, items);
    return { success: true, allocations };
  }

  @Get(':id/offline-fiscal-pack')
  async getOfflineFiscalPack(@Param('id') id: string) {
    return this.posService.getOfflineFiscalPack(id);
  }

  @Get(':id/offline-catalog-snapshot')
  async getOfflineCatalogSnapshot(
    @Param('id') id: string,
    @Query('priceListId') priceListId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posService.getOfflineCatalogSnapshot(id, { priceListId, cursor, limit });
  }

  @Get(':id/offline-catalog-delta')
  async getOfflineCatalogDelta(
    @Param('id') id: string,
    @Query('priceListId') priceListId?: string,
    @Query('since') since?: string,
  ) {
    return this.posService.getOfflineCatalogDelta(id, { priceListId, since });
  }

  @Delete(':id')
  async deletePointOfSale(@Param('id') id: string) {
    return this.posService.deletePointOfSale(id);
  }
}
