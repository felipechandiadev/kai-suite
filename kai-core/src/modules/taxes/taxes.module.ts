import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Tax } from './domain/tax.entity';
import { TaxesService } from './application/taxes.service';
import { TaxesController } from './presentation/taxes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tax]), CqrsModule],
  controllers: [TaxesController],
  providers: [TaxesService],
  exports: [TaxesService],
})
export class TaxesModule {}
