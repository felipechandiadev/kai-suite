import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Company } from './domain/company.entity';
import { CompanyPaymentMethodEntity } from './domain/company-payment-method.entity';
import { CompanyVoucherKindEntity } from './domain/company-voucher-kind.entity';
import { PosPaymentMethodEntity } from './domain/pos-payment-method.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { CompaniesService } from './application/companies.service';
import { CompanyPaymentCatalogService } from './application/company-payment-catalog.service';
import { CompaniesController } from './presentation/companies.controller';
import { ProductModeModule } from '@shared/product-mode/product-mode.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      CompanyPaymentMethodEntity,
      CompanyVoucherKindEntity,
      PosPaymentMethodEntity,
      PointOfSale,
      Branch,
      Storage,
      PriceList,
      Transaction,
    ]),
    CqrsModule,
    ProductModeModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompanyPaymentCatalogService],
  exports: [CompaniesService, CompanyPaymentCatalogService],
})
export class CompaniesModule {}
