import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentCompany, CurrentUser, type CurrentUserPayload } from '@common/tenant';
import { EShopService } from '../application/e-shop.service';
import { CreateHeroSlideDto } from '../application/dto/create-hero-slide.dto';
import { UpdateHeroSlideDto } from '../application/dto/update-hero-slide.dto';
import { EShopFulfillmentMethodsService } from '../application/eshop-fulfillment-methods.service';
import { EShopOrderStatusService } from '../application/eshop-order-status.service';
import { CompaniesService } from '@modules/companies/application/companies.service';
import type { EShopStockPolicy } from '@modules/companies/domain/company-eshop-flat.types';
import type { EShopFulfillmentStatus } from '@modules/transactions/domain/transaction-eshop-order.metadata';
import { CancelBackorderService } from '@modules/transactions/application/cancel-backorder.service';
import { CancelBackorderDto } from '@modules/transactions/application/dto/cancel-backorder.dto';
import { EshopCustomerOrderConvertService } from '../application/eshop-customer-order-convert.service';

@Controller('e-shop/admin')
export class EShopAdminController {
  constructor(
    private readonly eShopService: EShopService,
    private readonly fulfillmentMethods: EShopFulfillmentMethodsService,
    private readonly orderStatus: EShopOrderStatusService,
    private readonly companiesService: CompaniesService,
    private readonly cancelBackorderService: CancelBackorderService,
    private readonly customerOrderConvert: EshopCustomerOrderConvertService,
  ) {}

  @Get('testimonials')
  listTestimonials(@CurrentCompany() companyId: string) {
    return this.eShopService.listTestimonialsAdmin(companyId);
  }

  @Post('testimonials')
  createTestimonial(
    @CurrentCompany() companyId: string,
    @Body()
    body: {
      clientName: string;
      rating: number;
      message: string;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.eShopService.createTestimonial(companyId, body);
  }

  @Patch('testimonials/:id')
  updateTestimonial(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      clientName: string;
      rating: number;
      message: string;
      isActive: boolean;
      sortOrder: number;
    }>,
  ) {
    return this.eShopService.updateTestimonial(companyId, id, body);
  }

  @Delete('testimonials/:id')
  deleteTestimonial(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.eShopService.deleteTestimonial(companyId, id);
  }

  @Get('hero-slider-settings')
  getHeroSliderSettings(@CurrentCompany() companyId: string) {
    return this.eShopService.getHeroSliderSettingsAdmin(companyId);
  }

  @Put('hero-slider-settings')
  updateHeroSliderSettings(
    @CurrentCompany() companyId: string,
    @Body() body: { autoplaySeconds: number },
  ) {
    return this.eShopService.updateHeroSliderAutoplaySeconds(
      companyId,
      body.autoplaySeconds,
    );
  }

  @Get('hero-slides')
  listHeroSlides(@CurrentCompany() companyId: string) {
    return this.eShopService.listHeroSlidesAdmin(companyId);
  }

  @Post('hero-slides')
  createHeroSlide(
    @CurrentCompany() companyId: string,
    @Body() body: CreateHeroSlideDto,
  ) {
    return this.eShopService.createHeroSlide(companyId, body);
  }

  @Put('hero-slides/order')
  reorderHeroSlides(
    @CurrentCompany() companyId: string,
    @Body() body: { orderedIds: string[] },
  ) {
    return this.eShopService.reorderHeroSlides(
      companyId,
      body.orderedIds ?? [],
    );
  }

  @Patch('hero-slides/:id')
  updateHeroSlide(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: UpdateHeroSlideDto,
  ) {
    return this.eShopService.updateHeroSlide(companyId, id, body);
  }

  @Delete('hero-slides/:id')
  deleteHeroSlide(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.eShopService.deleteHeroSlide(companyId, id);
  }

  @Get('featured-products')
  listFeaturedProducts(@CurrentCompany() companyId: string) {
    return this.eShopService.listFeaturedProductsAdmin(companyId);
  }

  @Put('featured-product-ids')
  replaceFeaturedProducts(
    @CurrentCompany() companyId: string,
    @Body() body: { productIds: string[] },
  ) {
    return this.eShopService.replaceFeaturedProductIds(
      companyId,
      body.productIds ?? [],
    );
  }

  @Get('catalog-products/:productId/preview')
  getCatalogProductPreview(
    @CurrentCompany() companyId: string,
    @Param('productId') productId: string,
  ) {
    return this.eShopService.getCatalogProductPreview(companyId, productId);
  }

