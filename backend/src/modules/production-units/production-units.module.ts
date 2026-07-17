import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { ProductionUnit } from './domain/production-unit.entity';
import { ProductionUnitsService } from './application/production-units.service';
import { ProductionUnitsController } from './presentation/production-units.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionUnit, Branch, Storage])],
  controllers: [ProductionUnitsController],
  providers: [ProductionUnitsService],
  exports: [ProductionUnitsService],
})
export class ProductionUnitsModule {}
