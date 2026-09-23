import { Module } from '@nestjs/common';
import { CachePort } from './cache.port';
import { RedisCacheAdapter } from './redis-cache.adapter';
import { MemoryCacheAdapter } from './memory-cache.adapter';
import { CacheService } from './cache.service';
import { CacheInvalidationInterceptor } from './cache-invalidation.interceptor';
import { AppConfigModule } from '../../config/config.module';
import { AppConfigService } from '../../config/config.service';

/**
 * Cache Module - Infrastructure Layer
 *
 * Proporciona la implementación de caché usando Redis.
 * Sigue el patrón de Dependency Inversion: Application depende de abstracciones.
 */
@Module({
  imports: [AppConfigModule],
  providers: [
    MemoryCacheAdapter,
    RedisCacheAdapter,
    {
      provide: 'CachePort',
      useFactory: (config: AppConfigService, redis: RedisCacheAdapter, memory: MemoryCacheAdapter) =>
        config.isLiteEdition() ? memory : redis,
      inject: [AppConfigService, RedisCacheAdapter, MemoryCacheAdapter],
    },
    // Servicio de aplicación que usa la abstracción
    CacheService,
    // Interceptor para invalidación automática
    CacheInvalidationInterceptor,
  ],
  exports: [
    CacheService,
    CacheInvalidationInterceptor,
    // Exportar el token para que otros módulos puedan inyectar CachePort
    {
      provide: 'CachePort',
      useFactory: (config: AppConfigService, redis: RedisCacheAdapter, memory: MemoryCacheAdapter) =>
        config.isLiteEdition() ? memory : redis,
      inject: [AppConfigService, RedisCacheAdapter, MemoryCacheAdapter],
    },
  ],
})
export class CacheModule {}