  @Get('fulfillment-methods')
  listFulfillmentMethods(@CurrentCompany() companyId: string) {
    return this.fulfillmentMethods.listAdmin(companyId);
  }

  @Post('fulfillment-methods')
  createFulfillmentMethod(
    @CurrentCompany() companyId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.fulfillmentMethods.create(companyId, body as never);
  }

  @Patch('fulfillment-methods/:id')
  updateFulfillmentMethod(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.fulfillmentMethods.update(companyId, id, body as never);
  }

  @Delete('fulfillment-methods/:id')
  deleteFulfillmentMethod(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.fulfillmentMethods.remove(companyId, id);
  }

  @Put('fulfillment-methods/reorder')
  reorderFulfillmentMethods(
    @CurrentCompany() companyId: string,
    @Body() body: { orderedIds: string[] },
  ) {
    return this.fulfillmentMethods.reorder(companyId, body.orderedIds ?? []);
  }

  @Get('fulfillment-settings')
  async getFulfillmentSettings(@CurrentCompany() companyId: string) {
    const settings = await this.companiesService.getEShopFlatSettings(companyId);
    return {
      eShopStockPolicy: settings.eShopStockPolicy,
      eShopFreeShippingThreshold: settings.eShopFreeShippingThreshold,
      eShopDefaultBranchId: settings.eShopDefaultBranchId,
      eShopDefaultStorageId: settings.eShopDefaultStorageId,
      eShopDefaultPriceListId: settings.eShopDefaultPriceListId,
      eShopCustomerPortalEnabled: settings.eShopCustomerPortalEnabled,
      eShopRegistrationRequireRut: settings.eShopRegistrationRequireRut,
      eShopShowDebtsInPortal: settings.eShopShowDebtsInPortal,
    };
  }

  @Put('fulfillment-settings')
  async updateFulfillmentSettings(
    @CurrentCompany() companyId: string,
    @Body()
    body: {
      eShopStockPolicy?: EShopStockPolicy;
      eShopFreeShippingThreshold?: number | null;
      eShopCustomerPortalEnabled?: boolean;
      eShopRegistrationRequireRut?: boolean;
      eShopShowDebtsInPortal?: boolean;
    },
  ) {
    const settings = await this.companiesService.replaceEShopFlatSettings(companyId, {
      ...(body.eShopStockPolicy ? { eShopStockPolicy: body.eShopStockPolicy } : {}),
      ...(body.eShopFreeShippingThreshold !== undefined
        ? { eShopFreeShippingThreshold: body.eShopFreeShippingThreshold }
        : {}),
      ...(body.eShopCustomerPortalEnabled !== undefined
        ? { eShopCustomerPortalEnabled: body.eShopCustomerPortalEnabled }
        : {}),
      ...(body.eShopRegistrationRequireRut !== undefined
        ? { eShopRegistrationRequireRut: body.eShopRegistrationRequireRut }
        : {}),
      ...(body.eShopShowDebtsInPortal !== undefined
        ? { eShopShowDebtsInPortal: body.eShopShowDebtsInPortal }
        : {}),
    });
    return {
      eShopStockPolicy: settings.eShopStockPolicy,
      eShopFreeShippingThreshold: settings.eShopFreeShippingThreshold,
      eShopDefaultBranchId: settings.eShopDefaultBranchId,
      eShopDefaultStorageId: settings.eShopDefaultStorageId,
      eShopDefaultPriceListId: settings.eShopDefaultPriceListId,
      eShopCustomerPortalEnabled: settings.eShopCustomerPortalEnabled,
      eShopRegistrationRequireRut: settings.eShopRegistrationRequireRut,
      eShopShowDebtsInPortal: settings.eShopShowDebtsInPortal,
    };
  }

  @Get('orders')
  listOrders(
    @CurrentCompany() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.orderStatus.listOrders(companyId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      search,
    });
  }

  @Get('orders/:id')
  getOrder(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.orderStatus.getOrder(companyId, id);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: { status: EShopFulfillmentStatus; note?: string },
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.orderStatus.updateStatus(companyId, id, body.status, {
      byUserId: user?.id,
      note: body.note,
    });
  }

  @Post('orders/:id/cancel-backorder')
  cancelOrderBackorder(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: CancelBackorderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cancelBackorderService.cancel(companyId, user.id, id, body);
  }

  @Post('orders/:id/convert-to-sale')
  convertOrderToSale(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: { pointOfSaleId?: string; cashSessionId?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customerOrderConvert.convertToSale(companyId, id, {
      userId: user.id,
      pointOfSaleId: body.pointOfSaleId,
      cashSessionId: body.cashSessionId,
    });
  }
}
