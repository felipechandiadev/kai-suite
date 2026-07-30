import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { TransactionLineOrmEntity } from './infrastructure/orm-mappers/transaction-line.orm-entity';
import { TypeOrmTransactionLinesRepository } from './infrastructure/repositories/typeorm-transaction-lines.repository';
import { TransactionLinesServiceAdapter } from './application/transaction-lines.service.adapter';
import { TransactionLinesController } from './presentation/transaction-lines.controller';
import { GetTransactionLinesQueryHandler } from './application/handlers/queries/get-transaction-lines.handler';
import { GetTransactionLineByIdQueryHandler } from './application/handlers/queries/get-transaction-line-by-id.handler';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionLineOrmEntity]), CqrsModule],
  controllers: [TransactionLinesController],
  providers: [
    TransactionLinesServiceAdapter,
    TypeOrmTransactionLinesRepository,
    {
      provide: 'TransactionLinesRepositoryPort',
      useClass: TypeOrmTransactionLinesRepository,
    },
    GetTransactionLinesQueryHandler,
    GetTransactionLineByIdQueryHandler,
  ],
  exports: [TransactionLinesServiceAdapter, 'TransactionLinesRepositoryPort'],
})
export class TransactionLinesModule {}
