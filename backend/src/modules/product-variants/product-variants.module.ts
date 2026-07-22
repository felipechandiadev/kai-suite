import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductVariant } from './domain/product-variant.entity';
import { ProductVariantProductionUnit } from './domain/product-variant-production-unit.entity';
import { ProductVariantBranchAvailability } from './domain/product-variant-branch-availability.entity';
import { ProductVariantProductionAttribute } from './domain/product-variant-production-attribute.entity';
import { ProductVariantProductionAttributeOption } from './domain/product-variant-production-attribute-option.entity';
import { Product } from '@modules/products/domain/product.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { ProductVariantsService } from './application/product-variants.service';
import { VariantProductionAttributesService } from './application/variant-production-attributes.service';
import { ProductVariantsController } from './presentation/product-variants.controller';
import { TypeOrmProductVariantsRepository } from './infrastructure/repositories/typeorm-product-variants.repository';
import { PRODUCT_VARIANTS_REPOSITORY } from './application/ports/product-variants.repository.port';
import { MultimediaModule } from '@modules/multimedia/multimedia.module';
import { PriceListItemsModule } from '@modules/price-list-items/price-list-items.module';
import { AttributesModule } from '@modules/attributes/attributes.module';
import { ProductsModule } from '@modules/products/products.module';
import { CatalogRealtimeModule } from '@modules/catalog-realtime/catalog-realtime.module';
import { VariantQuantityConversionService } from './application/variant-quantity-conversion.service';
import { ProductVariantShippingSchemaBootstrap } from './application/product-variant-shipping-schema.bootstrap';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { Branch } from '@modules/branches/domain/branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductVariant,
      ProductVariantProductionUnit,
      ProductVariantBranchAvailability,
      ProductVariantProductionAttribute,
      ProductVariantProductionAttributeOption,
      ProductionUnit,
      Branch,
      PriceListItem,
      Unit,
      Product,
      Transaction,
      TransactionLine,
      Supplier,
      Storage,
      StockLevel,
      Tax,
    ]),
    CqrsModule,
    MultimediaModule,
    PriceListItemsModule,
    AttributesModule,
    ProductsModule,
    forwardRef(() => CatalogRealtimeModule),
  ],
  providers: [
    ProductVariantShippingSchemaBootstrap,
    ProductVariantsService,
    VariantProductionAttributesService,
    VariantQuantityConversionService,
    {
      provide: PRODUCT_VARIANTS_REPOSITORY,
      useClass: TypeOrmProductVariantsRepository,
    },
  ],
  controllers: [ProductVariantsController],
  exports: [
    ProductVariantsService,
    VariantProductionAttributesService,
    VariantQuantityConversionService,
  ],
})
export class ProductVariantsModule {}
