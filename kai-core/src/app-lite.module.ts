import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { typeOrmConfig } from './config/typeorm.config';
import { AppConfigService } from './config/config.service';
import { AppConfigModule } from './config/config.module';
import { CacheModule } from './shared/cache/cache.module';
import { ObservabilityModule } from './shared/observability.module';
import { TenantModule } from './common/tenant';
import { ProductModeModule } from './shared/product-mode/product-mode.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { LiteModule } from './modules/lite/lite.module';
import { SalesReportsModule } from './modules/sales-reports/sales-reports.module';

/**
 * Nest bootstrap for KAI_EDITION=lite — SQLite sidecar without full Kai Suite modules.
 */
@Module({
  imports: [
    AppConfigModule,
    ProductModeModule,
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: typeOrmConfig,
      inject: [AppConfigService],
    }),
    EventEmitterModule.forRoot(),
    ObservabilityModule,
    CacheModule,
    TenantModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    SalesReportsModule,
    LiteModule,
  ],
})
export class AppLiteModule {}
