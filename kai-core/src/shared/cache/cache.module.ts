import { Module } from '@nestjs/common';
import { CachePort } from './cache.port';
import { RedisCacheAdapter } from './redis-cache.adapter';
import { CacheService } from './cache.service';
import { CacheInvalidationInterceptor } from './cache-invalidation.interceptor';
import { AppConfigModule } from '../../config/config.module';

/**
 * Cache Module - Infrastructure Layer
 *
 * Proporciona la implementación de caché usando Redis.
 * Sigue el patrón de Dependency Inversion: Application depende de abstracciones.
 */
@Module({
  imports: [AppConfigModule],
  providers: [
    // Implementación concreta de CachePort
    {
      provide: 'CachePort',
      useClass: RedisCacheAdapter,
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
      useClass: RedisCacheAdapter,
    },
  ],
})
export class CacheModule {}
