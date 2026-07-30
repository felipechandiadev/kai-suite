import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { HealthMetric } from './domain/health-metric.entity';
import { HealthController } from './presentation/health.controller';
import { HealthService } from './application/health.service';
import { TypeOrmHealthMetricRepository } from './infrastructure/repositories/typeorm-health-metric.repository';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      provide: 'HealthMetricRepositoryPort',
      useClass: TypeOrmHealthMetricRepository,
    },
  ],
  imports: [CqrsModule, TypeOrmModule.forFeature([HealthMetric])],
})
export class HealthModule {}
