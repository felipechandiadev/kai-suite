import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from '../metrics/metrics.service';

/**
 * Interceptor de Métricas para HTTP Requests
 *
 * Captura métricas automáticamente para todos los requests HTTP:
 * - Contador de requests
 * - Histograma de duración
 * - Gauge de requests activos
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Extraer información del request
    const { method, url } = request;
    const route = this.getRoute(url);

    // Incrementar requests activos
    this.metricsService.startHttpRequest();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Registrar métricas de éxito
          this.metricsService.incrementHttpRequests(method, route, statusCode);
          this.metricsService.recordHttpRequestDuration(
            method,
            route,
            duration,
          );
          this.metricsService.endHttpRequest();
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Registrar métricas de error
          this.metricsService.incrementHttpRequests(method, route, statusCode);
          this.metricsService.recordHttpRequestDuration(
            method,
            route,
            duration,
          );
          this.metricsService.endHttpRequest();
        },
      }),
    );
  }

  /**
   * Extraer ruta base del URL (remover parámetros de query)
   */
  private getRoute(url: string): string {
    // Remover parámetros de query
    const baseUrl = url.split('?')[0];

    // Normalizar rutas con IDs (ej: /api/transactions/123 -> /api/transactions/:id)
    const segments = baseUrl.split('/').filter((segment) => segment.length > 0);

    if (segments.length >= 3 && /^\d+$/.test(segments[2])) {
      // Ruta como /api/resource/123 -> /api/resource/:id
      return `/${segments[0]}/${segments[1]}/:id`;
    }

    return baseUrl;
  }
}
