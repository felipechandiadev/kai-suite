import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { MetalPrice } from './domain/metal-price.entity';
import { MetalPricesController } from './presentation/metal-prices.controller';
import { MetalPricesService } from './application/metal-prices.service';

@Module({
  imports: [TypeOrmModule.forFeature([MetalPrice]), CqrsModule],
  controllers: [MetalPricesController],
  providers: [MetalPricesService],
  exports: [MetalPricesService],
})
export class MetalPricesModule {}
