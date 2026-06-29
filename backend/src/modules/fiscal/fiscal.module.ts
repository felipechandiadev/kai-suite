import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { FiscalProfile } from './domain/fiscal-profile.entity';
import { FiscalCertificate } from './domain/fiscal-certificate.entity';
import { FiscalCaf } from './domain/fiscal-caf.entity';
import { FiscalCertificationRun } from './domain/fiscal-certification-run.entity';
import { FiscalService } from './application/fiscal.service';
import { FiscalController } from './presentation/fiscal.controller';
import { FiscalCryptoService } from './infrastructure/fiscal-crypto.service';
import { SiiBoletaAuthService } from './infrastructure/sii-boleta-auth.service';
import { SiiBoletaRestClient } from './infrastructure/sii-boleta-rest.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FiscalProfile,
      FiscalCertificate,
      FiscalCaf,
      FiscalCertificationRun,
      Company,
    ]),
  ],
  controllers: [FiscalController],
  providers: [
    FiscalService,
    FiscalCryptoService,
    SiiBoletaAuthService,
    SiiBoletaRestClient,
  ],
  exports: [FiscalService],
})
export class FiscalModule {}
