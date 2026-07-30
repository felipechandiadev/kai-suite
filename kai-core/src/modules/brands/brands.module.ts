import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '@modules/products/domain/product.entity';
import { Brand } from './domain/brand.entity';
import { BrandsService } from './application/brands.service';
import { BrandsController } from './presentation/brands.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Brand, Product])],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
