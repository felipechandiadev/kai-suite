import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { WinstonLoggerService } from './winston-logger.service';

/**
 * Interceptor de logging HTTP: no registra cada request/response en desarrollo
 * (evita ruido en consola). Sí registra respuestas lentas y errores.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: WinstonLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const { method, url, user } = request;
    const userId = user?.id || 'anonymous';

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          if (duration > 1000) {
            this.logger.logPerformance(
              `Slow HTTP request: ${method} ${url}`,
              duration,
              {
                userId,
                statusCode,
                threshold: 1000,
              },
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `HTTP ${method} ${url} - ${statusCode}: ${error.message}`,
            'HTTP_ERROR',
            {
              method,
              url,
              userId,
              statusCode,
              duration,
              error: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString(),
            },
          );
        },
      }),
    );
  }
}
