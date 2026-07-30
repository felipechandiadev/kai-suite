import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { EShopStoreContext } from '../application/eshop-store.context';

export const EShopStore = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): EShopStoreContext => {
    const request = ctx.switchToHttp().getRequest();
    const store = request.eshopStore as EShopStoreContext | undefined;
    if (!store) {
      throw new Error('EShopStore context missing — apply EShopStoreGuard');
    }
    return store;
  },
);
