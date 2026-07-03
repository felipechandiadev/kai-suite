import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { FiscalProfile } from './domain/fiscal-profile.entity';
import { FiscalCertificate } from './domain/fiscal-certificate.entity';
import { FiscalCaf } from './domain/fiscal-caf.entity';
import { FiscalCertificationRun } from './domain/fiscal-certification-run.entity';
import { FiscalDteEmission } from './domain/fiscal-dte-emission.entity';
import { PointOfSaleFolioAllocation } from './domain/point-of-sale-folio-allocation.entity';
import { FiscalService } from './application/fiscal.service';
import { FiscalBoletaEmissionService } from './application/fiscal-boleta-emission.service';
import { PosFolioAllocationService } from './application/pos-folio-allocation.service';
import { FiscalCafPackageService } from './application/fiscal-caf-package.service';
import { FiscalFolioLedgerService } from './application/fiscal-folio-ledger.service';
import { FiscalEffectiveOptionsService } from './application/fiscal-effective-options.service';
import { FiscalController } from './presentation/fiscal.controller';
import { FiscalCryptoService } from './infrastructure/fiscal-crypto.service';
import { SiiBoletaAuthService } from './infrastructure/sii-boleta-auth.service';
import { SiiBoletaRestClient } from './infrastructure/sii-boleta-rest.client';
import { FiscalXmlSchemaValidator } from './infrastructure/fiscal-xml-schema.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FiscalProfile,
      FiscalCertificate,
      FiscalCaf,
      FiscalCertificationRun,
      FiscalDteEmission,
      PointOfSaleFolioAllocation,
      PointOfSale,
      Company,
      Transaction,
      TransactionLine,
      Customer,
    ]),
  ],
  controllers: [FiscalController],
  providers: [
    FiscalService,
    FiscalBoletaEmissionService,
    PosFolioAllocationService,
    FiscalCafPackageService,
    FiscalFolioLedgerService,
    FiscalEffectiveOptionsService,
    FiscalCryptoService,
    SiiBoletaAuthService,
    SiiBoletaRestClient,
    FiscalXmlSchemaValidator,
  ],
  exports: [
    FiscalService,
    FiscalBoletaEmissionService,
    PosFolioAllocationService,
    FiscalCafPackageService,
    FiscalFolioLedgerService,
    FiscalEffectiveOptionsService,
  ],
})
export class FiscalModule {}
