import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { CompaniesModule } from '@modules/companies/companies.module';
import { FiscalModule } from '@modules/fiscal/fiscal.module';
import { PosController } from './presentation/pos.controller';
import { PosService } from './application/pos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointOfSale, Storage]),
    CompaniesModule,
    forwardRef(() => FiscalModule),
  ],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
