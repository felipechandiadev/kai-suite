import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Branch } from './domain/branch.entity';
import { BranchesService } from './application/branches.service';
import { BranchesController } from './presentation/branches.controller';
import { HrLaborUnitsModule } from '@modules/hr-labor-units/hr-labor-units.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch]),
    CqrsModule,
    HrLaborUnitsModule,
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
