import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { AccountingPeriodSnapshot } from './domain/accounting-period-snapshot.entity';
import { AccountingPeriodSnapshotsController } from './presentation/accounting-period-snapshots.controller';
import { AccountingPeriodSnapshotsServiceAdapter } from './application/accounting-period-snapshots.service.adapter';
import { GetAllAccountingPeriodSnapshotsQueryHandler } from './application/handlers/queries/get-all-accounting-period-snapshots.handler';
import { GetAccountingPeriodSnapshotQueryHandler } from './application/handlers/queries/get-accounting-period-snapshot.handler';
import { TypeOrmAccountingPeriodSnapshotRepository } from './infrastructure/repositories/type-orm-accounting-period-snapshot.repository';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([AccountingPeriodSnapshot]),
  ],
  controllers: [AccountingPeriodSnapshotsController],
  providers: [
    AccountingPeriodSnapshotsServiceAdapter,
    GetAllAccountingPeriodSnapshotsQueryHandler,
    GetAccountingPeriodSnapshotQueryHandler,
    {
      provide: 'AccountingPeriodSnapshotRepositoryPort',
      useClass: TypeOrmAccountingPeriodSnapshotRepository,
    },
  ],
  exports: [AccountingPeriodSnapshotsServiceAdapter],
})
export class AccountingPeriodSnapshotsModule {}
