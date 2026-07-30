import { Module, Global } from '@nestjs/common';
import { WinstonLoggerService } from './logging/winston-logger.service';
import { LoggingInterceptor } from './logging/logging.interceptor';
import { MetricsService } from './metrics/metrics.service';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { AppConfigModule } from '../config/config.module';

/**
 * Módulo de Observabilidad
 *
 * Proporciona servicios de logging y métricas para todo el backend:
 * - WinstonLoggerService: Logging estructurado
 * - MetricsService: Métricas Prometheus
 * - LoggingInterceptor: errores HTTP y peticiones lentas (sin log por request/response)
 */
@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    WinstonLoggerService,
    LoggingInterceptor,
    MetricsService,
    MetricsInterceptor,
  ],
  controllers: [MetricsController],
  exports: [
    WinstonLoggerService,
    LoggingInterceptor,
    MetricsService,
    MetricsInterceptor,
  ],
})
export class ObservabilityModule {}
