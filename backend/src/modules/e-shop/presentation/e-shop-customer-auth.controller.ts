import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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

  @Get('check-username')
  checkUsername(
    @EShopStore() store: EShopStoreContext,
    @Query('username') username?: string,
  ) {
    return this.auth.checkUsernameAvailable(store.companyId, username ?? '');
  }

  @Post('register')
  register(
    @EShopStore() store: EShopStoreContext,
    @Body()
    body: {
      username: string;
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
    @Body() body: { login?: string; email?: string; password: string },
  ) {
    const login = body.login?.trim() || body.email?.trim() || '';
    return this.auth.login(store.companyId, { login, password: body.password });
  }

  @Post('verify-email')
  verifyEmail(
    @EShopStore() store: EShopStoreContext,
    @Body() body: { token: string },
  ) {
    return this.auth.verifyEmail(store.companyId, body.token);
  }
}
