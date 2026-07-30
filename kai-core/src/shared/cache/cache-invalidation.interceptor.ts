import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { CacheService } from './cache.service';

/**
 * Cache Invalidation Interceptor
 *
 * Invalida automáticamente el caché cuando se modifican datos.
 * Se configura por endpoint con decoradores personalizados.
 */
@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const className = context.getClass().name;

    // Obtener metadata de invalidación de caché
    const invalidationRules = this.getInvalidationRules(handler);

    return next.handle().pipe(
      tap(async (data) => {
        // Invalidar caché basado en las reglas configuradas
        await this.invalidateCache(invalidationRules, request, data);
      }),
    );
  }

  private getInvalidationRules(handler: any): any[] {
    // Obtener metadata de invalidación de caché del handler
    // Esto se implementaría con decoradores personalizados
    return Reflect.getMetadata('cache:invalidate', handler) || [];
  }

  private async invalidateCache(
    rules: any[],
    request: any,
    response: any,
  ): Promise<void> {
    for (const rule of rules) {
      switch (rule.type) {
        case 'customer':
          if (request.params.customerId || response?.customerId) {
            const customerId = request.params.customerId || response.customerId;
            await this.cacheService.invalidateCustomerCache(customerId);
          }
          break;

        case 'product':
          if (request.params.productId || response?.productId) {
            const productId = request.params.productId || response.productId;
            await this.cacheService.invalidateProductCache(productId);
          }
          break;

        case 'transaction':
          if (request.params.transactionId || response?.id) {
            const transactionId = request.params.transactionId || response.id;
            await this.cacheService.invalidateTransactionCache(transactionId);
          }
          break;

        case 'session':
          if (request.params.sessionId || response?.sessionId) {
            const sessionId = request.params.sessionId || response.sessionId;
            await this.cacheService.invalidateUserSession(sessionId);
            await this.cacheService.invalidateCashSession(sessionId);
          }
          break;

        case 'exchange_rate':
          // Invalidar todas las tasas de cambio cuando se actualiza alguna
          const keys = await this.cacheService['cache'].keys('exchange:rate:*');
          if (keys.length > 0) {
            await this.cacheService['cache'].mdel(keys);
          }
          break;

        case 'tax_rate':
          // Invalidar todas las tasas de impuestos cuando se actualiza alguna
          const taxKeys = await this.cacheService['cache'].keys('tax:rate:*');
          if (taxKeys.length > 0) {
            await this.cacheService['cache'].mdel(taxKeys);
          }
          break;

        default:
          // Invalidación personalizada
          if (rule.pattern) {
            const keys = await this.cacheService['cache'].keys(rule.pattern);
            if (keys.length > 0) {
              await this.cacheService['cache'].mdel(keys);
            }
          }
          break;
      }
    }
  }
}
