import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Audit } from './domain/audit.entity';
import { AuditsController } from './presentation/audits.controller';
import { AuditsService } from './application/audits.service';

@Module({
  imports: [TypeOrmModule.forFeature([Audit]), CqrsModule],
  controllers: [AuditsController],
  providers: [AuditsService],
  exports: [AuditsService],
})
export class AuditsModule {}
