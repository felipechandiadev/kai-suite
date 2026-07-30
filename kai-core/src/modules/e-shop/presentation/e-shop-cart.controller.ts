import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { SkipTenant } from '@common/tenant';
import type { Request, Response } from 'express';
import { EShopStoreGuard } from './eshop-store.guard';
import { EShopStore } from './eshop-store.decorator';
import type { EShopStoreContext } from '../application/eshop-store.context';
import { EShopCartService } from '../application/eshop-cart.service';
import { EshopCustomerAuthService } from '../application/eshop-customer-auth.service';
import {
  AddEShopCartItemDto,
  LockEShopCartDto,
  UpdateEShopCartItemDto,
} from '../application/dto/eshop-cart.dto';

const CART_COOKIE = 'eshop_cart_token';
const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Controller('e-shop/cart')
@SkipTenant()
@UseGuards(EShopStoreGuard)
export class EShopCartController {
  constructor(
    private readonly cartService: EShopCartService,
    private readonly customerAuth: EshopCustomerAuthService,
  ) {}

  private resolveCartToken(req: Request, headerToken?: string): string | undefined {
    if (headerToken?.trim()) return headerToken.trim();
    const h = req.headers['x-cart-token'];
    if (typeof h === 'string' && h.trim()) return h.trim();
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return undefined;
    for (const part of cookieHeader.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name === CART_COOKIE) {
        const value = rest.join('=').trim();
        return value || undefined;
      }
    }
    return undefined;
  }

  private setCartCookie(res: Response, cartToken: string) {
    res.cookie(CART_COOKIE, cartToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: CART_TTL_MS,
      path: '/',
    });
    res.setHeader('x-cart-token', cartToken);
  }

  private async buildContext(
    store: EShopStoreContext,
    req: Request,
    authorization?: string,
    headerCartToken?: string,
  ) {
    const bearer = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : null;
    const session = bearer
      ? await this.customerAuth.resolveSession(store.companyId, bearer)
      : null;
    return {
      cartToken: this.resolveCartToken(req, headerCartToken),
      customerId: session?.customerId,
    };
  }

  @Get()
  async getCart(
    @EShopStore() store: EShopStoreContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('authorization') authorization?: string,
    @Headers('x-cart-token') headerCartToken?: string,
  ) {
    const result = await this.cartService.getOrCreateCart(
      store,
      await this.buildContext(store, req, authorization, headerCartToken),
    );
    this.setCartCookie(res, result.cartToken);
    return result;
  }

  @Post('revalidate')
  async revalidate(
    @EShopStore() store: EShopStoreContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('authorization') authorization?: string,
    @Headers('x-cart-token') headerCartToken?: string,
  ) {
    const result = await this.cartService.revalidate(
      store,
      await this.buildContext(store, req, authorization, headerCartToken),
    );
    this.setCartCookie(res, result.cartToken);
    return result;
  }

  @Post('items')
  async addItem(
    @EShopStore() store: EShopStoreContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: AddEShopCartItemDto,
    @Headers('authorization') authorization?: string,
    @Headers('x-cart-token') headerCartToken?: string,
  ) {
    const result = await this.cartService.addItem(
      store,
      await this.buildContext(store, req, authorization, headerCartToken),
      body,
    );
    this.setCartCookie(res, result.cartToken);
    return result;
  }

  @Patch('items/:productVariantId')
  async updateQty(
    @EShopStore() store: EShopStoreContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('productVariantId') productVariantId: string,
    @Body() body: UpdateEShopCartItemDto,
    @Headers('authorization') authorization?: string,
    @Headers('x-cart-token') headerCartToken?: string,
  ) {
    const result = await this.cartService.updateQty(
      store,
      await this.buildContext(store, req, authorization, headerCartToken),
      productVariantId,
      body.quantity,
    );
    this.setCartCookie(res, result.cartToken);
    return result;
  }

  @Delete('items/:productVariantId')
  async removeItem(
    @EShopStore() store: EShopStoreContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('productVariantId') productVariantId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-cart-token') headerCartToken?: string,
  ) {
    const result = await this.cartService.removeItem(
      store,
      await this.buildContext(store, req, authorization, headerCartToken),
      productVariantId,
    );
    this.setCartCookie(res, result.cartToken);
    return result;
  }

  @Delete()
  async clearCart(
    @EShopStore() store: EShopStoreContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('authorization') authorization?: string,
    @Headers('x-cart-token') headerCartToken?: string,
  ) {
    const result = await this.cartService.clearCart(
      store,
      await this.buildContext(store, req, authorization, headerCartToken),
    );
    this.setCartCookie(res, result.cartToken);
    return result;
  }

  @Post('merge')
  async mergeCart(
    @EShopStore() store: EShopStoreContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('authorization') authorization?: string,
    @Headers('x-cart-token') headerCartToken?: string,
  ) {
    const bearer = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : null;
    const session = bearer
      ? await this.customerAuth.resolveSession(store.companyId, bearer)
      : null;
    if (!session?.customerId) {
      throw new UnauthorizedException('Sesión de cliente requerida para merge');
    }
    const guestToken = this.resolveCartToken(req, headerCartToken);
    if (!guestToken) {
      const result = await this.cartService.getOrCreateCart(store, {
        customerId: session.customerId,
      });
      this.setCartCookie(res, result.cartToken);
      return result;
    }
    const result = await this.cartService.mergeGuestCart(
      store,
      guestToken,
      session.customerId,
    );
    this.setCartCookie(res, result.cartToken);
    return result;
  }

  @Post('lock')
  async lockCart(
    @EShopStore() store: EShopStoreContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: LockEShopCartDto,
    @Headers('authorization') authorization?: string,
    @Headers('x-cart-token') headerCartToken?: string,
  ) {
    const result = await this.cartService.lockForCheckout(
      store,
      await this.buildContext(store, req, authorization, headerCartToken),
      body.reason ?? 'checkout',
    );
    this.setCartCookie(res, result.cartToken);
    return result;
  }

  @Post('unlock')
  async unlockCart(
    @EShopStore() store: EShopStoreContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('authorization') authorization?: string,
    @Headers('x-cart-token') headerCartToken?: string,
  ) {
    const result = await this.cartService.unlock(
      store,
      await this.buildContext(store, req, authorization, headerCartToken),
    );
    this.setCartCookie(res, result.cartToken);
    return result;
  }
}
