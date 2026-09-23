import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Recipe } from '@modules/recipes/domain/recipe.entity';
import { RecipeLine } from '@modules/recipes/domain/recipe-line.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { DocumentSequence } from '@modules/transactions/domain/document-sequence.entity';
import { DocumentNumberService } from '@modules/transactions/application/document-number.service';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { User } from '@modules/users/domain/user.entity';
import { UserCompanyMembership } from '@modules/users/domain/user-company-membership.entity';
import { UserCompanyRole } from '@modules/users/domain/user-company-role.entity';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { AppConfigModule } from '../../config/config.module';
import { LiteHealthController } from './presentation/lite-health.controller';
import { LiteSeedController } from './presentation/lite-seed.controller';
import { LiteAuthController } from './presentation/lite-auth.controller';
import { LiteCatalogController } from './presentation/lite-catalog.controller';
import { LiteCatalogAdminController } from './presentation/lite-catalog-admin.controller';
import { LitePosController } from './presentation/lite-pos.controller';
import { LitePurchasingController } from './presentation/lite-purchasing.controller';
import { LiteAdminController } from './presentation/lite-admin.controller';
import { LiteSeedService } from './application/lite-seed.service';
import { LiteStockService } from './application/lite-stock.service';
import { LiteCommerceService } from './application/lite-commerce.service';
import { LiteCatalogAdminService } from './application/lite-catalog-admin.service';
import { LiteOpsService } from './application/lite-ops.service';
import { LiteCompanyResolver } from './application/lite-company.resolver';
import { LiteBootstrapService } from './application/lite-bootstrap.service';

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    UsersModule,
    TypeOrmModule.forFeature([
      Company,
      Branch,
      Person,
      User,
      UserCompanyMembership,
      UserCompanyRole,
      Unit,
      Tax,
      Storage,
      PointOfSale,
      Product,
      ProductVariant,
      StockLevel,
      Customer,
      Supplier,
      CashSession,
      Transaction,
      TransactionLine,
      DocumentSequence,
      Recipe,
      RecipeLine,
      Category,
      Attribute,
    ]),
  ],
  controllers: [
    LiteHealthController,
    LiteSeedController,
    LiteAuthController,
    LiteCatalogController,
    LiteCatalogAdminController,
    LitePosController,
    LitePurchasingController,
    LiteAdminController,
  ],
  providers: [
    LiteBootstrapService,
    LiteSeedService,
    LiteStockService,
    LiteCommerceService,
    LiteCatalogAdminService,
    LiteOpsService,
    LiteCompanyResolver,
    DocumentNumberService,
  ],
  exports: [
    LiteSeedService,
    LiteStockService,
    LiteCommerceService,
    LiteOpsService,
  ],
})
export class LiteModule {}
