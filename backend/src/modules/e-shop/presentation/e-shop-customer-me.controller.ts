import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { SkipTenant } from '@common/tenant';
import { EShopStoreGuard } from './eshop-store.guard';
import { EshopCustomerGuard } from './eshop-customer.guard';
import { EShopStore } from './eshop-store.decorator';
import { EShopCustomer } from './eshop-customer.decorator';
import type { EShopStoreContext } from '../application/eshop-store.context';
import type { EshopCustomerRequestContext } from './eshop-customer.guard';
import { EshopCustomerMeService } from '../application/eshop-customer-me.service';

@Controller('e-shop/me')
@SkipTenant()
@UseGuards(EShopStoreGuard, EshopCustomerGuard)
export class EShopCustomerMeController {
  constructor(private readonly me: EshopCustomerMeService) {}

  @Get('summary')
  summary(
    @EShopStore() store: EShopStoreContext,
    @EShopCustomer() customer: EshopCustomerRequestContext,
  ) {
    return this.me.getSummary(store.companyId, customer);
  }

  @Get('profile')
  profile(
    @EShopStore() store: EShopStoreContext,
    @EShopCustomer() customer: EshopCustomerRequestContext,
  ) {
    return this.me.getProfile(store.companyId, customer);
  }

  @Patch('profile')
  updateProfile(
    @EShopStore() store: EShopStoreContext,
    @EShopCustomer() customer: EshopCustomerRequestContext,
    @Body()
    body: { firstName?: string; lastName?: string; phone?: string; address?: string },
  ) {
    return this.me.updateProfile(store.companyId, customer, body);
  }

  @Get('orders')
  orders(
    @EShopStore() store: EShopStoreContext,
    @EShopCustomer() customer: EshopCustomerRequestContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.me.listOrders(store.companyId, customer.customerId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('orders/:id')
  orderDetail(
    @EShopStore() store: EShopStoreContext,
    @EShopCustomer() customer: EshopCustomerRequestContext,
    @Param('id') id: string,
  ) {
    return this.me.getOrder(store.companyId, customer.customerId, id);
  }

  @Get('payments')
  payments(
    @EShopStore() store: EShopStoreContext,
    @EShopCustomer() customer: EshopCustomerRequestContext,
  ) {
    return this.me.getPayments(store.companyId, customer);
  }

  @Get('debts')
  debts(
    @EShopStore() store: EShopStoreContext,
    @EShopCustomer() customer: EshopCustomerRequestContext,
  ) {
    return this.me.getDebts(store.companyId, customer);
  }
}
