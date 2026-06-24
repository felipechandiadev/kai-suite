import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EshopCustomerAuthService } from '../application/eshop-customer-auth.service';
import type { EShopStoreContext } from '../application/eshop-store.context';
import type { EshopCustomerSession } from '../application/eshop-customer-auth.service';

export type EshopCustomerRequestContext = EshopCustomerSession;

@Injectable()
export class EshopCustomerGuard implements CanActivate {
  constructor(private readonly auth: EshopCustomerAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const store = req.eshopStore as EShopStoreContext | undefined;
    if (!store?.companyId) {
      throw new UnauthorizedException('Tienda no especificada');
    }

    const authHeader: string | undefined =
      req.headers?.authorization || req.headers?.Authorization;
    const bearer = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null;
    if (!bearer) {
      throw new UnauthorizedException('Sesión de cliente requerida');
    }

    const session = await this.auth.resolveSession(store.companyId, bearer);
    if (!session) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    req.eshopCustomer = session;
    return true;
  }
}
