import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant.context';

/**
 * Envuelve la ejecución del handler en el AsyncLocalStorage de tenant context.
 * Debe ejecutarse DESPUÉS del TenantGuard (que popula req.currentUser y req.activeCompanyId).
 *
 * Permite que TypeORM subscribers, services profundos y cualquier código async
 * accedan a `TenantContext.getCompanyId()` sin recibirlo por parámetro.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const currentUser = req?.currentUser;
    const activeCompanyId: string | null = req?.activeCompanyId ?? null;

    if (!currentUser) {
      // Endpoint marcado @SkipTenant() (login, health, etc.). Ejecutar normal.
      return next.handle();
    }

    return new Observable((subscriber) => {
      TenantContext.run(
        {
          userId: currentUser.id,
          rol: currentUser.rol,
          activeCompanyId,
        },
        () => {
          const sub = next.handle().subscribe({
            next: (v) => subscriber.next(v),
            error: (e) => subscriber.error(e),
            complete: () => subscriber.complete(),
          });
          return () => sub.unsubscribe();
        },
      );
    });
  }
}
