import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { typeOrmConfig } from '../../kai-core/src/config/typeorm.config';
import { AppConfigModule } from '../../kai-core/src/config/config.module';
import { AppConfigService } from '../../kai-core/src/config/config.service';
import { User } from '@modules/users/domain/user.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';
import { AccountingRuleLine } from '@modules/accounting-rules/domain/accounting-rule-line.entity';
import { Product } from '@modules/products/domain/product.entity';
import { Brand } from '@modules/brands/domain/brand.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { MultimediaAsset } from '@modules/multimedia/domain/multimedia-asset.entity';
import { MultimediaLink } from '@modules/multimedia/domain/multimedia-link.entity';
import { EShopHeroSlide } from '@modules/e-shop/domain/e-shop-hero-slide.entity';
import { MenuHeroSlide } from '@modules/menu/domain/menu-hero-slide.entity';
import { EShopTestimonial } from '@modules/e-shop/domain/e-shop-testimonial.entity';
import { Recipe } from '@modules/recipes/domain/recipe.entity';
import { RecipeLine } from '@modules/recipes/domain/recipe-line.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { ProductVariantProductionUnit } from '@modules/product-variants/domain/product-variant-production-unit.entity';
import { OperationalExpensesModule } from '@modules/operational-expenses/operational-expenses.module';
import { FiscalModule } from '@modules/fiscal/fiscal.module';
import { ProductModeModule } from '../../kai-core/src/shared/product-mode/product-mode.module';
import { LocalStorageAdapter } from '@modules/multimedia/infrastructure/adapters/local-storage.adapter';
import { CloudflareR2Adapter } from '@modules/multimedia/infrastructure/adapters/cloudflare-r2.adapter';
import { MultimediaModule } from '@modules/multimedia/multimedia.module';
import { MultimediaVariant } from '@modules/multimedia/domain/multimedia-variant.entity';

/**
 * Misma conexión y entidades que el API: el esquema lo define TypeORM vía
 * `DB_SYNCHRONIZE` (ver `typeorm.config.ts`). Este módulo solo aporta repositorios para el script de seed.
 */
@Module({
  imports: [
    AppConfigModule,
    ProductModeModule,
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: typeOrmConfig,
      inject: [AppConfigService],
    }),
    TypeOrmModule.forFeature([
      User,
      Person,
      Company,
      Tax,
      Branch,
      Unit,
      Category,
      Attribute,
      PriceList,
      PointOfSale,
      CashHub,
      ExpenseCategory,
      Supplier,
      Shareholder,
      AccountingAccount,
      AccountingRule,
      AccountingRuleLine,
      Product,
      Brand,
      ProductVariant,
      PriceListItem,
      Storage,
      StockLevel,
      MultimediaAsset,
      MultimediaLink,
      MultimediaVariant,
      EShopHeroSlide,
      MenuHeroSlide,
      EShopTestimonial,
      Recipe,
      RecipeLine,
      ProductionUnit,
      ProductVariantProductionUnit,
    ]),
    OperationalExpensesModule,
    FiscalModule,
    MultimediaModule,
  ],
  providers: [LocalStorageAdapter, CloudflareR2Adapter],
})
export class MinimalSeedModule {}
