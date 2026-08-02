import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { MenuHeroSlide } from './domain/menu-hero-slide.entity';
import { MenuService } from './application/menu.service';
import { MenuPublicController } from './presentation/menu-public.controller';
import { MenuStoreGuard } from './presentation/menu-store.guard';
import { CompaniesModule } from '@modules/companies/companies.module';
import { MultimediaModule } from '@modules/multimedia/multimedia.module';
import { AppConfigModule } from '../../config/config.module';
import { MenuSchemaBootstrap } from './application/menu-schema.bootstrap';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant, MenuHeroSlide]),
    AppConfigModule,
    CompaniesModule,
    MultimediaModule,
  ],
  controllers: [MenuPublicController],
  providers: [MenuService, MenuStoreGuard, MenuSchemaBootstrap],
  exports: [MenuService],
})
export class MenuModule {}
