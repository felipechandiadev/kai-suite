import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { MenuStoreContext } from '../application/menu-store.context';

export const MenuStore = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MenuStoreContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.menuStore as MenuStoreContext;
  },
);
