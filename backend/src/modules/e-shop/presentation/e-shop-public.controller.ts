import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SkipTenant } from '@common/tenant';
import { EShopService } from '../application/e-shop.service';
import { EShopStoreGuard } from './eshop-store.guard';
import { EShopStore } from './eshop-store.decorator';
import type { EShopStoreContext } from '../application/eshop-store.context';
import { EShopFulfillmentMethodsService } from '../application/eshop-fulfillment-methods.service';
import { EShopCheckoutOrderService } from '../application/eshop-checkout-order.service';
import { EshopCustomerAuthService } from '../application/eshop-customer-auth.service';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { isMercadoPagoEshopCheckoutOperational } from '@modules/companies/domain/company-mercado-pago.types';
import { DeliveryCoverageService } from '@modules/delivery/application/delivery-coverage.service';

@Controller('e-shop')
@SkipTenant()
@UseGuards(EShopStoreGuard)
export class EShopPublicController {
  constructor(
    private readonly eShopService: EShopService,
    private readonly fulfillmentMethods: EShopFulfillmentMethodsService,
    private readonly checkoutOrder: EShopCheckoutOrderService,
    private readonly customerAuth: EshopCustomerAuthService,
    private readonly companiesService: CompaniesService,
    private readonly deliveryCoverage: DeliveryCoverageService,
  ) {}

  @Get('storefront')
  getStorefront(@EShopStore() store: EShopStoreContext) {
    return this.eShopService.getStorefront(store);
  }

  @Get('catalog')
  listCatalog(
    @EShopStore() store: EShopStoreContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('excludeIds') excludeIds?: string,
  ) {
    return this.eShopService.listCatalog(store, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      categoryId,
      excludeProductIds: excludeIds
        ? excludeIds.split(',').map((id) => id.trim()).filter(Boolean)
        : undefined,
    });
  }

  @Get('products')
  listProducts(
    @EShopStore() store: EShopStoreContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.eShopService.listProducts(store, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('catalog-products/:productId')
  getCatalogProduct(
    @EShopStore() store: EShopStoreContext,
    @Param('productId') productId: string,
  ) {
    return this.eShopService.getCatalogProduct(store, productId);
  }

  @Get('products/featured')
  listFeatured(@EShopStore() store: EShopStoreContext) {
    return this.eShopService.listFeatured(store);
  }

  @Get('products/:id')
  getProduct(@EShopStore() store: EShopStoreContext, @Param('id') id: string) {
    return this.eShopService.getProduct(store, id);
  }

  @Get('branches')
  listBranches(@EShopStore() store: EShopStoreContext) {
    return this.eShopService.listBranches(store);
  }

  @Get('hero-slides')
  listHeroSlides(@EShopStore() store: EShopStoreContext) {
    return this.eShopService.listHeroSlides(store);
  }

  @Get('testimonials')
  listTestimonials(@EShopStore() store: EShopStoreContext) {
    return this.eShopService.listTestimonials(store);
  }

  @Get('payment-settings')
  async getPaymentSettings(@EShopStore() store: EShopStoreContext) {
    const mp = await this.companiesService.getMercadoPagoSettingsInternal(
      store.companyId,
    );
    return {
      onlinePaymentEnabled: isMercadoPagoEshopCheckoutOperational(mp),
      publicKey: mp.publicKey,
      environment: mp.environment,
      defaultPaymentMode: mp.eshopDefaultPaymentMode,
    };
  }

  @Get('fulfillment-methods')
  async listFulfillmentMethods(
    @EShopStore() store: EShopStoreContext,
    @Query('subtotal') subtotal?: string,
  ) {
    const sub = Math.max(0, Number(subtotal) || 0);
    let localDeliveryEnabled = false;
    try {
      const deliverySettings = await this.deliveryCoverage.getSettings(store.companyId);
      localDeliveryEnabled = deliverySettings.localDeliveryEnabled === true;
    } catch {
      localDeliveryEnabled = false;
    }
    return this.fulfillmentMethods.listActiveWithPricing(
      store.companyId,
      sub,
      store.eShop.eShopFreeShippingThreshold,
      { localDeliveryEnabled },
    );
  }

  @Post('checkout')
  async checkout(
    @EShopStore() store: EShopStoreContext,
    @Body()
    body: {
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      fulfillmentMethodId?: string;
      address?: string;
      shippingAddress?: {
        line1?: string;
        commune?: string;
        region?: string;
        notes?: string;
      };
      lines?: Array<{ productVariantId: string; quantity: number }>;
      cartId?: string;
      cartToken?: string;
      checkoutAttemptId?: string;
      notes?: string;
      paymentMode?: "online" | "coordinate";
    },
    @Headers('authorization') authorization?: string,
  ) {
    const bearer = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : null;
    const session = bearer
      ? await this.customerAuth.resolveSession(store.companyId, bearer)
      : null;

    const useV2 =
      process.env.ESHOP_CHECKOUT_V2 === 'true' ||
      process.env.ESHOP_CHECKOUT_V2 === '1';
    if (useV2 && body.fulfillmentMethodId?.trim()) {
      return this.checkoutOrder.createCheckoutOrder(store, {
        ...body,
        fulfillmentMethodId: body.fulfillmentMethodId.trim(),
        authenticatedCustomerId: session?.customerId,
        paymentMode: body.paymentMode ?? "coordinate",
      });
    }
    return this.eShopService.createCheckoutSale(store, {
      ...body,
      lines: body.lines ?? [],
    });
  }

  @Post('checkout/prepare')
  async checkoutPrepare(
    @EShopStore() store: EShopStoreContext,
    @Body()
    body: {
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      fulfillmentMethodId: string;
      address?: string;
      shippingAddress?: {
        line1?: string;
        commune?: string;
        region?: string;
        notes?: string;
      };
      lines?: Array<{ productVariantId: string; quantity: number }>;
      cartId?: string;
      cartToken?: string;
      checkoutAttemptId?: string;
      notes?: string;
    },
    @Headers('authorization') authorization?: string,
  ) {
    const bearer = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : null;
    const session = bearer
      ? await this.customerAuth.resolveSession(store.companyId, bearer)
      : null;
    return this.checkoutOrder.prepareOnlineCheckout(store, {
      ...body,
      fulfillmentMethodId: body.fulfillmentMethodId.trim(),
      authenticatedCustomerId: session?.customerId,
    });
  }

  @Post('checkout/resume-payment')
  resumePayment(
    @EShopStore() store: EShopStoreContext,
    @Body() body: { orderId?: string },
  ) {
    return this.checkoutOrder.resumeOnlinePayment(store, body.orderId ?? '');
  }
}
