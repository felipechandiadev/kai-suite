import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { EshopCustomerRequestContext } from './eshop-customer.guard';

export const EShopCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): EshopCustomerRequestContext => {
    const request = ctx.switchToHttp().getRequest();
    const customer = request.eshopCustomer as EshopCustomerRequestContext | undefined;
    if (!customer) {
      throw new Error('EShopCustomer context missing — apply EshopCustomerGuard');
    }
    return customer;
  },
);
