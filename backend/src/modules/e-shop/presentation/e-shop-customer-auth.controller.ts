import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SkipTenant } from '@common/tenant';
import { EShopStoreGuard } from './eshop-store.guard';
import { EShopStore } from './eshop-store.decorator';
import type { EShopStoreContext } from '../application/eshop-store.context';
import { EshopCustomerAuthService } from '../application/eshop-customer-auth.service';

@Controller('e-shop/auth')
@SkipTenant()
@UseGuards(EShopStoreGuard)
export class EShopCustomerAuthController {
  constructor(private readonly auth: EshopCustomerAuthService) {}

  @Post('register')
  register(
    @EShopStore() store: EShopStoreContext,
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName?: string;
      phone?: string;
      documentNumber?: string;
    },
  ) {
    return this.auth.register(store.companyId, body);
  }

  @Post('login')
  login(
    @EShopStore() store: EShopStoreContext,
    @Body() body: { email: string; password: string },
  ) {
    return this.auth.login(store.companyId, body);
  }

  @Post('verify-email')
  verifyEmail(
    @EShopStore() store: EShopStoreContext,
    @Body() body: { token: string },
  ) {
    return this.auth.verifyEmail(store.companyId, body.token);
  }
}
