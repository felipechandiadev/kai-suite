import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Product } from '@modules/products/domain/product.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { ProductsController } from './presentation/products.controller';
import { ProductsService } from './application/products.service';
import { ProductsPosService } from './application/products-pos.service';
import { ProductsServiceAdapter } from './application/products.service.adapter';
import { ProductsRepository } from './infrastructure/products.repository';
import { PRODUCTS_REPOSITORY } from './application/ports/products.repository.port';
import { PRICE_LIST_ITEMS_REPOSITORY } from '@modules/price-list-items/application/ports/price-list-items.repository.port';
import { TypeOrmPriceListItemsRepository } from '@modules/price-list-items/infrastructure/repositories/typeorm-price-list-items.repository';
import { MultimediaModule } from '@modules/multimedia/multimedia.module';
import { BrandsModule } from '@modules/brands/brands.module';

// Handlers
import { CreateProductCommandHandler } from './application/handlers/commands/create-product.handler';
import { UpdateProductCommandHandler } from './application/handlers/commands/update-product.handler';
import { RemoveProductCommandHandler } from './application/handlers/commands/remove-product.handler';
import { GetProductQueryHandler } from './application/handlers/queries/get-product.handler';
import { GetAllProductsQueryHandler } from './application/handlers/queries/get-all-products.handler';
import { SearchProductsQueryHandler } from './application/handlers/queries/search-products.handler';
import { ProductCatalogSearchBootstrap } from './application/product-catalog-search.bootstrap';
import { ProductEshopVisibilitySyncService } from './application/services/product-eshop-visibility-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductVariant,
      Tax,
      Attribute,
      PriceListItem,
      StockLevel,
      PointOfSale,
      Unit,
    ]),
    CqrsModule,
    MultimediaModule,
    BrandsModule,
  ],
  controllers: [ProductsController],
  providers: [
    ProductCatalogSearchBootstrap,
    // Legacy service (kept for internal compatibility)
    ProductsService,
    ProductsPosService,
    // Adapter that controllers should use
    ProductsServiceAdapter,
    // Repository binding
    {
      provide: PRODUCTS_REPOSITORY,
      useClass: ProductsRepository,
    },
    // Price list items repository (port binding)
    {
      provide: PRICE_LIST_ITEMS_REPOSITORY,
      useClass: TypeOrmPriceListItemsRepository,
    },
    // CQRS handlers
    CreateProductCommandHandler,
    UpdateProductCommandHandler,
    RemoveProductCommandHandler,
    GetProductQueryHandler,
    GetAllProductsQueryHandler,
    SearchProductsQueryHandler,
    ProductEshopVisibilitySyncService,
  ],
  exports: [ProductsServiceAdapter, ProductsService, ProductsPosService, ProductEshopVisibilitySyncService],
})
export class ProductsModule {}
