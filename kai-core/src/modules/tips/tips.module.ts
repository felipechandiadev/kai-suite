import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesModule } from '@modules/companies/companies.module';
import { TipLedgerEntry } from './domain/tip-ledger-entry.entity';
import { TipsService } from './application/tips.service';
import { TipsController } from './presentation/tips.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TipLedgerEntry]), CompaniesModule],
  controllers: [TipsController],
  providers: [TipsService],
  exports: [TipsService],
})
export class TipsModule {}
